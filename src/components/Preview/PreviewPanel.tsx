import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project, PreviewConsoleMessage } from '@/types';
import { buildPreviewDocument, openPreviewInNewTab } from '@/runtime/previewRuntime';
import { translateError } from '@/services/errorAssistant';
import './PreviewPanel.css';

type ViewMode = 'desktop' | 'mobile';

export default function PreviewPanel({ project, refreshNonce }: { project: Project; refreshNonce: number }) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [messages, setMessages] = useState<PreviewConsoleMessage[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const doc = useMemo(() => buildPreviewDocument(project), [project, reloadKey, refreshNonce]);

  useEffect(() => {
    setReloadKey((k) => k + 1);
    setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || !e.data.__concept_console) return;
      const level = e.data.level as PreviewConsoleMessage['level'];
      const text = String(e.data.text ?? '');
      const friendly = level === 'error' ? translateError(text, project.files.find((f) => f.path === 'script.js')?.content) : undefined;
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36).slice(2), level, text, timestamp: Date.now(), friendly }
      ]);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [project]);

  const errorCount = messages.filter((m) => m.level === 'error').length;

  function handleOpenNewTab() {
    try {
      openPreviewInNewTab(project);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not open a new tab.');
    }
  }

  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <button className="btn btn-ghost preview-refresh" onClick={() => setReloadKey((k) => k + 1)} title="Refresh preview">
          ⟳ Refresh
        </button>
        <button className="btn btn-ghost" onClick={handleOpenNewTab} title="Open this preview in a full new browser tab">
          ⧉ Open in new tab
        </button>
        <div className="preview-mode-toggle">
          <button className={viewMode === 'desktop' ? 'active' : ''} onClick={() => setViewMode('desktop')}>
            🖥 Desktop
          </button>
          <button className={viewMode === 'mobile' ? 'active' : ''} onClick={() => setViewMode('mobile')}>
            📱 Mobile
          </button>
        </div>
        <div className="preview-toolbar-spacer" />
        <button className="btn btn-ghost" onClick={() => setShowConsole((v) => !v)}>
          {showConsole ? 'Hide console' : 'Show console'}
          {errorCount > 0 && <span className="preview-error-badge">{errorCount}</span>}
        </button>
      </div>

      <div className={`preview-stage ${viewMode}`}>
        <div className="preview-frame-wrap">
          <iframe
            key={reloadKey}
            ref={iframeRef}
            title="Live preview"
            srcDoc={doc}
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
          />
        </div>
      </div>

      {showConsole && (
        <div className="preview-console">
          <div className="preview-console-header">Console</div>
          <div className="preview-console-body">
            {messages.length === 0 && <p className="preview-console-empty">No console output yet. Interact with your app or refresh.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`preview-console-line level-${m.level}`}>
                {m.level === 'error' && m.friendly ? (
                  <div className="preview-friendly-error">
                    <strong>{m.friendly.title}</strong>
                    <p>{m.friendly.explanation}</p>
                    {m.friendly.hint && <p className="preview-friendly-hint">💡 {m.friendly.hint}</p>}
                    <details>
                      <summary>Show raw error</summary>
                      <code>{m.text}</code>
                    </details>
                  </div>
                ) : (
                  <code>{m.text}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
