import { pgTable, serial, text, vector, timestamp, varchar, jsonb, integer, foreignKey } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  password: text('password').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 768 }), // Updated to 768 for sentence-transformers models
  fileType: varchar('file_type', { length: 50 }),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text('content'), // For backwards compatibility, may be null if using messageParts
  conversationId: varchar('conversation_id', { length: 100 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  messageParts: jsonb('message_parts').$type<Array<{
    type: 'text' | 'tool_call' | 'tool_result';
    content?: string;
    toolCall?: {
      id: string;
      name: string;
      arguments: any;
    };
    toolResult?: {
      id: string;
      result: string;
    };
  }>>(), // Store complete AI response as structured parts
})

export const userTokens = pgTable('user_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  provider: varchar('provider', { length: 50 }).default('google'), // 'google', 'github', etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
