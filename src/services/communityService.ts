import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CommunityApp, Project } from '@/types';
import { githubService } from '@/github/githubService';

/**
 * Community Hub reads from the same GitHub Apps Repository as the GitHub
 * integration (githubService). In production this would likely hit a
 * cached search index instead of GitHub's API directly (to support fast
 * text search), but the data shape is identical either way.
 */
export const communityService = {
  async listApps(query = '', category?: string): Promise<CommunityApp[]> {
    const apps = await githubService.browseApps();
    const withDownloads: CommunityApp[] = apps.map((a) => ({ ...a, downloads: Math.round(a.stars * 3.4) }));

    return withDownloads
      .filter((a) => (category ? a.category === category : true))
      .filter((a) =>
        query
          ? a.name.toLowerCase().includes(query.toLowerCase()) ||
            a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
          : true
      )
      .sort((a, b) => b.stars - a.stars);
  },

  async categories(): Promise<string[]> {
    const apps = await githubService.browseApps();
    return Array.from(new Set(apps.map((a) => a.category)));
  },

  /**
   * Downloads a .concept package for the given app. Fetches the real files
   * from the Concept Apps Repository via the backend (GET /apps/:slug/files).
   * If the backend isn't running yet (e.g. you haven't set it up per
   * server/README.md), falls back to a clearly-labeled sample package so the
   * UI still demonstrates the full flow end to end.
   */
  async downloadApp(app: CommunityApp): Promise<void> {
    const zip = new JSZip();

    try {
      const files = await githubService.fetchAppFiles(app.slug);
      if (files.length === 0) throw new Error('No files returned for this app.');
      for (const file of files) {
        zip.file(file.path, file.content);
      }
    } catch {
      // Backend not reachable/configured yet — build an obviously-labeled
      // sample package instead of failing the download outright.
      const sample = buildSampleProject(app);
      for (const file of sample.files) {
        zip.file(file.path, file.content);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${app.slug}.concept`);
  }
};

/** Sample fallback project used only when the real backend can't be reached. */
function buildSampleProject(app: CommunityApp): Project {
  return {
    id: app.slug,
    name: app.name,
    createdAt: app.updatedAt,
    updatedAt: app.updatedAt,
    files: [
      {
        id: '1',
        path: 'index.html',
        kind: 'html',
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${app.name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>${app.name}</h1>
    <p>${app.description}</p>
    <p><em>Sample package — the Concept backend wasn't reachable, so this is a placeholder. See server/README.md to enable real downloads.</em></p>
    <p>Creator: ${app.owner}</p>
  </main>
  <script src="script.js"><\/script>
</body>
</html>
`,
        updatedAt: app.updatedAt
      },
      {
        id: '2',
        path: 'style.css',
        kind: 'css',
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  background: #f7f7f5;
  color: #1a1d29;
}

main {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

h1 {
  margin: 0 0 12px;
  color: #1a1d29;
}

p {
  color: #6b7094;
  line-height: 1.6;
}
`,
        updatedAt: app.updatedAt
      },
      {
        id: '3',
        path: 'script.js',
        kind: 'js',
        content: `console.log("${app.name} — sample package (backend not connected)");\n`,
        updatedAt: app.updatedAt
      },
      {
        id: '4',
        path: 'manifest.json',
        kind: 'json',
        content: JSON.stringify(
          {
            name: app.name,
            short_name: app.name.slice(0, 12),
            description: app.description,
            start_url: 'index.html',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#e8a33d',
            icons: []
          },
          null,
          2
        ),
        updatedAt: app.updatedAt
      }
    ],
    activeFilePath: 'index.html'
  };
}
