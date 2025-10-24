import { FastifyRequest, FastifyReply } from 'fastify';
import jwt, { Secret } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: number;
    email: string;
  };
}

export const authenticateToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Try to get token from Authorization header first
    let token = request.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    // If no token in header, try to get from cookie
    if (!token) {
      token = request.cookies?.auth_token;
    }

    if (!token) {
      return reply.code(401).send({ error: 'Access token required' });
    }

    const decoded = (jwt.verify as any)(token, JWT_SECRET) as { userId: number; email: string };

    // Attach user info to request
    (request as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.code(403).send({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return reply.code(403).send({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return reply.code(500).send({ error: 'Authentication error' });
  }
};
