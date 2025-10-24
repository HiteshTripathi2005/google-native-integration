import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ModelMessage, smoothStream, stepCountIs, streamText } from 'ai';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getSystemPrompt } from '../utils/systemprompt.ts';
import { db } from '../db/index.ts';
import { messages, userTokens } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import timeTool from '../tools/time-tool.ts';
import { mcpToolsFromSmithery, type McpClientHandle } from '../utils/mcp.ts';
import { listCalendarEvents, listAllCalendars, createCalendar, createCalendarEvent, deleteCalendarEvent, deleteCalendar } from '../tools/calendar-tools.ts';
import { listEmails, sendEmail } from '../tools/gmail-tool.ts';
import { AuthenticatedRequest } from '../middleware/auth.js';

interface StreamTextRequestBody {
  prompt: string;
  conversationId?: string;
}

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});
const model = openrouter('google/gemini-2.0-flash-001',{
    reasoning: {
        enabled: true,
        effort: 'high',
    },
    usage: {
        include: true,
    }
});

export const getMessagesController = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const conversationId = 'default';

    const result = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.userId, userId)
      ))
      .orderBy(messages.timestamp);

    return reply.send(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
};

export const clearMessagesController = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const conversationId = 'default';

    await db.delete(messages).where(and(
      eq(messages.conversationId, conversationId),
      eq(messages.userId, userId)
    ));

    return reply.send({ success: true });
  } catch (error) {
    console.error('Error clearing messages:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
};

export const streamTextController = async (
  request: AuthenticatedRequest & { Body: StreamTextRequestBody },
  reply: FastifyReply
) => {
  const body = request.body as StreamTextRequestBody;
  const { prompt, conversationId = 'default' } = body;

  if (!prompt) {
    return reply.code(400).send({ error: 'Prompt is required' });
  }

  let mcpClient: McpClientHandle | null = null;

    // Collect message parts during streaming
    const messageParts: Array<{
      type: 'text' | 'tool_call' | 'tool_result';
      content?: string;
      toolCall?: { id: string; name: string; arguments: any };
      toolResult?: { id: string; result: string };
    }> = [];

    // Track text accumulation
    let currentTextBuffer = '';
    let hasPendingText = false;

  try {
    const userId = request.user.userId;

    // Save user message to database
    await db.insert(messages).values({
      role: 'user',
      content: prompt,
      conversationId,
      userId,
    });

    // Load MCP tools
    let mcpTools: Record<string, any> = {};
    try {
      mcpClient = await mcpToolsFromSmithery();
      mcpTools = mcpClient.tools;
      console.log('🛠️ Loaded MCP tools:', Object.keys(mcpTools));
    } catch (mcpError) {
      console.warn('⚠️ Failed to load MCP tools, continuing with local tools only:', mcpError instanceof Error ? mcpError.message : mcpError);
    }

    let allTools;

    //remove calendar and email tools if no entry found in userTokens table
    const userToken = await db.select().from(userTokens).where(eq(userTokens.userId, userId)).limit(1);
    if (userToken.length === 0) {
      allTools = {
        ...mcpTools,
        timeTool,
      };
    } else {
      allTools = {
        ...mcpTools,
        timeTool,
        createCalendar,
        listCalendarEvents,
        listAllCalendars,
        createCalendarEvent,
        deleteCalendarEvent,
        deleteCalendar,
        listEmails,
        sendEmail,
      };
    }


    console.log('🛠️ Total tools available:', Object.keys(allTools || {}));

    const result = await streamText({
      model: model,
      messages: await buildMessages(prompt, conversationId, userId) as ModelMessage[],
      experimental_transform: smoothStream({
        delayInMs: 50,
        chunking: "word"
      }),
      tools: allTools,
      stopWhen: stepCountIs(10),
    });

    // Create a custom transform to capture tool events while streaming
    const { readable, writable } = new TransformStream();

    // Process the stream and capture tool events
    const streamProcessingPromise = (async () => {
      try {
        const reader = result.toUIMessageStreamResponse().body?.getReader();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  await writer.write(encoder.encode(line + '\n'));
                  continue;
                }

                try {
                  const event = JSON.parse(data);

                  // Capture tool and text events
                  if (event.type === 'text-delta') {
                    currentTextBuffer += event.delta;
                    hasPendingText = true;
                  } else if (event.type === 'tool-input-available') {
                    // Flush any pending text before the tool call
                    if (hasPendingText && currentTextBuffer.trim()) {
                      messageParts.push({
                        type: 'text',
                        content: currentTextBuffer.trim(),
                      });
                      currentTextBuffer = '';
                      hasPendingText = false;
                    }

                    messageParts.push({
                      type: 'tool_call',
                      toolCall: {
                        id: event.toolCallId,
                        name: event.toolName,
                        arguments: event.input,
                      },
                    });
                  } else if (event.type === 'tool-output-available') {
                    messageParts.push({
                      type: 'tool_result',
                      toolResult: {
                        id: event.toolCallId,
                        result: event.output,
                      },
                    });
                  }
                } catch (e) {
                  // Ignore parse errors for non-JSON data
                }

                // Forward the event to the UI
                await writer.write(encoder.encode(line + '\n'));
              } else {
                // Forward non-data lines
                await writer.write(encoder.encode(line + '\n'));
              }
            }
          }

          await writer.close();
        }
      } catch (error) {
        console.warn('Error processing stream:', error);
      }
    })();

    // Use our transformed stream for the UI
    const stream = new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Experimental-Stream-Data': 'true',
      },
    });

    // Asynchronously save the AI response and cleanup MCP client after streaming completes
    (async () => {
      try {
        // Wait for stream processing to complete so we have all messageParts
        await streamProcessingPromise;

        const fullText = await result.text;

        // Use the messageParts collected during streaming
        let finalMessageParts = [...messageParts];

        // Flush any remaining text that was accumulated during streaming
        if (hasPendingText && currentTextBuffer.trim()) {
          finalMessageParts.push({
            type: 'text',
            content: currentTextBuffer.trim(),
          });
        }

        // If we still don't have the complete text, add it
        // This handles cases where text wasn't fully captured during streaming
        if (finalMessageParts.length === 0 && fullText.trim()) {
          finalMessageParts = [{ type: 'text', content: fullText.trim() }];
        }

        await db.insert(messages).values({
          role: 'assistant',
          content: fullText.trim() || null, // Keep for backwards compatibility
          conversationId,
          userId,
          messageParts: finalMessageParts.length > 0 ? finalMessageParts : undefined,
        });
      } catch (error) {
        console.error('Error saving AI response:', error);
      } finally {
        // Cleanup MCP client
        if (mcpClient) {
          try {
            await mcpClient.close();
            console.log('🧹 MCP client closed successfully');
          } catch (closeError) {
            console.warn('⚠️ Error closing MCP client:', closeError instanceof Error ? closeError.message : closeError);
          }
        }
      }
    })();

    return stream;
  } catch (error) {
    console.error('Error in streamText:', error);

    // Cleanup MCP client on error
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        console.warn('⚠️ Error closing MCP client on error:', closeError instanceof Error ? closeError.message : closeError);
      }
    }

    return reply.code(500).send({ error: 'Internal server error' });
  }
};

const buildMessages = async (prompt: string, conversationId: string, userId: number) => {
  // Get most recent 11 messages (newest first) to ensure we have 10 previous messages (excluding current user message)
  const history = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.conversationId, conversationId),
      eq(messages.userId, userId)
    ))
    .orderBy(desc(messages.timestamp))
    .limit(11);

  // Exclude the current user message (most recent message) and take the next 5 most recent messages
  const pastConversation = history.slice(1, 11).reverse(); // Reverse to chronological order

  let pastConversationContent = '';
  if (pastConversation.length > 0) {
    pastConversationContent = '<past-conversation>\n';
    for (const msg of pastConversation) {
      pastConversationContent += `${msg.role}: ${msg.content}\n`;
    }
    pastConversationContent += '</past-conversation>\n\n';
  }

  const messageArray: ModelMessage[] = [
    { role: 'system' as const, content: getSystemPrompt() },
  ];
  const currentUserMessage = `current user message: ${prompt}`;

  // Add current user message
  messageArray.push({ role: 'user' as const, content: pastConversationContent + currentUserMessage });

  return messageArray;
};
