import { useEffect, useState } from 'react';
import type { GitHubUser, Project } from '@/types';
import { githubService } from '@/github/githubService';
import './GitHubPanel.css';

const CATEGORIES = ['Utilities', 'Productivity', 'Personal', 'Games', 'Education', 'Other'];

export default function GitHubPanel({ project }: { project: Project }) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    // Pick up ?github_connected=1 or ?github_error=... left by the backend's
    // OAuth callback redirect, then clean the URL so a refresh doesn't
    // re-trigger this logic.
    const params = new URLSearchParams(window.location.search);
    const error = params.get('github_error');
    if (error) setConnectError(decodeURIComponent(error));
    if (params.has('github_connected') || params.has('github_error')) {
      params.delete('github_connected');
      params.delete('github_error');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }

    githubService.getConnectedUser().then((u) => {
      setUser(u);
      setCheckingSession(false);
    });
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      // This redirects the whole page to GitHub — it will navigate away,
      // so there's nothing to update in state after a successful call.
      await githubService.connect();
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not start GitHub sign-in.');
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await githubService.disconnect();
    setUser(null);
  }

  async function handlePush() {
    setPushing(true);
    setStatus(null);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const app = await githubService.pushProject(project, { category, tags });
      setStatus(`Pushed to concept-community/apps/${app.slug} ✓`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Push failed.');
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="github-panel">
      <div className="github-notice card">
        <strong>How this works</strong>
        <p>
          Concept talks to a small backend server that holds your GitHub OAuth credentials securely —
          they're never exposed to the browser. See <code>server/README.md</code> for how to configure
          your own GitHub OAuth App keys.
        </p>
      </div>

      {connectError && (
        <div className="github-error card">
          <strong>Connection problem</strong>
          <p>{connectError}</p>
        </div>
      )}

      {checkingSession ? (
        <p className="github-status">Checking GitHub session…</p>
      ) : !user ? (
        <button className="btn btn-primary" onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Redirecting to GitHub…' : '⚇ Connect GitHub account'}
        </button>
      ) : (
        <>
          <div className="github-user-row card">
            <div className="github-avatar">{user.login.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="github-user-name">{user.name}</div>
              <div className="github-user-login">@{user.login}</div>
            </div>
            <button className="btn btn-ghost" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>

          <div className="github-push-form card">
            <h3>Push "{project.name}" to Concept Apps</h3>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label>Tags (comma separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="beginner, utility, fun"
            />
            <button className="btn btn-primary" onClick={handlePush} disabled={pushing}>
              {pushing ? 'Pushing…' : '⇧ Push to repository'}
            </button>
            {status && <p className="github-status">{status}</p>}
          </div>
        </>
      )}
    </div>
  );
}
