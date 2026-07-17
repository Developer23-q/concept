import type { Project } from '@/types';
import { getFile } from '@/project-manager/projectManager';

/**
 * The bridge script injected into the preview iframe. It intercepts
 * console.log/warn/error and uncaught errors, then postMessages them
 * out to the parent window so the Terminal/Console panel can show them
 * — including the raw error message the Error Assistant will translate.
 */
const BRIDGE_SCRIPT = `
<script>
(function () {
  function send(level, args) {
    try {
      const text = args.map(function (a) {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
        return String(a);
      }).join(' ');
      window.parent.postMessage({ __concept_console: true, level: level, text: text }, '*');
    } catch (e) { /* no-op */ }
  }

  ['log', 'warn', 'error', 'info'].forEach(function (level) {
    const original = console[level];
    console[level] = function () {
      send(level, Array.prototype.slice.call(arguments));
      original.apply(console, arguments);
    };
  });

  window.addEventListener('error', function (e) {
    send('error', [e.message]);
  });

  window.addEventListener('unhandledrejection', function (e) {
    send('error', [e.reason && e.reason.message ? e.reason.message : String(e.reason)]);
  });
})();
</script>
`;

/**
 * Combines index.html + style.css + script.js (+ any other files, inlined
 * where referenced) into a single HTML string that can be set as an
 * iframe srcdoc. Images referenced by relative path are inlined as data URLs.
 *
 * @param includeBridge When true (default), injects the console/error
 *   bridge that postMessages back to a parent window — used for the
 *   in-app iframe preview. Pass false for standalone contexts (like a new
 *   browser tab) where there's no Concept parent window listening; the
 *   app will still run identically, it just won't report console output
 *   back into the Concept UI.
 */
export function buildPreviewDocument(project: Project, includeBridge = true): string {
  const html = getFile(project, 'index.html');
  if (!html) {
    return `<html><body style="font-family:sans-serif;padding:24px;color:#a00">index.html not found in this project.</body></html>`;
  }

  let doc = html.content;

  // Inline <link rel="stylesheet" href="style.css">
  doc = doc.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
    const cssFile = getFile(project, stripLeadingSlash(href));
    if (!cssFile) return match;
    return `<style data-source="${href}">\n${cssFile.content}\n</style>`;
  });

  // Inline <script src="script.js"></script> (any .js file referenced by src)
  doc = doc.replace(/<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, src) => {
    const jsFile = getFile(project, stripLeadingSlash(src));
    if (!jsFile) return match;
    return `<script data-source="${src}">\n${jsFile.content}\n</script>`;
  });

  // Inline image assets referenced by relative path (src="assets/x.png")
  doc = doc.replace(/(src|href)=["'](assets\/[^"']+)["']/gi, (match, attr, path) => {
    const asset = getFile(project, path);
    if (!asset || asset.kind !== 'image') return match;
    return `${attr}="${asset.content}"`;
  });

  if (includeBridge) {
    // Inject the console/error bridge right after <head> (or at the top if no head tag)
    if (/<head[^>]*>/i.test(doc)) {
      doc = doc.replace(/<head[^>]*>/i, (m) => `${m}\n${BRIDGE_SCRIPT}`);
    } else {
      doc = BRIDGE_SCRIPT + doc;
    }
  }

  return doc;
}

/**
 * Opens the project's preview in a brand new full browser tab, exactly like
 * viewing a real deployed page — not just a bigger iframe. Uses a Blob URL
 * so it works fully offline (no server round-trip needed) and so relative
 * asset paths inlined by buildPreviewDocument keep working.
 *
 * Console/error messages from this tab do NOT report back into Concept's
 * Console panel (there's no parent window to receive them) — open the
 * browser's own DevTools console in that tab if you need to debug there.
 */
export function openPreviewInNewTab(project: Project): void {
  const doc = buildPreviewDocument(project, false);
  const blob = new Blob([doc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (!win) {
    // Popup blocked — let the caller's UI surface this rather than failing silently.
    URL.revokeObjectURL(url);
    throw new Error('Your browser blocked the new tab. Allow pop-ups for this site and try again.');
  }

  // Release the blob URL once the new tab has loaded it, with a generous
  // fallback timeout in case the load event doesn't fire (e.g. tab closed
  // immediately) so we don't leak memory indefinitely either way.
  win.addEventListener('load', () => URL.revokeObjectURL(url));
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\.?\//, '');
}
