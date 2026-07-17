import type { BuildIssue, Project } from '@/types';
import { getFile } from '@/project-manager/projectManager';

const REQUIRED_FILES = ['index.html', 'style.css', 'script.js'];

export function validateProject(project: Project): BuildIssue[] {
  const issues: BuildIssue[] = [];

  for (const required of REQUIRED_FILES) {
    if (!getFile(project, required)) {
      issues.push({
        severity: 'error',
        message: `Missing required file "${required}". Every Concept project needs it.`,
        file: required
      });
    }
  }

  const html = getFile(project, 'index.html');
  if (html) issues.push(...validateHtml(html.content));

  const css = getFile(project, 'style.css');
  if (css) issues.push(...validateCss(css.content));

  const js = getFile(project, 'script.js');
  if (js) issues.push(...validateJs(js.content));

  const manifest = getFile(project, 'manifest.json');
  if (manifest) issues.push(...validateJsonFile(manifest.content, 'manifest.json'));

  return issues;
}

function validateHtml(content: string): BuildIssue[] {
  const issues: BuildIssue[] = [];

  if (!/<html[\s>]/i.test(content)) {
    issues.push({ severity: 'warning', message: 'index.html is missing an <html> tag.', file: 'index.html' });
  }
  if (!/<title>/i.test(content)) {
    issues.push({ severity: 'warning', message: 'index.html has no <title>. Add one so your app has a name in the browser tab.', file: 'index.html' });
  }

  // Basic tag-balance check for common tags (not a full parser, but catches the classic beginner mistake)
  const openTags = ['div', 'section', 'header', 'footer', 'main', 'ul', 'li', 'form', 'button', 'p', 'span', 'h1', 'h2', 'h3'];
  for (const tag of openTags) {
    const openCount = (content.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length;
    const closeCount = (content.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length;
    if (openCount !== closeCount) {
      issues.push({
        severity: 'error',
        message: `Found ${openCount} <${tag}> opening tag(s) but ${closeCount} closing </${tag}> tag(s). Check they match up.`,
        file: 'index.html'
      });
    }
  }

  return issues;
}

function validateCss(content: string): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const openBraces = (content.match(/{/g) ?? []).length;
  const closeBraces = (content.match(/}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      severity: 'error',
      message: `style.css has ${openBraces} "{" but ${closeBraces} "}". A CSS rule is probably not closed.`,
      file: 'style.css'
    });
  }
  return issues;
}

function validateJs(content: string): BuildIssue[] {
  const issues: BuildIssue[] = [];

  // Bracket/paren/brace balance check — catches the #1 beginner JS mistake
  const pairs: [string, string, string][] = [
    ['(', ')', 'parenthesis'],
    ['{', '}', 'curly brace'],
    ['[', ']', 'square bracket']
  ];
  for (const [open, close, label] of pairs) {
    const openCount = countChar(content, open);
    const closeCount = countChar(content, close);
    if (openCount !== closeCount) {
      issues.push({
        severity: 'error',
        message: `script.js has ${openCount} "${open}" but ${closeCount} "${close}". Check for a missing ${label}.`,
        file: 'script.js'
      });
    }
  }

  // Try actually parsing it as a sanity check for real syntax errors
  try {
    // eslint-disable-next-line no-new-func
    new Function(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      severity: 'error',
      message: `script.js has a syntax error: ${message}`,
      file: 'script.js'
    });
  }

  return issues;
}

function validateJsonFile(content: string, filename: string): BuildIssue[] {
  try {
    JSON.parse(content);
    return [];
  } catch {
    return [{ severity: 'error', message: `${filename} is not valid JSON. Check for a missing comma or quote.`, file: filename }];
  }
}

/** Counts a literal character occurrence, ignoring the trivial noise of comments/strings would need a real parser — good enough for beginner-level checks. */
function countChar(content: string, char: string): number {
  let count = 0;
  for (const c of content) if (c === char) count++;
  return count;
}
