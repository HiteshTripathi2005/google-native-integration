import { FastifyInstance } from 'fastify';
import { streamTextController, getMessagesController, clearMessagesController } from '../controllers/aiController.js';
import { uploadDocumentController } from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/auth.js';

export const aiRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/ai/streamtext', {
    preHandler: authenticateToken,
    handler: streamTextController
  });
  fastify.post('/ai/upload', {
    preHandler: authenticateToken,
    handler: uploadDocumentController
  });
  fastify.get('/ai/messages', {
    preHandler: authenticateToken,
    handler: getMessagesController
  });
  fastify.delete('/ai/messages', {
    preHandler: authenticateToken,
    handler: clearMessagesController
  });
};
