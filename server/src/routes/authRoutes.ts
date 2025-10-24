import { FastifyInstance } from 'fastify';
import { register, login, getProfile, updateProfile } from '../controllers/authController.ts';
import { authenticateToken } from '../middleware/auth.ts';

export default async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
        },
      },
    },
    handler: register,
  });

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: login,
  });

  // Logout route
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('auth_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    reply.send({ message: 'Logged out successfully' });
  });

  // Protected routes
  fastify.get('/profile', {
    preHandler: authenticateToken,
    handler: getProfile,
  });

  fastify.put('/profile', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: updateProfile,
  });
}
