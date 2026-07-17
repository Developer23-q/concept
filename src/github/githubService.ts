import type { GitHubRepoApp, GitHubUser, Project } from '@/types';

/**
 * GitHub integration — talks to the Concept backend (see /server), which is
 * the only place that ever sees a GitHub client secret or a long-lived
 * access token. This file never contains a secret; it just calls the API_BASE
 * endpoints documented in server/README.md.
 *
 * Local/offline fallback: if VITE_API_BASE_URL isn't reachable (e.g. you're
 * running the frontend without the backend yet), these calls will fail with
 * a clear network error rather than silently pretending to work — that's
 * intentional, so it's obvious the backend needs to be started.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: 'include', // send the session cookie set by the backend
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const githubService = {
  /**
   * Kicks off the real GitHub OAuth flow: asks the backend for the
   * authorize URL (so the client ID only has to live in one place) and
   * redirects the whole page there. GitHub will redirect back to the
   * backend's /auth/github/callback, which exchanges the code for a token
   * server-side and then bounces the browser back here.
   *
   * This function does NOT return a user — the redirect leaves the page.
   * After returning from GitHub, call `getConnectedUser()` to pick up the
   * now-active session.
   */
  async connect(): Promise<void> {
    const { url } = await apiFetch<{ url: string }>('/auth/github/login-url');
    window.location.href = url;
  },

  /** Checks the current session with the backend. Returns null if not connected. */
  async getConnectedUser(): Promise<GitHubUser | null> {
    try {
      const user = await apiFetch<{ login: string; name: string; avatarUrl: string }>('/auth/github/me');
      return user;
    } catch {
      return null;
    }
  },

  async disconnect(): Promise<void> {
    await apiFetch('/auth/github/logout', { method: 'POST' });
  },

  /** Pushes a project into /apps/{slug} of the Concept Apps Repository via the backend. */
  async pushProject(project: Project, opts: { category: string; tags: string[] }): Promise<GitHubRepoApp> {
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const files = project.files.map((f) => ({ path: f.path, content: f.content }));

    const result = await apiFetch<{ ok: true; app: GitHubRepoApp }>('/apps/push', {
      method: 'POST',
      body: JSON.stringify({
        slug,
        name: project.name,
        description: `Built with Concept — ${project.files.length} files.`,
        category: opts.category,
        tags: opts.tags,
        files
      })
    });

    return result.app;
  },

  async browseApps(): Promise<GitHubRepoApp[]> {
    return apiFetch<GitHubRepoApp[]>('/apps');
  },

  async starApp(slug: string): Promise<void> {
    await apiFetch(`/apps/${encodeURIComponent(slug)}/star`, { method: 'POST' });
  },

  /** Fetches an app's raw files (used before zipping a download). */
  async fetchAppFiles(slug: string): Promise<{ path: string; content: string }[]> {
    const result = await apiFetch<{ files: { path: string; content: string }[] }>(
      `/apps/${encodeURIComponent(slug)}/files`
    );
    return result.files;
  }
};
