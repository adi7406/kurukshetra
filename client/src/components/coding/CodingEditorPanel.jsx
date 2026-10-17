import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Send,
  FileCode,
  RotateCcw,
  Settings2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

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
  pistonStatus = 'ready',
}) {
  const editorRef = useRef(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(13.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editorLoadError, setEditorLoadError] = useState(false);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Normalize supported languages (can be string array or object array with id/label)
  const normalizedLanguages = supportedLanguages.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || 'python',
        label: item.label || (item.id || 'python').toUpperCase(),
        extension: item.extension || `.${item.id || 'py'}`,
        monacoLanguage: item.monacoLanguage || item.id || 'python',
      };
    }
    const id = String(item).toLowerCase();
    const extMap = { python: '.py', javascript: '.js', java: '.java', cpp: '.cpp', c: '.c', go: '.go' };
    return {
      id,
      label: id.toUpperCase(),
      extension: extMap[id] || `.${id}`,
      monacoLanguage: id === 'c++' ? 'cpp' : id,
    };
  });

  const currentLangObj = normalizedLanguages.find((l) => l.id === language) || {
    id: language,
    label: language.toUpperCase(),
    extension: language === 'python' ? '.py' : language === 'javascript' ? '.js' : `.${language}`,
    monacoLanguage: language === 'c++' ? 'cpp' : language,
  };

  const monacoLanguage = currentLangObj.monacoLanguage || 'python';

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    if (onResetStarter) {
      onResetStarter();
    }
  };

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
        position: 'relative',
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
              solution{currentLangObj.extension}
            </span>
            {hasUnsavedChanges && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--coral)',
                  background: 'rgba(255, 91, 55, 0.15)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                Modified
              </span>
            )}
          </div>

          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Select Programming Language"
            style={{
              background: '#24242A',
              color: '#ECEAE8',
              border: '1px solid #373742',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {normalizedLanguages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Sandbox Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              background: '#202028',
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              color: '#A0A0B0',
              border: '1px solid #2E2E3A',
            }}
            title="Isolated code execution sandbox"
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: pistonStatus === 'ready' ? '#10B981' : '#F59E0B',
              }}
            />
            <Cpu size={11} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>Piston Sandbox</span>
          </div>
        </div>

        {/* Right Actions: Settings, Reset, Run, Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onResetStarter && (
            <button
              type="button"
              className="icon-btn-circle"
              style={{ width: '32px', height: '32px', background: '#24242A', color: '#ECEAE8', border: '1px solid #373742' }}
              title="Reset code to starter template"
              onClick={() => setShowResetConfirm(true)}
              aria-label="Reset starter code"
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
              aria-label="Editor preferences"
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
            title="Execute against sample test cases (Run)"
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
            title="Official submission for server-side hidden test evaluation"
          >
            <Send size={12} strokeWidth={2} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Confirmed Reset Modal Banner */}
      {showResetConfirm && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '20px',
            right: '20px',
            background: '#231E21',
            border: '1px solid #5A2A2A',
            borderRadius: '12px',
            padding: '12px 16px',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="var(--coral)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#ECEAE8' }}>
                Reset to starter code?
              </div>
              <div style={{ fontSize: '11.5px', color: '#A0A0B0' }}>
                All unsaved modifications for {currentLangObj.label} will be permanently replaced with the initial starter template.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              style={{
                background: 'transparent',
                border: '1px solid #444450',
                color: '#ECEAE8',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 12px',
                fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              style={{
                background: 'var(--coral)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Confirm Reset
            </button>
          </div>
        </div>
      )}

      {/* Monaco Editor Container */}
      <div style={{ flex: 1, position: 'relative', minHeight: '380px' }}>
        {editorLoadError ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ECEAE8' }}>
            <AlertTriangle size={32} color="var(--coral)" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load Monaco Editor</div>
            <div style={{ fontSize: '12px', color: '#9E9EA8', marginTop: '6px' }}>
              Please check your network connection or reload the workspace.
            </div>
            <button
              type="button"
              onClick={() => setEditorLoadError(false)}
              style={{
                marginTop: '12px',
                background: 'var(--coral)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <Editor
            height="100%"
            language={monacoLanguage}
            theme={editorTheme}
            value={code}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorDidMount}
            loading={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9E9EA8', gap: '10px', fontSize: '13px' }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #555', borderTopColor: 'var(--coral)', borderRadius: '50%' }} />
                Initializing Monaco Editor...
              </div>
            }
            options={{
              fontSize,
              lineHeight: 22,
              fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              autoIndent: 'full',
              formatOnPaste: true,
              bracketPairColorization: { enabled: true },
              matchBrackets: 'always',
              folding: true,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              accessibilitySupport: 'on',
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
}

export default CodingEditorPanel;
