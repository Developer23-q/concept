# Concept Backend

This is the small server that makes GitHub integration real. It exists for exactly one reason:
**GitHub's OAuth token exchange requires a client secret, and a client secret must never live in
frontend/browser code.** This server holds that secret (and a repo-scoped token for the community
gallery) and the frontend talks to it instead of to GitHub directly.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Then open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Create an OAuth App at https://github.com/settings/developers. Homepage URL = your frontend URL. Authorization callback URL = `http://localhost:8787/auth/github/callback` (or your deployed backend URL). |
| `GITHUB_APPS_REPO_OWNER` / `GITHUB_APPS_REPO_NAME` | The GitHub org/user and repo name that acts as the Concept Apps Repository (e.g. `concept-community` / `apps`). |
| `GITHUB_APPS_REPO_TOKEN` | A personal access token (classic, `repo` scope) or GitHub App installation token with write access to that repo. Used for read-heavy calls (browsing/starring) so visitors don't need to sign in just to look at the gallery. |
| `SESSION_SECRET` | Any long random string (e.g. `openssl rand -hex 32`). |

Until you fill these in, the server still runs — it just responds with clear "not configured yet"
errors instead of silently failing, and logs a warning on startup.

## Run it

```bash
npm run dev
```

Starts on `http://localhost:8787` by default. Update the frontend's `.env` (`VITE_API_BASE_URL`) to
point at this URL — see the root README.

## What it does

- `GET /auth/github/login-url` — returns the GitHub authorize URL (frontend redirects the browser here).
- `GET /auth/github/callback` — GitHub redirects back here with a `code`; this is where the code gets
  exchanged for an access token using the client secret, then the token is stored in a server-side
  session (never sent to the browser).
- `GET /auth/github/me` — returns the connected user, if any.
- `POST /auth/github/logout` — clears the session.
- `POST /apps/push` — pushes a project's files to `apps/{slug}/` in the Concept Apps Repository and
  updates `apps-index.json`. Requires the caller to be signed in (session cookie).
- `GET /apps` — returns the full gallery index (`apps-index.json`). No sign-in required.
- `POST /apps/:slug/star` — increments a star count.
- `GET /apps/:slug/files` — reads back an app's files (used to build a `.concept` download).

## Deploying

Any Node host works (Render, Fly.io, Railway, a plain VPS, etc.). Set the same environment variables
there instead of a local `.env`. Make sure `CORS_ORIGIN` matches your deployed frontend's URL exactly,
and set the OAuth App's callback URL to `https://your-backend-domain/auth/github/callback`.
