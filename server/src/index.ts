import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import { authRouter } from './routes/auth.js';
import { appsRouter } from './routes/apps.js';

const app = express();
app.set('trust proxy', 1); // CRITICAL FOR VERCEL SECURITY: Tells Express to trust HTTPS headers
const port = Number(process.env.PORT) || 8787;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: '15mb' })); // generous limit: projects can include image assets as data URLs

app.use(
  session({
    name: 'concept.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// Base health check endpoints
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// Express route handling for local and production Vercel paths
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

app.use('/apps', appsRouter);
app.use('/api/apps', appsRouter);

app.listen(port, () => {
  console.log(`Concept backend listening on http://localhost:${port}`);
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || clientId.startsWith('REPLACE_')) {
    console.warn(
      '⚠️  GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not set yet. Copy server/.env.example to server/.env and fill in your real GitHub OAuth App keys.'
    );
  }
});