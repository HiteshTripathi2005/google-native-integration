import { FastifyReply, FastifyRequest } from 'fastify';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream, promises as fsPromises } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.ts';
import { documents } from '../db/schema.ts';
import { eq, sql, asc } from 'drizzle-orm';

// Import Hugging Face transformers
import { pipeline as hfPipeline, env } from '@huggingface/transformers';

// Configure transformers to use local models and suppress warnings
env.allowLocalModels = true;
env.allowRemoteModels = false;

// Global variable to store the embedding model
let embeddingModel: any = null;

// Initialize the embedding model
async function initEmbeddingModel() {
  if (!embeddingModel) {
    try {
      console.log('🤖 Initializing sentence-transformers model...');
      // Use a lightweight sentence-transformers model
      embeddingModel = await hfPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Embedding model initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize embedding model:', error);
      throw error;
    }
  }
  return embeddingModel;
}

// Function to generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  try {
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

// Function to extract text from different file types optimized for embeddings
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'text/csv' || mimeType === 'application/json') {
      const content = await fsPromises.readFile(filePath, 'utf-8');

      // Process different text formats for better embedding quality
      if (mimeType === 'application/json') {
        try {
          const jsonData = JSON.parse(content);
          // Convert JSON to readable text format suitable for embeddings
          return convertJsonToText(jsonData);
        } catch (e) {
          console.warn('Failed to parse JSON, using raw content:', e);
          return content; // Fallback to raw content
        }
      } else if (mimeType === 'text/csv') {
        // Enhanced CSV processing for embeddings
        return processCsvForEmbeddings(content);
      } else if (mimeType === 'text/markdown') {
        // Clean markdown for better embeddings
        return cleanMarkdownForEmbeddings(content);
      }

      // Plain text - clean and normalize
      return normalizeTextForEmbeddings(content);
    } else {
      // This should not happen due to earlier validation, but handle gracefully
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Helper function to convert JSON to readable text for embeddings
function convertJsonToText(jsonData: any): string {
  if (typeof jsonData === 'string') return jsonData;
  if (typeof jsonData === 'number' || typeof jsonData === 'boolean') return String(jsonData);

  if (Array.isArray(jsonData)) {
    return jsonData.map((item, index) => `Item ${index + 1}: ${convertJsonToText(item)}`).join('\n');
  }

  if (typeof jsonData === 'object' && jsonData !== null) {
    const entries = Object.entries(jsonData);
    return entries.map(([key, value]) => `${key}: ${convertJsonToText(value)}`).join('\n');
  }

  return String(jsonData);
}

// Helper function to process CSV for embeddings
function processCsvForEmbeddings(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';

  // Try to detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';';
  if (firstLine.split('\t').length > firstLine.split(delimiter).length) delimiter = '\t';

  const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));

  if (rows.length < 2) return content; // Not enough data for structured processing

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Convert to readable text format
  return dataRows.map((row, index) => {
    const record = headers.map((header, i) => `${header}: ${row[i] || ''}`).join(', ');
    return `Record ${index + 1}: ${record}`;
  }).join('\n');
}

// Helper function to clean markdown for embeddings
function cleanMarkdownForEmbeddings(content: string): string {
  // Remove markdown formatting that might confuse embeddings
  return content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/^\s*>+\s*/gm, '') // Remove blockquotes
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
}

// Helper function to normalize text for embeddings
function normalizeTextForEmbeddings(content: string): string {
  return content
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Convert old Mac line endings
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/ {2,}/g, ' ') // Normalize multiple spaces
    .trim();
}

// Function to chunk text for better embeddings
function chunkTextForEmbeddings(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence would exceed max chunk size, save current chunk
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 6)); // Rough word count for overlap
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

interface UploadRequest extends AuthenticatedRequest {
  Body: {
    file: any; // Fastify multipart file
  };
}

export const uploadDocumentController = async (
  request: UploadRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ error: 'No file provided' });
    }

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'text/markdown',
      'text/csv',
      'application/json'
    ];

    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return reply.code(400).send({
        error: `Unsupported file type: ${file.mimetype}. Please upload files with these extensions: .txt, .md, .csv, .json`,
        supportedTypes
      });
    }

    // Special handling for PDF files
    if (file.mimetype === 'application/pdf') {
      return reply.code(400).send({
        error: 'PDF files are not currently supported. Please extract the text content and upload as a .txt, .md, .csv, or .json file instead.',
        supportedTypes
      });
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.file.readableLength > maxSize) {
      return reply.code(400).send({ error: 'File too large. Maximum size is 10MB.' });
    }

    // Save file temporarily
    const tempDir = tmpdir();
    const tempFilePath = join(tempDir, `upload_${Date.now()}_${file.filename}`);
    const writeStream = createWriteStream(tempFilePath);

    await pipeline(file.file, writeStream);

    try {
      // Extract text from file
      const content = await extractTextFromFile(tempFilePath, file.mimetype);

      // Content should be valid at this point due to earlier validation

      // Check if we have actual content to process
      if (!content.trim()) {
        return reply.code(400).send({
          error: 'The file appears to be empty or contains no extractable text content.'
        });
      }

      // Chunk the content for better embeddings
      const chunks = chunkTextForEmbeddings(content);

      // Generate embeddings for each chunk and save to database
      const documentIds: number[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);

        // Create a chunk-specific filename
        const chunkFilename = chunks.length > 1 ? `${file.filename} (part ${i + 1}/${chunks.length})` : file.filename;

        const result = await db.insert(documents).values({
          userId,
          filename: chunkFilename,
          content: chunk,
          embedding,
          fileType: file.mimetype,
          fileSize: file.file.readableLength,
        }).returning({ id: documents.id });

        documentIds.push(result[0].id);
      }

      console.log(`📄 Document uploaded and processed: ${file.filename} (${chunks.length} chunks, IDs: ${documentIds.join(', ')})`);

      return reply.send({
        success: true,
        documentIds,
        filename: file.filename,
        chunks: chunks.length,
        message: `File uploaded and processed successfully (${chunks.length} chunks)`
      });

    } finally {
      // Clean up temporary file
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }
    }

  } catch (error) {
    console.error('Error uploading document:', error);
    return reply.code(500).send({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Function to perform semantic search
export async function semanticSearch(query: string, userId: number, limit: number = 5): Promise<any[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Perform vector similarity search using cosine distance
    // <=> operator returns cosine distance, we want smallest distance (most similar) first
    const results = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(sql`${documents.embedding} <=> '[${queryEmbedding.join(',')}]'::vector`)
      .limit(limit);

    return results;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return [];
  }
}
