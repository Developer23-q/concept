import type { Project } from '@/types';
import { upsertFile, uniqueAssetPath } from '@/project-manager/projectManager';

const MAX_ASSET_BYTES = 4 * 1024 * 1024; // 4MB — generous for icons/logos, keeps IndexedDB entries reasonable

/** Reads a File as a base64 data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
}

/**
 * Uploads one or more image files into the project's assets/ folder.
 * Returns the updated project and the list of paths that were added
 * (existing files with the same name get a "-1", "-2"... suffix rather
 * than silently overwriting something unrelated).
 */
export async function uploadAssets(
  project: Project,
  files: FileList | File[]
): Promise<{ project: Project; addedPaths: string[] }> {
  let current = project;
  const addedPaths: string[] = [];

  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) {
      throw new Error(`"${file.name}" isn't an image. Only image uploads (PNG, JPG, GIF, SVG, WEBP) are supported here.`);
    }
    if (file.size > MAX_ASSET_BYTES) {
      throw new Error(`"${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Keep uploads under 4MB.`);
    }

    const dataUrl = await readAsDataUrl(file);
    const path = uniqueAssetPath(current, `assets/${sanitizeFileName(file.name)}`);
    current = upsertFile(current, path, dataUrl);
    addedPaths.push(path);
  }

  return { project: current, addedPaths };
}

/**
 * Convenience helper: uploads a single image and also updates manifest.json's
 * `icons` array to point at it (192x192 + 512x512 entries referencing the
 * same uploaded file) — a quick way for a beginner to set their app's logo
 * without hand-editing JSON.
 */
export function setAppIcon(project: Project, assetPath: string): Project {
  const manifestFile = project.files.find((f) => f.path === 'manifest.json');
  let manifest: Record<string, unknown> = {};
  if (manifestFile) {
    try {
      manifest = JSON.parse(manifestFile.content);
    } catch {
      manifest = {};
    }
  }

  manifest.icons = [
    { src: assetPath, sizes: '192x192', type: guessMimeFromPath(assetPath) },
    { src: assetPath, sizes: '512x512', type: guessMimeFromPath(assetPath) }
  ];

  return upsertFile(project, 'manifest.json', JSON.stringify(manifest, null, 2));
}

function guessMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}
