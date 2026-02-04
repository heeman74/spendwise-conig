import { Router } from 'express';
import multer from 'multer';
import cors from 'cors';
import { getUserFromToken } from '../context/auth';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { processStatementUpload } from '../lib/parsers';
import { uploadLimiter } from '../middleware/rateLimiter';
import { corsOptions } from '../config/cors';

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
  cors(corsOptions)
);

statementUploadRouter.post(
  '/api/upload-statement',
  uploadLimiter,
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

      // MIME content validation
      const buffer = req.file.buffer;
      const ext = req.file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

      if (ext === '.pdf') {
        // Check PDF magic bytes: %PDF
        if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
          res.status(400).json({ error: 'File content does not match PDF format' });
          return;
        }
      } else if (ext === '.csv') {
        // Verify first 512 bytes are valid UTF-8 text (no binary content)
        const sample = buffer.subarray(0, Math.min(512, buffer.length));
        const text = sample.toString('utf8');
        // Check for null bytes or other binary indicators
        if (/\0/.test(text)) {
          res.status(400).json({ error: 'File content does not match CSV format' });
          return;
        }
      } else if (ext === '.ofx' || ext === '.qfx') {
        // Verify starts with OFXHEADER, <?xml, or <OFX
        const header = buffer.toString('utf8', 0, Math.min(100, buffer.length)).trim();
        if (!header.startsWith('OFXHEADER') && !header.startsWith('<?xml') && !header.startsWith('<OFX')) {
          res.status(400).json({ error: 'File content does not match OFX/QFX format' });
          return;
        }
      }
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
