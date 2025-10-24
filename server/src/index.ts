import Fastify from 'fastify';
import { config } from 'dotenv';
import { aiRoutes } from './routes/aiRoutes.ts';
import authRoutes from './routes/authRoutes.ts';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import googleAuthRoute from './routes/google-auth-route.ts';
import { google } from 'googleapis';
import { db } from './db/index.ts';
import { userTokens } from './db/schema.ts';
import { desc } from 'drizzle-orm';

config();

const fastify = Fastify({
  logger: true,
});


export const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.SECRET_ID,
  process.env.REDIRECT_URI
);

export const getUserToken = async () => {
  const userToken = await db.select().from(userTokens).orderBy(desc(userTokens.expiresAt)).limit(1);
  if (userToken.length === 0) {
    return null;
  }
  return userToken[0];
}

const userToken = await getUserToken();
if (userToken) {
  console.log(`Getting token for refresh token: ${userToken.refreshToken}`);
  oauth2Client.setCredentials({
      refresh_token: userToken.refreshToken || '',
  });
  console.log(`Token obtained successfully`);
}


fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

fastify.get('/hello', async (request, reply) => {
  return { hello: 'world' };
});

fastify.register(cors, {
  origin: true, // Allow any origin in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'your-cookie-secret-key',
});

fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Register routes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(aiRoutes);
fastify.register(googleAuthRoute, { prefix: '/google' });

const PORT = Number(process.env.PORT);

const start = async () => {
  try {
    await fastify.listen({ port: PORT });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
