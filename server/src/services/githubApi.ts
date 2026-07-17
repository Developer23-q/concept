import fetch from 'node-fetch';

const GITHUB_API = 'https://api.github.com';

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
}

/**
 * Exchanges an OAuth `code` (from the GitHub redirect) for an access token.
 * This is the one step that REQUIRES the client secret, which is why it
 * must run on the server and never in the browser.
 */
export async function exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.startsWith('REPLACE_')) {
    throw new Error(
      'GitHub OAuth is not configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in server/.env.'
    );
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GitHubTokenResponse & { error?: string; error_description?: string };
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data;
}

export async function fetchGithubUser(accessToken: string): Promise<GitHubUserResponse> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error(`Failed to fetch GitHub user: ${res.status}`);
  return (await res.json()) as GitHubUserResponse;
}

/**
 * Creates or updates a file in a repo via GitHub's Contents API.
 * GitHub requires the current file's `sha` to update an existing file,
 * so we look it up first (a 404 just means "file doesn't exist yet").
 */
export async function putRepoFile(opts: {
  token: string;
  owner: string;
  repo: string;
  path: string;
  content: string; // raw text content; will be base64-encoded here
  message: string;
}): Promise<void> {
  const { token, owner, repo, path, content, message } = opts;
  const base = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  let sha: string | undefined;
  const existing = await fetch(base, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (existing.ok) {
    const json = (await existing.json()) as { sha: string };
    sha = json.sha;
  }

  const res = await fetch(base, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub push failed (${res.status}): ${text}`);
  }
}

export async function getRepoFile(opts: {
  token: string;
  owner: string;
  repo: string;
  path: string;
}): Promise<string | null> {
  const { token, owner, repo, path } = opts;
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const json = (await res.json()) as { content: string; encoding: string };
  return Buffer.from(json.content, json.encoding as BufferEncoding).toString('utf-8');
}

export async function listRepoDir(opts: {
  token: string;
  owner: string;
  repo: string;
  path: string;
}): Promise<{ name: string; type: 'file' | 'dir' }[]> {
  const { token, owner, repo, path } = opts;
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list failed (${res.status})`);
  const json = (await res.json()) as { name: string; type: 'file' | 'dir' }[];
  return json;
}
