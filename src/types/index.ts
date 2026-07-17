/**
 * Core domain types for Concept.
 * Kept in one place so every service/component agrees on the same shapes.
 */

export type FileKind = 'html' | 'css' | 'js' | 'json' | 'text' | 'image';

export interface ProjectFile {
  id: string;           // stable id, independent of renames
  path: string;         // e.g. "index.html" or "assets/logo.png"
  kind: FileKind;
  content: string;      // text content; for images this is a data URL
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  files: ProjectFile[];
  // which file is currently open in the editor
  activeFilePath: string;
}

export type TemplateId = 'blank' | 'todo' | 'calculator' | 'portfolio';

export interface ProjectTemplate {
  id: TemplateId;
  name: string;
  description: string;
  files: Omit<ProjectFile, 'id' | 'updatedAt'>[];
}

// ---------- Terminal ----------

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
  timestamp: number;
}

export type CommandName = 'mkdir' | 'open' | 'preview' | 'build' | 'help' | 'ls' | 'clear' | 'rm';

// ---------- Preview / console bridge ----------

export type ConsoleLevel = 'log' | 'warn' | 'error' | 'info';

export interface PreviewConsoleMessage {
  id: string;
  level: ConsoleLevel;
  text: string;
  timestamp: number;
  friendly?: FriendlyError;
}

// ---------- Error Assistant ----------

export interface FriendlyError {
  title: string;
  explanation: string;
  hint?: string;
  file?: string;
  line?: number;
}

// ---------- Build system ----------

export interface BuildIssue {
  severity: 'error' | 'warning';
  message: string;
  file?: string;
}

export interface BuildResult {
  ok: boolean;
  issues: BuildIssue[];
  packageName?: string;
  blob?: Blob;
}

// ---------- GitHub integration ----------

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
}

export interface GitHubRepoApp {
  slug: string;          // folder name under /apps
  name: string;
  description: string;
  owner: string;
  tags: string[];
  category: string;
  stars: number;
  updatedAt: number;
}

// ---------- Community ----------

export interface CommunityApp extends GitHubRepoApp {
  downloads: number;
}
