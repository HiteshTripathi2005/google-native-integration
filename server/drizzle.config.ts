import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts', // path to your Drizzle schema file
  out: './drizzle',             // output folder for migrations
  dbCredentials: {
    url: process.env.DATABASE_URL!, // loaded from .env
  },
});
