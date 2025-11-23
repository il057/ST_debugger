import React from 'react';
import { ProcessingLog } from '../../types';
import { AlertCircle, CheckCircle, Terminal, ChevronDown, ChevronRight, Ban } from 'lucide-react';

interface PreviewPaneProps {
        htmlContent: string;
        logs: ProcessingLog[];
        isConsoleCollapsed: boolean;
        onToggleConsole: () => void;
        language: 'zh' | 'en';
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ htmlContent, logs, isConsoleCollapsed, onToggleConsole, language }) => {
        return (
                <div className="flex flex-col h-full bg-transparent overflow-hidden">
                        {/* Visual Preview - Solid Colors now */}
                        <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-900 transition-colors duration-300">
                                <div className="absolute top-2 left-2 pointer-events-none z-10">
                                        <span className="bg-black/90 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 font-mono shadow-sm">
                                                PREVIEW :: RENDER
                                        </span>
                                </div>
                                <div className="w-full h-full flex items-center justify-center p-4">
                                        <iframe
                                                srcDoc={htmlContent}
                                                title="Preview"
                                                className="w-full h-full border-none shadow-xl rounded-lg bg-white dark:bg-neutral-950"
                                                style={{ colorScheme: 'auto' }}
                                                sandbox="allow-scripts"
                                        />
                                </div>
                        </div>

                        {/* Console Logs */}
                        <div
                                className={`flex flex-col border-t border-glass-border bg-glass-surface backdrop-blur-xl transition-all duration-300 ease-in-out ${isConsoleCollapsed ? 'h-8' : 'h-48'}`}
                        >
                                <div
                                        className="flex items-center px-4 py-2 border-b border-glass-border bg-glass-highlight cursor-pointer select-none hover:bg-glass-highlight/80"
                                        onClick={onToggleConsole}
                                >
                                        {isConsoleCollapsed ? <ChevronRight size={14} className="mr-2 opacity-50" /> : <ChevronDown size={14} className="mr-2 opacity-50" />}
                                        <Terminal size={12} className="text-text-primary/70 mr-2" />
                                        <span className="text-xs font-mono text-text-primary/70 uppercase">
                                                {language === 'zh' ? '调试控制台 (CONSOLE)' : 'DEBUG CONSOLE'}
                                        </span>
                                        <div className="flex-1"></div>
                                        <span className="text-[10px] text-text-primary/40 font-mono">
                                                {logs.length} {language === 'zh' ? '事件' : 'EVENTS'}
                                        </span>
                                </div>

                                {!isConsoleCollapsed && (
                                        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-white dark:bg-neutral-900 transition-colors">
                                                {logs.length === 0 && <div className="text-text-primary/40 italic px-2">{language === 'zh' ? '等待输入...' : 'Waiting for input...'}</div>}

                                                {logs.map((log, idx) => (
                                                        <div key={idx} className="flex items-start space-x-2 px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors group">
                                                                <span className={`mt-0.5 ${log.error ? 'text-red-500' : (log.matched ? 'text-green-500' : 'text-gray-400')}`}>
                                                                        {log.error ? <Ban size={12} /> : (log.matched ? <CheckCircle size={12} /> : <AlertCircle size={12} />)}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-baseline">
                                                                                <span className="text-text-primary/90 font-semibold truncate pr-2">{log.ruleName}</span>
                                                                                <span className="text-text-primary/40 text-[10px] whitespace-nowrap">{log.executionTimeMs.toFixed(2)}ms</span>
                                                                        </div>
                                                                        <div className="text-text-primary/60 mt-0.5 break-all">
                                                                                {log.error ? (
                                                                                        <span className="text-red-400/80">{log.error}</span>
                                                                                ) : (
                                                                                        <span>
                                                                                                {language === 'zh' ? '匹配次数: ' : 'Matches: '}
                                                                                                <span className={log.matchCount > 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-gray-500"}>{log.matchCount}</span>
                                                                                        </span>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                )}
                        </div>
                </div>
        );
};