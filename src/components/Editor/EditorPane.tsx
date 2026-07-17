import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import type { ProjectFile } from '@/types';
import './EditorPane.css';

function extensionsFor(kind: ProjectFile['kind']) {
  switch (kind) {
    case 'html': return [html()];
    case 'css': return [css()];
    case 'js': return [javascript()];
    case 'json': return [json()];
    default: return [];
  }
}

export default function EditorPane({
  file,
  onChange
}: {
  file: ProjectFile | undefined;
  onChange: (content: string) => void;
}) {
  const extensions = useMemo(() => (file ? extensionsFor(file.kind) : []), [file?.kind]);

  if (!file) {
    return (
      <div className="editor-empty">
        <p>Select a file from the Explorer to start editing.</p>
      </div>
    );
  }

  if (file.kind === 'image') {
    return (
      <div className="editor-image-view">
        <div className="editor-tab-bar">
          <span className="editor-tab active">{file.path}</span>
        </div>
        <div className="editor-image-preview">
          <img src={file.content} alt={file.path} />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-pane">
      <div className="editor-tab-bar">
        <span className="editor-tab active">{file.path}</span>
        <span className="editor-autosave">● saved automatically</span>
      </div>
      <div className="editor-scroll-area">
        <CodeMirror
          value={file.content}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
            tabSize: 2
          }}
        />
      </div>
    </div>
  );
}
