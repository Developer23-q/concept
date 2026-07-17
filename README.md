# Concept

Concept is a beginner-first, VS Code–inspired PWA for turning AI-generated HTML/CSS/JS into a real, installable app — no Android Studio, Gradle, or SDK setup required.

This repo has two parts:

- **`/` (root)** — the frontend PWA (React + TypeScript + Vite).
- **`/server`** — a small backend that makes GitHub integration real (see below). The frontend works without it, but GitHub connect/push/download will show clear "not configured yet" errors until it's running.

## Getting started (frontend)

```bash
npm install
cp .env.example .env
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). To build for production:

```bash
npm run build
npm run preview
```

The production build is a fully installable, offline-capable PWA (via `vite-plugin-pwa`).

## Getting started (backend)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Starts on `http://localhost:8787`. **See `server/README.md`** for the full list of environment variables and exactly where to put your real GitHub OAuth App keys — the short version:

1. Create an OAuth App at https://github.com/settings/developers.
2. Drop the Client ID / Client Secret into `server/.env`.
3. Set a repo-scoped token (`GITHUB_APPS_REPO_TOKEN`) for the Concept Apps Repository so gallery browsing/starring doesn't require every visitor to sign in.

Until you fill those in, the server runs fine and responds with descriptive errors instead of pretending things work.

## Architecture

```
src/
  components/
    Dashboard/      Home screen: new project, recent projects, templates, import
    Workspace/       Main IDE screen: layout shell + file explorer (+ upload)
    Editor/          CodeMirror-based code editor pane
    Terminal/         Terminal panel UI (command input/output)
    Preview/          Live preview iframe + console + error display + new-tab
    Community/        GitHub push panel + Community Hub (search/browse/star/download)
    common/            Small shared UI (install prompt, etc.)
  services/
    storage.ts             IndexedDB persistence (via `idb`)
    validators.ts           HTML/CSS/JS/JSON validation for the build step
    errorAssistant.ts       Translates raw JS errors into beginner-friendly text
    buildService.ts         Packages a project into a .concept (zip) file
    importService.ts        Parses an uploaded .zip back into a Project
    assetUploadService.ts   Uploads images into assets/, sets manifest.json app icon
    terminalCommands.ts     Command parser: mkdir, open, preview [--tab], build, help, ls, clear
    communityService.ts     Community Hub data (search/categories/download) over githubService
  runtime/
    previewRuntime.ts       Builds the preview document; iframe bridge + new-tab opener
  github/
    githubService.ts        Calls the real backend in /server (see below)
  project-manager/
    projectManager.ts        Pure functions: create/rename/delete/upsert files, update content
    templates.ts             Starter templates (blank, to-do, calculator, portfolio)
  types/
    index.ts                 Shared TypeScript types for the whole app
server/
  src/
    index.ts                Express app entry point (sessions, CORS, routes)
    routes/auth.ts           GitHub OAuth login-url / callback / me / logout
    routes/apps.ts           Push / browse / star / fetch-files for the Apps Repository
    services/githubApi.ts    Thin wrapper around GitHub's REST API (Contents API, OAuth token exchange)
    services/appsIndex.ts    Maintains apps-index.json in the repo as the gallery's fast index
```

## How the core flows work

**Editing → Preview.** Every keystroke updates the in-memory `Project` object (auto-saved to IndexedDB on a short debounce). Running `preview` (from the terminal or the Preview panel's Refresh button) calls `buildPreviewDocument()`, which inlines `style.css` and `script.js` into `index.html` as a single HTML string, injects a small console/error bridge script, and loads it into a sandboxed `<iframe srcDoc="...">`. The bridge intercepts `console.*` and uncaught errors and `postMessage`s them back to the parent, where they're shown in the Console panel — raw errors are also run through `errorAssistant.ts` to produce a plain-language explanation.

**Preview in a new tab.** The Preview panel's "⧉ Open in new tab" button (and the terminal's `preview --tab` command) calls `openPreviewInNewTab()`, which builds the same HTML document *without* the console bridge, wraps it in a `Blob`, and opens it with `window.open()` — a real, full, standalone browser tab, not just a bigger iframe. It works fully offline since it's a local Blob URL, not a server round-trip. Console output from that tab only appears in the browser's own DevTools, since there's no Concept parent window listening there.

**Terminal commands.** `mkdir`, `open`, `preview` (`--tab` for a new tab), `build`, `help`, `ls`, and `clear` are handled by a single pure function (`runCommand`) that takes the current project and a small context object (callbacks to update the project, trigger a preview, etc.) and returns lines to print. This keeps the terminal's UI component free of business logic.

**Build system.** Running `build` validates the project (missing files, unbalanced HTML tags, unbalanced CSS braces, a real JS syntax check via `new Function(...)`, valid JSON) and, if there are no blocking errors, zips every file into `ProjectName.concept` (a plain zip under a friendly extension) and downloads it.

**Import.** Uploading a `.zip` (including a previously exported `.concept` file, since it's the same format) is unpacked with JSZip, text files are read as strings, binary/image files are stored as data URLs, and the result becomes a new local `Project`.

**Logo / asset upload.** The File Explorer's ⇧ button lets you pick one or more images straight from your device. Each is read as a data URL and added under `assets/` (auto-renamed `logo-1.png`, `logo-2.png`, etc. if the name is already taken, so nothing gets silently overwritten by accident). Clicking the small ◎ button next to any image file sets it as the app's icon by updating the `icons` array in `manifest.json` — no hand-editing JSON required. Uploads are capped at 4MB and images-only (PNG/JPG/GIF/SVG/WEBP) to keep things fast and predictable for beginners.

**Community Gallery.** The Community Hub is a searchable gallery of apps pulled from the GitHub Apps Repository (via the backend). It has a featured section for top-starred apps, a full searchable/filterable grid, and each card has a one-click download button that fetches the app's real files from GitHub and packages them into a `.concept` file. Downloaded `.concept` files are just zips, so they can be re-imported into Concept from the Dashboard's "Import folder / .zip / .concept" button.

## About the GitHub integration

GitHub's OAuth flow requires a client secret, which can never safely live in frontend code — exchanging an auth code for an access token has to happen server-side. That's what `/server` is for:

- `src/github/githubService.ts` (frontend) never holds a secret. It calls the backend's `/auth/*` and `/apps/*` endpoints, sending the session cookie the backend sets after a successful GitHub login.
- `server/src/services/githubApi.ts` is the **only** place that talks to `api.github.com` directly, using either the visitor's own OAuth token (for pushing their own projects) or a server-held repo token (for read-heavy gallery operations like browsing and starring).
- **To go live**, you only need to fill in `server/.env` — see `server/README.md` for the exact steps and where to get each value. No frontend code changes are required; the seam was built so dropping in real keys is the only step left.

## Known MVP limitations

- The gallery's "download" and "browse" both depend on the backend being configured with a working `GITHUB_APPS_REPO_TOKEN`; until then, downloads fall back to a clearly-labeled sample package so the UI still demonstrates the full flow.
- The build system's validation is pattern-based (tag/bracket balance, `new Function` syntax check), not a full HTML/CSS parser — it catches the common beginner mistakes, not everything.
- Preview inlines CSS/JS referenced by relative path from `index.html`; it doesn't yet handle multi-level nested imports or ES modules across files.
- Asset uploads are images only (for app logos/icons/pictures) — arbitrary binary file types (fonts, video, etc.) aren't supported yet.
