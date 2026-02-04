import cors from 'cors';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

export const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};
