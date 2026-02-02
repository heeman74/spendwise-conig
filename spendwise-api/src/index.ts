// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs, resolvers } from './schema';
import { createContext, Context } from './context';
import { plaidWebhookRouter } from './routes/plaid-webhooks';
import { statementUploadRouter } from './routes/statement-upload';
import { setupNetWorthSnapshotQueue } from './lib/jobs/snapshotNetWorth';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Register webhook routes BEFORE GraphQL middleware
  // Webhooks use express.raw() for signature verification, not express.json()
  app.use(plaidWebhookRouter);

  // Register statement upload route (REST endpoint with multer)
  app.use(statementUploadRouter);

  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      console.error('GraphQL Error:', error);

      // Don't expose internal errors in production
      if (
        process.env.NODE_ENV === 'production' &&
        formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR'
      ) {
        return {
          ...formattedError,
          message: 'Internal server error',
        };
      }

      return formattedError;
    },
    introspection: true,
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    }),
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
