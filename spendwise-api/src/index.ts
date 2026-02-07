// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import depthLimit from 'graphql-depth-limit';
import { typeDefs, resolvers } from './schema';
import { createContext, Context } from './context';
import { plaidWebhookRouter } from './routes/plaid-webhooks';
import { statementUploadRouter } from './routes/statement-upload';
import { chatStreamRouter } from './routes/chat-stream';
import { setupNetWorthSnapshotQueue } from './lib/jobs/snapshotNetWorth';
import { generalLimiter } from './middleware/rateLimiter';
import { corsOptions } from './config/cors';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Trust proxy when behind a reverse proxy (Railway, Render, etc.)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());
  app.use(generalLimiter);

  // Register webhook routes BEFORE GraphQL middleware
  // Webhooks use express.raw() for signature verification, not express.json()
  app.use(plaidWebhookRouter);

  // Register statement upload route (REST endpoint with multer)
  app.use(statementUploadRouter);

  // Register chat streaming route (SSE endpoint for AI responses)
  app.use('/api/chat', chatStreamRouter);

  const safeErrorCodes = new Set([
    'UNAUTHENTICATED',
    'BAD_USER_INPUT',
    'FORBIDDEN',
    'GRAPHQL_VALIDATION_FAILED',
    'GRAPHQL_PARSE_FAILED',
    'PERSISTED_QUERY_NOT_FOUND',
    'PERSISTED_QUERY_NOT_SUPPORTED',
  ]);

  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    validationRules: [depthLimit(7)],
    formatError: (formattedError, error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('GraphQL Error:', error);
      }

      // In production, only expose messages for known safe error codes
      if (process.env.NODE_ENV === 'production') {
        const code = formattedError.extensions?.code as string;
        if (!safeErrorCodes.has(code)) {
          return {
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        }
      }

      return formattedError;
    },
    introspection: process.env.NODE_ENV !== 'production',
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(corsOptions),
    express.json(),
    expressMiddleware(server, {
      context: createContext,
    })
  );

  // Health check endpoint
  app.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`
    Apollo Server ready at http://localhost:${PORT}/graphql
    Health check at http://localhost:${PORT}/health
  `);

  // Initialize BullMQ net worth snapshot queue
  try {
    await setupNetWorthSnapshotQueue();
  } catch (error) {
    console.error('[NetWorth] Failed to initialize snapshot queue:', error);
    console.warn('[NetWorth] Server will continue without snapshot scheduling');
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
