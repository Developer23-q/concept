import { getRepoFile, putRepoFile } from './githubApi.js';

export interface AppIndexEntry {
  slug: string;
  name: string;
  description: string;
  owner: string;
  tags: string[];
  category: string;
  stars: number;
  updatedAt: number;
}

const INDEX_PATH = 'apps-index.json';

/**
 * Server-held token used for read-heavy, low-stakes operations (browsing,
 * starring) so visitors don't have to sign in just to look at the gallery.
 * Falls back to null if not configured — callers should handle that by
 * requiring the visitor's own OAuth token instead.
 */
function serverToken(): string | null {
  const token = process.env.GITHUB_APPS_REPO_TOKEN;
  return token && !token.startsWith('REPLACE_') ? token : null;
}

function repoCoords() {
  return {
    owner: process.env.GITHUB_APPS_REPO_OWNER || 'concept-community',
    repo: process.env.GITHUB_APPS_REPO_NAME || 'apps'
  };
}

export async function readIndex(tokenOverride?: string): Promise<AppIndexEntry[]> {
  const token = tokenOverride || serverToken();
  if (!token) return [];
  const { owner, repo } = repoCoords();
  const raw = await getRepoFile({ token, owner, repo, path: INDEX_PATH });
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppIndexEntry[];
  } catch {
    return [];
  }
}

export async function writeIndex(entries: AppIndexEntry[], tokenOverride?: string): Promise<void> {
  const token = tokenOverride || serverToken();
  if (!token) throw new Error('No GitHub token available to update the apps index.');
  const { owner, repo } = repoCoords();
  await putRepoFile({
    token,
    owner,
    repo,
    path: INDEX_PATH,
    content: JSON.stringify(entries, null, 2),
    message: 'Update apps-index.json'
  });
}

export async function upsertApp(entry: AppIndexEntry, token: string): Promise<AppIndexEntry> {
  const entries = await readIndex(token);
  const i = entries.findIndex((e) => e.slug === entry.slug);
  if (i >= 0) entries[i] = { ...entries[i], ...entry, stars: entries[i].stars };
  else entries.push(entry);
  await writeIndex(entries, token);
  return entry;
}

export async function starApp(slug: string): Promise<AppIndexEntry | null> {
  const token = serverToken();
  if (!token) throw new Error('Starring requires GITHUB_APPS_REPO_TOKEN to be configured on the server.');
  const entries = await readIndex(token);
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return null;
  entry.stars += 1;
  await writeIndex(entries, token);
  return entry;
}
