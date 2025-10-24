import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, userTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

export const register = async (request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) => {
  console.log('Registering user...');
  try {
    const { email, password, name } = request.body;

    // Validate input
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return reply.code(409).send({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    });

    // Generate JWT token
    const token = (jwt.sign as any)(
      { userId: newUser[0].id, email: newUser[0].email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set JWT token in HTTP-only cookie
    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    reply.code(201).send({
      message: 'User created successfully',
      user: newUser[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
};

export const login = async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
  try {
    const { email, password } = request.body;
    
    // Validate input
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = userResult[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = (jwt.sign as any)(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set JWT token in HTTP-only cookie
    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    reply.send({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
};

export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // User info is attached by the auth middleware
    const userId = (request as any).user.userId;

    const userResult = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);

    //fetch user google profile
    const googleProfile = await db.select().from(userTokens).where(eq(userTokens.userId, userId)).limit(1);
    console.log('googleProfile', googleProfile);
    if (userResult.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    reply.send({ user: userResult[0], googleProfile: googleProfile[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
};

interface UpdateProfileRequest {
  name?: string;
}

export const updateProfile = async (request: FastifyRequest<{ Body: UpdateProfileRequest }>, reply: FastifyReply) => {
  try {
    const userId = (request as any).user.userId;
    const { name } = request.body;

    // Validate input
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return reply.code(400).send({ error: 'Name must be a non-empty string' });
    }

    // Update user profile
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (updatedUser.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    reply.send({ user: updatedUser[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
};
