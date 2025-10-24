import {tool} from "ai"
import {google} from "googleapis"
import {z} from "zod";
import { oauth2Client } from "../index.ts";

// Helper function to decode base64 data
function decodeBase64(data: string) {
    if (!data) return '';
    try {
        return Buffer.from(data, 'base64').toString('utf-8');
    } catch (error) {
        console.error('Error decoding base64:', error);
        return '';
    }
}

const listEmails = tool({
    name: "listEmails",
    description: "A tool for listing emails from the user's inbox. Returns email id, threadId, sender (from), recipient (to), subject, body, snippet, and date",
    inputSchema: z.object({
        maxResults: z.number().optional().default(5).describe("The maximum number of emails to return. Default is 5."),
        startDate: z.string().optional().describe("The start date of the emails to return in YYYY/MM/DD format. Default is today."),
        endDate: z.string().optional().describe("The end date of the emails to return in YYYY/MM/DD format. Default is today."),
        query: z.string().optional().describe("The query to search for emails. Default is empty."),
    }),
    execute: async (input) => {
        let { maxResults, startDate, endDate, query } = input;
        
        console.log("startDate:", startDate, "endDate:", endDate, "query:", query);

        if (startDate || endDate) {
            //in start date minus 1 day and in end date add 1 day
            const startDateMinus1Day = new Date(startDate || '');
            startDateMinus1Day.setDate(startDateMinus1Day.getDate() - 0);
            const endDatePlus1Day = new Date(endDate || '');
            endDatePlus1Day.setDate(endDatePlus1Day.getDate() + 2);
            startDate = startDateMinus1Day.toISOString().split('T')[0];
            endDate = endDatePlus1Day.toISOString().split('T')[0];
        }
        let emails = [];
        try {
            console.log("Listing emails for the user with maxResults:", maxResults, "startDate:", startDate, "endDate:", endDate, "query:", query);
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            const response = await gmail.users.messages.list({
                userId: "me",
                q: query ? query :  startDate && endDate ? `after:${startDate} before:${endDate}` : '',
                maxResults: maxResults,
            });
            console.log("Response from listEmailsIds:", response.data.messages);

            
            if (!response.data.messages || response.data.messages.length === 0) {
                return {
                    success: false,
                    message: "No emails found"
                };
            }

            for (const message of response.data.messages) {
                if (!message.id) continue; // Skip if message.id is null/undefined

                const emailResponse = await gmail.users.messages.get({
                    userId: "me",
                    format: "full",
                    id: message.id,
                });

                const email = emailResponse.data;

                // Extract headers
                const headers = email.payload?.headers;
                const from = headers?.find((h: any) => h.name === 'From')?.value || '';
                const to = headers?.find((h: any) => h.name === 'To')?.value || '';
                const subject = headers?.find((h: any) => h.name === 'Subject')?.value || '';

                // Extract body content
                let body = '';
                if (email.payload?.body?.data) {
                    body = decodeBase64(email.payload.body.data);
                } else if (email.payload?.parts) {
                    // Handle multipart messages
                    for (const part of email.payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            body = decodeBase64(part.body.data);
                            break;
                        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
                            // Fallback to HTML if no plain text found
                            body = decodeBase64(part.body.data);
                        }
                    }
                }

                emails.push({
                    id: email.id || '',
                    threadId: email.threadId || '',
                    from: from,
                    to: to,
                    subject: subject,
                    body: body,
                    snippet: email.snippet || '',
                    date: new Date(parseInt(email.internalDate || '0')).toISOString(),
                });
            }

            return emails;
        } catch (error) {
            console.error(error);
            throw new Error("Failed to list emails");
        }
    }
});

const sendEmail = tool({
    name: "sendEmail",
    description: "A tool for sending an email to the user's inbox",
    inputSchema: z.object({
        to: z.string().describe("The email address of the recipient."),
        subject: z.string().describe("The subject of the email."),
        body: z.string().describe("The body of the email."),
    }),
    execute: async (input) => {
        const { to, subject, body } = input;
        try {
            console.log("Sending email to:", to);
            
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            
            // Create the email message
            const message = [
                `To: ${to}`,
                `Subject: ${subject}`,
                '',
                body
            ].join('\n');
            
            // Encode the message in base64
            const encodedMessage = Buffer.from(message).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            
            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });
            
            return {
                success: true,
                messageId: response.data.id,
                message: 'Email sent successfully'
            };
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error("Failed to send email");
        }
    }
});

export { listEmails, sendEmail };