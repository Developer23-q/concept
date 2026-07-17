import { Router, type Request, type Response } from 'express';
import { exchangeCodeForToken, fetchGithubUser } from '../services/githubApi.js';

export const authRouter = Router();

// Extend express-session's shape for our two fields.
declare module 'express-session' {
  interface SessionData {
    githubToken?: string;
    githubUser?: { login: string; name: string; avatarUrl: string };
  }
}

/**
 * Step 1: the frontend redirects the browser here (or straight to GitHub —
 * see githubService.ts on the frontend). This endpoint exists mainly so the
 * client_id/redirect_uri never has to be duplicated in frontend code.
 */
authRouter.get('/github/login-url', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || clientId.startsWith('REPLACE_')) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured on the server yet.' });
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'repo read:user');
  res.json({ url: url.toString() });
});

/**
 * Step 2: GitHub redirects the browser back here with a `code`. We exchange
 * it for an access token (this is the step that needs the client secret),
 * store the token in the server-side session, and bounce the browser back
 * to the frontend.
 */
authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/?github_error=missing_code`);
  }

  try {
    const tokenRes = await exchangeCodeForToken(code);
    const ghUser = await fetchGithubUser(tokenRes.access_token);

    req.session.githubToken = tokenRes.access_token;
    req.session.githubUser = {
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url
    };

    res.redirect(`${frontendUrl}/?github_connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub authentication failed.';
    res.redirect(`${frontendUrl}/?github_error=${encodeURIComponent(message)}`);
  }
});

authRouter.get('/github/me', (req: Request, res: Response) => {
  if (!req.session.githubUser) return res.status(401).json({ error: 'Not connected.' });
  res.json(req.session.githubUser);
});

authRouter.post('/github/logout', (req: Request, res: Response) => {
  req.session.githubToken = undefined;
  req.session.githubUser = undefined;
  res.json({ ok: true });
});
