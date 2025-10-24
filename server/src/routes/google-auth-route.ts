import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { google } from "googleapis";
import { config } from "dotenv";
import { userTokens } from "../db/schema.ts";
import { db } from "../db/index.ts";
import { eq } from "drizzle-orm";

config();

export const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.SECRET_ID,
    process.env.REDIRECT_URI
);

export default async function googleAuthRoute(fastify: FastifyInstance) {
    fastify.get('/google-auth', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { userId } = request.query as { userId: string };
            console.log('Generating auth url...', process.env.CLIENT_ID, process.env.SECRET_ID, process.env.REDIRECT_URI);
            console.log('userId', userId);
            const url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar',"https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/youtube"],
                prompt: 'consent',
                state: userId
            });
            return reply.redirect(url);
        } catch (error) {
            return reply.status(500).send({ error: 'Failed to generate auth url' });
        }
    });
    fastify.get('/redirect', async (request: FastifyRequest, reply: FastifyReply) => {
        console.log('Redirecting...', request.query);
        const { code } = request.query as { code: string };
        try {
            const response = await oauth2Client.getToken(code);
            
            console.log(`result`);
            console.log(`Response: ${JSON.stringify(response)}`);
            console.log(`result`);

            const { state } = request.query as { state: string };
            console.log('state from redirect', state);
            try {

                //delete existing user token
                await db.delete(userTokens).where(eq(userTokens.userId, parseInt(state)));
                console.log('existing user token deleted');
                await db.insert(userTokens).values({
                    accessToken: response.tokens.access_token || '',
                    refreshToken: response.tokens.refresh_token || '',
                    expiresAt: new Date(response.tokens.expiry_date || 0),
                    scope: response.tokens.scope || '',
                    provider: 'google',
                    userId: parseInt(state),
                });
            } catch (error) {
                console.error('Error inserting user token:', error);
                return reply.status(500).send({ error: 'Failed to insert user token' });
            }

            oauth2Client.setCredentials(response.tokens);
            return reply.status(200).send({ message: 'successfully linked google account and you can close this window now' });
        } catch (error) {
            console.error('Error getting token:', error);
            return reply.status(500).send({ error: 'Failed to get token and you can close this window now' });
        }
    });
}