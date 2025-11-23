import React, { useEffect, useState } from 'react';
import Editor, { Loader } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'javascript' | 'text';
  height?: string;
  label?: string;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, height = "100%", label, readOnly = false }) => {
  // Detect dark mode from document
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full border border-glass-border rounded-lg overflow-hidden bg-white dark:bg-neutral-900 backdrop-blur-sm transition-colors">
      {label && (
        <div className="bg-glass-surface px-3 py-1.5 text-[10px] text-text-primary/60 font-mono border-b border-glass-border uppercase tracking-widest font-bold">
          {label}
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        value={value}
        theme={isDark ? "vs-dark" : "vs"}
        onChange={(val) => onChange(val || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          fontFamily: "'JetBrains Mono', monospace",
          readOnly: readOnly,
          renderLineHighlight: 'none',
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          lineNumbersMinChars: 3,
          contextmenu: false,
        }}
      />
    </div>
  );
};