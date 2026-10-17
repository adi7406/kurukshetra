import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Send,
  FileCode,
  RotateCcw,
  Settings2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import LoadingState from '../feedback/LoadingState';

export function CodingEditorPanel({
  code,
  onChange,
  language = 'python',
  onLanguageChange,
  supportedLanguages = ['python', 'javascript'],
  onRun,
  onSubmit,
  isRunning = false,
  isSubmitting = false,
  onResetStarter,
  hasUnsavedChanges = false,
}) {
  const editorRef = useRef(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(13.5);
  const [showSettings, setShowSettings] = useState(false);

  const handleEditorDidMount = (editor, _monaco) => {
    editorRef.current = editor;
  };

  const monacoLanguage =
    language === 'python'
      ? 'python'
      : language === 'javascript'
      ? 'javascript'
      : language === 'java'
      ? 'java'
      : language === 'cpp'
      ? 'cpp'
      : language === 'c'
      ? 'c'
      : language === 'go'
      ? 'go'
      : 'python';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        background: '#16161A',
        overflow: 'hidden',
        height: '100%',
        minHeight: '440px',
      }}
    >
      {/* Top Toolbar Bar */}
      <div
        style={{
          padding: '10px 18px',
          background: '#1C1C21',
          borderBottom: '1px solid #2C2C34',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* File & Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ECEAE8', fontSize: '13px' }}>
            <FileCode size={15} strokeWidth={1.5} color="var(--coral)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : 'cpp'}
            </span>
            {hasUnsavedChanges && (
              <span style={{ fontSize: '10px', color: 'var(--coral)', background: 'rgba(255, 91, 55, 0.15)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
                Modified
              </span>
            )}
          </div>

          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{
              background: '#24242A',
              color: '#ECEAE8',
              border: '1px solid #373742',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {supportedLanguages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Right Actions: Settings, Reset, Run, Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onResetStarter && (
            <button
              type="button"
              className="icon-btn-circle"
              style={{ width: '32px', height: '32px', background: '#24242A', color: '#ECEAE8', border: '1px solid #373742' }}
              title="Reset to starter template"
              onClick={onResetStarter}
            >
              <RotateCcw size={13} strokeWidth={1.5} />
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn-circle"
              style={{ width: '32px', height: '32px', background: '#24242A', color: '#ECEAE8', border: '1px solid #373742' }}
              title="Editor settings"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 size={13} strokeWidth={1.5} />
            </button>

            {showSettings && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '38px',
                  background: '#24242A',
                  border: '1px solid #373742',
                  borderRadius: '12px',
                  padding: '12px',
                  zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  color: '#ECEAE8',
                  fontSize: '12px',
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', color: '#9E9EA8', display: 'block', marginBottom: '4px' }}>Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%', background: '#16161A', color: '#ECEAE8', border: '1px solid #373742', borderRadius: '6px', padding: '4px' }}
                  >
                    <option value={12}>12 px</option>
                    <option value={13.5}>13.5 px</option>
                    <option value={15}>15 px</option>
                    <option value={16}>16 px</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9E9EA8', display: 'block', marginBottom: '4px' }}>Theme</label>
                  <select
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                    style={{ width: '100%', background: '#16161A', color: '#ECEAE8', border: '1px solid #373742', borderRadius: '6px', padding: '4px' }}
                  >
                    <option value="vs-dark">Dark (VS Code)</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRun}
            disabled={isRunning || isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isRunning ? 'wait' : 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            <Play size={12} strokeWidth={2} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--coral)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(255, 91, 55, 0.3)',
              transition: 'transform 150ms ease, opacity 150ms ease',
            }}
          >
            <Send size={12} strokeWidth={2} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div style={{ flex: 1, position: 'relative', minHeight: '380px' }}>
        <Editor
          height="100%"
          language={monacoLanguage}
          theme={editorTheme}
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          loading={<div style={{ padding: '30px', color: '#9E9EA8' }}>Initializing Monaco Editor...</div>}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}

export default CodingEditorPanel;
