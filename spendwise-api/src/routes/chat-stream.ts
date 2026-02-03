import { Router } from 'express';
import cors from 'cors';
import express from 'express';
import { getUserFromToken } from '../context/auth';
import { prisma } from '../lib/prisma';
import { checkRateLimit } from '../services/financialPlanning/rate-limiter';
import { buildFinancialSummary } from '../services/financialPlanning/financial-summarizer';
import { streamChatResponse } from '../services/financialPlanning/claude-client';

export const chatStreamRouter = Router();

chatStreamRouter.use(
  '/stream',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

chatStreamRouter.post('/stream', express.json(), async (req, res) => {
  try {
    // 1. Extract Authorization header, validate JWT token
    const token = req.headers.authorization;
    const user = await getUserFromToken(token);

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // 2. Extract sessionId and content from request body
    const { sessionId, content } = req.body;

    if (!sessionId || !content) {
      res.status(400).json({ error: 'sessionId and content are required' });
      return;
    }

    // 3. Check rate limit
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: `Daily message limit reached. Resets at ${rateLimit.resetAt.toISOString()}`,
        resetAt: rateLimit.resetAt.toISOString(),
      });
      return;
    }

    // 4. Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    // 5. Build financial summary (user message already saved by sendChatMessage mutation)
    const financialSummary = await buildFinancialSummary(prisma as any, user.id);

    // 6. Load conversation history (last 20 messages, excluding current user message)
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Use all messages except the last one (current user message) as history
    const conversationHistory = messages.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 9. Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 10. Stream via streamChatResponse generator
    let fullResponse = '';

    try {
      for await (const chunk of streamChatResponse(
        conversationHistory,
        financialSummary,
        content
      )) {
        // 11. For each chunk: write SSE data events
        if (chunk.type === 'content_block_delta' && chunk.content) {
          fullResponse += chunk.content;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }

      // 12. On done: append disclaimer, save complete message, close
      const disclaimer = '\n\n_Not professional financial advice. Consult a licensed advisor for personalized guidance._';
      const completeResponse = fullResponse + disclaimer;

      // Send disclaimer as final content chunk
      res.write(
        `data: ${JSON.stringify({
          type: 'content_block_delta',
          content: disclaimer,
        })}\n\n`
      );

      // Send message_stop
      res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);

      // Save assistant message
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: completeResponse,
        },
      });

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      res.end();
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: 'Failed to generate response',
        })}\n\n`
      );
      res.end();
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);

    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      // If streaming started, send error event and close
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: 'An error occurred',
        })}\n\n`
      );
      res.end();
    }
  }
});

// 13. Handle client disconnect
chatStreamRouter.use((req, res, next) => {
  res.on('close', () => {
    console.log('Client disconnected from SSE stream');
  });
  next();
});
