import { Router } from 'express';
import multer from 'multer';
import cors from 'cors';
import { getUserFromToken } from '../context/auth';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { processStatementUpload } from '../lib/parsers';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.csv', '.ofx', '.qfx', '.pdf'];
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (ext && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

export const statementUploadRouter = Router();

statementUploadRouter.use(
  '/api/upload-statement',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

statementUploadRouter.post(
  '/api/upload-statement',
  upload.single('file'),
  async (req, res) => {
    try {
      // Authenticate
      const token = req.headers.authorization;
      const user = await getUserFromToken(token);

      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const ext = req.file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
      const formatMap: Record<string, string> = {
        '.csv': 'CSV',
        '.ofx': 'OFX',
        '.qfx': 'QFX',
        '.pdf': 'PDF',
      };
      const fileFormat = formatMap[ext || ''];

      if (!fileFormat) {
        res.status(400).json({ error: 'Unsupported file format' });
        return;
      }

      // Create StatementImport record
      const statementImport = await prisma.statementImport.create({
        data: {
          userId: user.id,
          fileName: req.file.originalname,
          fileFormat: fileFormat as any,
          fileSize: req.file.size,
          status: 'PENDING',
        },
      });

      // Process asynchronously (don't await)
      processStatementUpload(
        prisma,
        redis,
        user.id,
        statementImport.id,
        req.file.buffer,
        req.file.originalname,
        fileFormat
      ).catch((err) => {
        console.error('Statement processing failed:', err);
      });

      res.json({ importId: statementImport.id });
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.message?.includes('Unsupported file type')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload statement' });
      }
    }
  }
);
