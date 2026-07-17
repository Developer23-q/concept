import { Router, type Request, type Response } from 'express';
import { putRepoFile, getRepoFile, listRepoDir } from '../services/githubApi.js';
import { readIndex, upsertApp, starApp } from '../services/appsIndex.js';

export const appsRouter = Router();

function requireAuth(req: Request, res: Response): string | null {
  const token = req.session?.githubToken;
  if (!token) {
    res.status(401).json({ error: 'Connect your GitHub account first.' });
    return null;
  }
  return token;
}

interface IncomingFile {
  path: string;
  content: string; // text content, or a data: URL for binary/images
}

/**
 * Pushes a project's files into /apps/{slug}/ of the Concept Apps Repository,
 * then updates apps-index.json so the gallery picks it up.
 * Body: { slug, name, description, category, tags, files: IncomingFile[] }
 */
appsRouter.post('/push', async (req: Request, res: Response) => {
  const token = requireAuth(req, res);
  if (!token) return;

  const { slug, name, description, category, tags, files } = req.body as {
    slug: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    files: IncomingFile[];
  };

  if (!slug || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Missing slug or files.' });
  }

  const owner = process.env.GITHUB_APPS_REPO_OWNER || 'concept-community';
  const repo = process.env.GITHUB_APPS_REPO_NAME || 'apps';

  try {
    for (const file of files) {
      const isDataUrl = file.content.startsWith('data:');
      // The Contents API always base64-encodes on the wire; putRepoFile does
      // that from a raw string, so for already-binary data URLs we strip the
      // "data:...;base64," prefix and decode back to raw bytes as a string.
      const content = isDataUrl
        ? Buffer.from(file.content.split(',')[1] ?? '', 'base64').toString('binary')
        : file.content;

      await putRepoFile({
        token,
        owner,
        repo,
        path: `apps/${slug}/${file.path}`,
        content,
        message: `Update ${slug}/${file.path} via Concept`
      });
    }

    const user = req.session.githubUser;
    const entry = await upsertApp(
      {
        slug,
        name,
        description,
        owner: user?.login || 'unknown',
        tags: tags || [],
        category: category || 'Other',
        stars: 0,
        updatedAt: Date.now()
      },
      token
    );

    res.json({ ok: true, app: entry });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Push failed.' });
  }
});

/** Returns the full gallery index — no auth required, uses the server's own token. */
appsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const entries = await readIndex();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load apps.' });
  }
});

appsRouter.post('/:slug/star', async (req: Request, res: Response) => {
  try {
    const entry = await starApp(req.params.slug);
    if (!entry) return res.status(404).json({ error: 'App not found.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to star app.' });
  }
});

/** Lists the files for one app (used before zipping a download client-side). */
appsRouter.get('/:slug/files', async (req: Request, res: Response) => {
  const owner = process.env.GITHUB_APPS_REPO_OWNER || 'concept-community';
  const repo = process.env.GITHUB_APPS_REPO_NAME || 'apps';
  const token = req.session?.githubToken || process.env.GITHUB_APPS_REPO_TOKEN;

  if (!token || token.startsWith('REPLACE_')) {
    return res.status(500).json({ error: 'No GitHub token available on the server to read files.' });
  }

  try {
    const dirPath = `apps/${req.params.slug}`;
    const entries = await listRepoDir({ token, owner, repo, path: dirPath });
    const files: IncomingFile[] = [];
    for (const entry of entries) {
      if (entry.type !== 'file') continue;
      const content = await getRepoFile({ token, owner, repo, path: `${dirPath}/${entry.name}` });
      if (content !== null) files.push({ path: entry.name, content });
    }
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load app files.' });
  }
});
