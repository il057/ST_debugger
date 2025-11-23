import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RuleList } from './components/Editor/RuleList';
import { CodeEditor } from './components/Editor/CodeEditor';
import { PreviewPane } from './components/Preview/PreviewPane';
import { ChatPanel } from './components/AIChat/ChatPanel';
import { Button } from './components/UI/Button';
import { RegexRule, PipelineResult, STScriptImport, UserSettings } from './types';
import { DEFAULT_RULES, DEFAULT_TEXT } from './constants';
import { runPipeline } from './utils/regexHelpers';
import { sendMessageToAI, ChatMessage, fetchAvailableModels } from './services/aiApiService';
import { Download, Upload, Sparkles, Layout, Trash2, Settings, Moon, Sun, RotateCcw, Globe, RefreshCw, Info, List, Edit3, Eye, Menu, X } from 'lucide-react';
import { ConfirmationModal } from './components/UI/ConfirmationModal';

function App() {
        // --- State ---
        const [sourceText, setSourceText] = useState(DEFAULT_TEXT);
        const [rules, setRules] = useState<RegexRule[]>(DEFAULT_RULES);
        const [activeRuleId, setActiveRuleId] = useState<string | null>(DEFAULT_RULES[0]?.id || null);
        const [pipelineResult, setPipelineResult] = useState<PipelineResult>({ finalHtml: '', logs: [] });

        // Settings & Theme
        const [settings, setSettings] = useState<UserSettings>(() => {
                const saved = localStorage.getItem('trd_settings');
                const defaultSettings = { apiKey: '', baseUrl: '', theme: 'dark', language: 'zh', model: 'gemini-2.0-flash-exp' };
                const parsedSettings = saved ? JSON.parse(saved) : defaultSettings;
                // Apply theme immediately to avoid flash
                if (parsedSettings.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                        document.body.classList.add('dark');
                } else {
                        document.documentElement.classList.remove('dark');
                        document.body.classList.remove('dark');
                }
                return parsedSettings;
        });
        const [showSettings, setShowSettings] = useState(false);
        const [availableModels, setAvailableModels] = useState<string[]>([]);
        const [isFetchingModels, setIsFetchingModels] = useState(false);
        const [showModelDropdown, setShowModelDropdown] = useState(false);
        const [modelFilter, setModelFilter] = useState<string>('');
        const modelInputRef = useRef<HTMLInputElement>(null);        // Modal State
        const [modalConfig, setModalConfig] = useState<{
                isOpen: boolean;
                title: string;
                message: string;
                onConfirm: () => void;
                isDangerous?: boolean;
        }>({
                isOpen: false,
                title: '',
                message: '',
                onConfirm: () => { },
        });

        // UI State
        const [isChatOpen, setIsChatOpen] = useState(false);
        const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
        const [isAiProcessing, setIsAiProcessing] = useState(false);
        const [showAboutPage, setShowAboutPage] = useState(false);

        // Layout State
        const [isRuleListCollapsed, setRuleListCollapsed] = useState(false);
        const [isConsoleCollapsed, setConsoleCollapsed] = useState(false);
        const [splitPosV, setSplitPosV] = useState(40); // Vertical split percentage (Left/Right)
        const [splitPosH, setSplitPosH] = useState(50); // Horizontal split percentage (List+Input / Rule Editor)
        const [ruleListWidth, setRuleListWidth] = useState(256); // Rule list width in pixels
        const [isResizing, setIsResizing] = useState(false);

        // Mobile State
        const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
        const [mobileTab, setMobileTab] = useState<'rules' | 'source' | 'preview'>('rules');
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

        useEffect(() => {
                const handleResize = () => setIsMobile(window.innerWidth < 768);
                window.addEventListener('resize', handleResize);
                return () => window.removeEventListener('resize', handleResize);
        }, []);

        useEffect(() => {
                if (isMobile) {
                        setRuleListCollapsed(true);
                }
        }, [isMobile]);

        // Dictionary for localization
        const t = {
                title: settings.language === 'zh' ? '正则调试器' : 'Regex Debugger',
                clearAll: settings.language === 'zh' ? '全部清空' : 'Clear All',
                clearConfirm: settings.language === 'zh' ? '确定要清空所有内容吗？规则和源文本将丢失。' : 'Are you sure you want to clear everything? Rules and source text will be lost.',
                restoreDefault: settings.language === 'zh' ? '恢复默认' : 'Reset Default',
                restoreConfirm: settings.language === 'zh' ? '恢复默认示例数据？当前工作将丢失。' : 'Restore default example data? Current work will be lost.',
                import: settings.language === 'zh' ? '导入' : 'Import',
                export: settings.language === 'zh' ? '导出' : 'Export',
                aiAssistant: settings.language === 'zh' ? 'AI 助手' : 'AI Assistant',
                settings: settings.language === 'zh' ? '设置' : 'Settings',
                theme: settings.language === 'zh' ? '切换主题' : 'Toggle Theme',
                lang: settings.language === 'zh' ? '语言 / Lang' : 'Language',
                sourceText: settings.language === 'zh' ? '源文本输入 (Source Text)' : 'Source Text Input',
                ruleName: settings.language === 'zh' ? '规则名称' : 'Rule Name',
                regex: settings.language === 'zh' ? '正则表达式 (Regex)' : 'Regular Expression',
                replace: settings.language === 'zh' ? '替换模板 (HTML)' : 'Replacement Template (HTML)',
                selectRule: settings.language === 'zh' ? '选择左侧规则以编辑逻辑' : 'Select a rule on the left to edit logic',
                saveClose: settings.language === 'zh' ? '保存并关闭' : 'Save & Close',
                apiKeyPlaceholder: 'sk-...',
                apiKeyHelp: settings.language === 'zh' ? '您的 Key 仅存储在本地浏览器中。' : 'Your Key is stored locally in your browser.',
                baseUrlHelp: settings.language === 'zh' ? 'Base URL (可选, 用于反代)' : 'Base URL (Optional, for proxy)',
                toggleLang: settings.language === 'zh' ? '中/En' : 'En/中',
                model: settings.language === 'zh' ? '模型 (Model)' : 'Model',
                modelPlaceholder: 'gemini-2.0-flash-exp',
                fetchModels: settings.language === 'zh' ? '拉取模型' : 'Fetch Models',
                fetching: settings.language === 'zh' ? '拉取中...' : 'Fetching...',
                selectModel: settings.language === 'zh' ? '选择模型' : 'Select Model',
                tabRules: settings.language === 'zh' ? '规则' : 'Rules',
                tabSource: settings.language === 'zh' ? '源文本' : 'Source',
                tabPreview: settings.language === 'zh' ? '预览' : 'Preview',
                menu: settings.language === 'zh' ? '菜单' : 'Menu',
        };

        // --- Effects ---

        // Apply Theme
        useEffect(() => {
                if (settings.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                        document.body.classList.add('dark');
                } else {
                        document.documentElement.classList.remove('dark');
                        document.body.classList.remove('dark');
                }
        }, [settings.theme]);

        useEffect(() => {
                localStorage.setItem('trd_settings', JSON.stringify(settings));
        }, [settings]);

        // Execute Pipeline
        const executePipeline = useCallback(() => {
                const result = runPipeline(sourceText, rules);
                setPipelineResult(result);
        }, [sourceText, rules]);

        useEffect(() => {
                const timer = setTimeout(executePipeline, 500);
                return () => clearTimeout(timer);
        }, [executePipeline]);

        // --- Handlers ---

        const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
                setSettings(prev => ({ ...prev, ...newSettings }));
        };

        const handleClearAll = (e: React.MouseEvent) => {
                e.preventDefault();
                setModalConfig({
                        isOpen: true,
                        title: t.clearAll,
                        message: t.clearConfirm,
                        isDangerous: true,
                        onConfirm: () => {
                                setSourceText("");
                                setRules([]);
                                setActiveRuleId(null);
                        }
                });
        };

        const handleResetDefault = (e: React.MouseEvent) => {
                e.preventDefault();
                setModalConfig({
                        isOpen: true,
                        title: t.restoreDefault,
                        message: t.restoreConfirm,
                        isDangerous: true,
                        onConfirm: () => {
                                setSourceText(DEFAULT_TEXT);
                                setRules(DEFAULT_RULES);
                                setActiveRuleId(DEFAULT_RULES[0]?.id);
                        }
                });
        };

        // Rule CRUD
        const activeRule = rules.find(r => r.id === activeRuleId);

        const handleUpdateRule = (id: string, updates: Partial<RegexRule>) => {
                setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
        };

        const handleAddRule = () => {
                const newRule: RegexRule = {
                        id: `rule-${Date.now()}`,
                        name: settings.language === 'zh' ? '新规则' : 'New Rule',
                        regex: '',
                        replace: '',
                        active: true,
                        order: rules.length
                };
                setRules([...rules, newRule]);
                setActiveRuleId(newRule.id);
        };

        const handleDeleteRule = (id: string) => {
                setRules(prev => prev.filter(r => r.id !== id));
                if (activeRuleId === id) setActiveRuleId(null);
        };

        const handleToggleRule = (id: string) => {
                setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
        };

        const handleReorderRules = (dragIndex: number, hoverIndex: number) => {
                const newRules = [...rules];
                const draggedItem = newRules[dragIndex];
                newRules.splice(dragIndex, 1);
                newRules.splice(hoverIndex, 0, draggedItem);
                const orderedRules = newRules.map((r, i) => ({ ...r, order: i }));
                setRules(orderedRules);
        };

        // Import/Export
        const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                        try {
                                const content = evt.target?.result as string;
                                let parsed: any;
                                try { parsed = JSON.parse(content); } catch { alert("Invalid JSON"); return; }
                                const items: STScriptImport[] = Array.isArray(parsed) ? parsed : [parsed];
                                const importedRules: RegexRule[] = items.map((item, idx) => ({
                                        id: item.id || `imported-${Date.now()}-${idx}`,
                                        name: item.scriptName || `Script ${idx}`,
                                        regex: item.findRegex || '',
                                        replace: item.replaceString || '',
                                        active: !item.disabled,
                                        order: rules.length + idx
                                }));
                                setRules([...rules, ...importedRules]);
                                if (importedRules.length > 0) setActiveRuleId(importedRules[0].id);
                        } catch (err) { alert("Parsing failed"); }
                };
                reader.readAsText(file);
                e.target.value = '';
        };

        const handleExport = () => {
                const exportData: STScriptImport[] = rules.map(r => ({
                        id: r.id,
                        scriptName: r.name,
                        findRegex: r.regex,
                        replaceString: r.replace,
                        disabled: !r.active,
                        runOnEdit: true,
                        placement: [1, 2],
                        trimStrings: [],
                        substituteRegex: 0,
                        markdownOnly: false,
                        promptOnly: false
                }));
                const blob = new Blob([JSON.stringify(exportData, null, 4)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tavern_regex_export.json';
                a.click();
                URL.revokeObjectURL(url);
        };

        // AI
        const handleAiMessage = async (msg: string) => {
                if (!settings.apiKey && !process.env.API_KEY) {
                        setChatMessages(prev => [...prev, { role: 'model', content: settings.language === 'zh' ? "请先点击顶部设置图标设置您的 API Key。" : "Please set your API Key in settings first." }]);
                        return;
                }

                const userMsg: ChatMessage = { role: 'user', content: msg };
                const newHistory = [...chatMessages, userMsg];
                setChatMessages(newHistory);
                setIsAiProcessing(true);

                try {
                        const toolCallbacks = async (name: string, args: any) => {
                                if (name === 'updateRule') {
                                        const { id, ...updates } = args;
                                        const exists = rules.find(r => r.id === id);
                                        if (exists) {
                                                setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
                                                return { status: "updated", id };
                                        } else {
                                                return { status: "error", message: "Rule ID not found" };
                                        }
                                }
                                if (name === 'addRule') {
                                        const newId = `ai-rule-${Date.now()}`;
                                        const newRule: RegexRule = {
                                                id: newId,
                                                name: args.name,
                                                regex: args.regex,
                                                replace: args.replace,
                                                active: true,
                                                order: rules.length
                                        };
                                        setRules(prev => [...prev, newRule]);
                                        setActiveRuleId(newId);
                                        return { status: "created", id: newId };
                                }
                                if (name === 'updateSourceText') {
                                        setSourceText(args.text);
                                        return { status: "updated_text" };
                                }
                                return { status: "unknown_tool" };
                        };

                        const responseText = await sendMessageToAI(newHistory, rules, sourceText, settings, toolCallbacks);
                        setChatMessages(prev => [...prev, { role: 'model', content: responseText }]);
                } catch (e) {
                        setChatMessages(prev => [...prev, { role: 'model', content: settings.language === 'zh' ? "抱歉，思考过程中发生错误。" : "Sorry, an error occurred while thinking." }]);
                } finally {
                        setIsAiProcessing(false);
                }
        };

        const handleFetchModels = async () => {
                if (!settings.apiKey) {
                        setModalConfig({
                                isOpen: true,
                                title: settings.language === 'zh' ? '缺少 API Key' : 'Missing API Key',
                                message: settings.language === 'zh' ? '请先设置您的 API Key。' : 'Please set your API Key first.',
                                onConfirm: () => { },
                                isDangerous: false
                        });
                        return;
                }
                setIsFetchingModels(true);
                try {
                        const models = await fetchAvailableModels(settings);
                        console.log('handleFetchModels models:', models);
                        setAvailableModels(models);
                        if (models.length > 0) {
                                // 如果当前设置的模型未包含在返回的模型里，则将其替换为返回列表的第一个项目
                                const exists = settings.model && models.some(m => m.toLowerCase() === settings.model?.toLowerCase());
                                if (!exists) {
                                        handleUpdateSettings({ model: models[0] });
                                }
                                setShowModelDropdown(true);
                                setTimeout(() => modelInputRef?.current?.focus(), 50);
                        }
                        // 打开下拉并聚焦输入框以便用户能看到模型列表
                        if (models.length > 0) {
                                setShowModelDropdown(true);
                                setTimeout(() => modelInputRef?.current?.focus(), 50);
                        }
                } catch (error: any) {
                        setModalConfig({
                                isOpen: true,
                                title: settings.language === 'zh' ? '拉取模型失败' : 'Failed to Fetch Models',
                                message: settings.language === 'zh'
                                        ? `拉取模型失败: ${error.message || '未知错误'}。请检查 API Key 和 Base URL。`
                                        : `Failed to fetch models: ${error.message || 'Unknown error'}. Check API Key and Base URL.`,
                                onConfirm: () => { },
                                isDangerous: false
                        });
                } finally {
                        setIsFetchingModels(false);
                }
        };        // --- Resizing Logic ---
        const containerRef = useRef<HTMLDivElement>(null);
        const leftPaneRef = useRef<HTMLDivElement>(null);
        const topLeftRef = useRef<HTMLDivElement>(null);

        const handleMouseDownV = (e: React.MouseEvent) => {
                e.preventDefault();
                setIsResizing(true);
                const handleMove = (ev: MouseEvent) => {
                        if (containerRef.current) {
                                const rect = containerRef.current.getBoundingClientRect();
                                const percent = ((ev.clientX - rect.left) / rect.width) * 100;
                                setSplitPosV(Math.min(80, Math.max(20, percent)));
                        }
                };
                const handleUp = () => {
                        setIsResizing(false);
                        window.removeEventListener('mousemove', handleMove);
                        window.removeEventListener('mouseup', handleUp);
                        document.body.style.cursor = 'default';
                };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
                document.body.style.cursor = 'col-resize';
        };

        const handleMouseDownH = (e: React.MouseEvent) => {
                e.preventDefault();
                setIsResizing(true);
                const handleMove = (ev: MouseEvent) => {
                        if (leftPaneRef.current) {
                                const rect = leftPaneRef.current.getBoundingClientRect();
                                const percent = ((ev.clientY - rect.top) / rect.height) * 100;
                                setSplitPosH(Math.min(80, Math.max(20, percent)));
                        }
                };
                const handleUp = () => {
                        setIsResizing(false);
                        window.removeEventListener('mousemove', handleMove);
                        window.removeEventListener('mouseup', handleUp);
                        document.body.style.cursor = 'default';
                };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
                document.body.style.cursor = 'row-resize';
        };

        const handleMouseDownRuleList = (e: React.MouseEvent) => {
                if (isRuleListCollapsed) return; // 折叠时不允许调整
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                const handleMove = (ev: MouseEvent) => {
                        if (topLeftRef.current) {
                                const rect = topLeftRef.current.getBoundingClientRect();
                                const width = ev.clientX - rect.left;
                                setRuleListWidth(Math.min(rect.width - 200, Math.max(200, width)));
                        }
                };
                const handleUp = () => {
                        setIsResizing(false);
                        window.removeEventListener('mousemove', handleMove);
                        window.removeEventListener('mouseup', handleUp);
                        document.body.style.cursor = 'default';
                };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
                document.body.style.cursor = 'col-resize';
        };

        if (showAboutPage) {
                return <AboutPage onBack={() => setShowAboutPage(false)} language={settings.language} />;
        }

        return (
                <div className="flex flex-col h-screen text-text-primary bg-transparent font-sans selection:bg-indigo-500/30">

                        {/* Background Ambience */}
                        <div className="fixed inset-0 z-[-1] bg-neutral-100 dark:bg-neutral-900 pointer-events-none transition-colors duration-500" />

                        {/* Navbar */}
                        <header className="h-14 border-b border-glass-border bg-glass-panel backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-20 shadow-sm transition-colors duration-300">
                                <div className="flex items-center space-x-3 min-w-0">
                                        <div className="p-1.5 bg-neutral-200 dark:bg-white/10 rounded-lg backdrop-blur-sm border border-glass-border shrink-0">
                                                <Layout className="text-text-primary" size={20} />
                                        </div>
                                        <h1 className="font-bold text-base sm:text-lg tracking-tight text-text-primary whitespace-nowrap flex items-center overflow-hidden">
                                                <span className="truncate">{t.title}</span>
                                                <span className="text-xs font-mono font-normal opacity-50 ml-2 hidden sm:inline">v{import.meta.env.VITE_APP_VERSION}</span>
                                        </h1>
                                </div>

                                <div className="flex items-center space-x-2">
                                        <div className="flex items-center bg-glass-surface rounded-lg p-1 border border-glass-border mr-2 shadow-sm h-9 box-border">
                                                <button onClick={handleClearAll} className="h-full w-8 flex items-center justify-center hover:bg-red-500/10 text-text-primary hover:text-red-500 rounded transition-colors" title={t.clearAll}>
                                                        <Trash2 size={16} />
                                                </button>
                                                <button onClick={handleResetDefault} className="h-full w-8 flex items-center justify-center hover:bg-glass-highlight text-text-primary rounded transition-colors" title={t.restoreDefault}>
                                                        <RotateCcw size={16} />
                                                </button>
                                        </div>

                                        <div className="flex space-x-2 mr-4">
                                                {/* Icons Swapped: Import uses Download icon (Into App), Export uses Upload icon (Out of App) to match user request */}
                                                <label className={`cursor-pointer glass-button hover:bg-glass-highlight text-text-primary h-9 rounded-md text-sm flex items-center justify-center transition-colors shadow-sm ${isMobile ? 'w-9 px-0' : 'px-3'}`}>
                                                        <Download size={14} className={isMobile ? "" : "mr-2"} /> {!isMobile && t.import}
                                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                                </label>
                                                <Button variant="secondary" size="sm" onClick={handleExport} icon={!isMobile ? <Upload size={14} /> : undefined} className={`glass-button bg-glass-surface border-glass-border text-text-primary hover:text-text-primary hover:bg-glass-highlight shadow-sm h-9 ${isMobile ? 'w-9 px-0 flex items-center justify-center' : ''}`}>
                                                        {isMobile ? <Upload size={14} /> : t.export}
                                                </Button>
                                        </div>

                                        <button
                                                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${isChatOpen ? 'bg-black/5 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 border border-glass-border shadow-inner' : 'text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight'}`}
                                                onClick={() => setIsChatOpen(!isChatOpen)}
                                                title={t.aiAssistant}
                                        >
                                                <Sparkles size={18} />
                                        </button>

                                        {!isMobile ? (
                                                <>
                                                        <button
                                                                className="h-9 w-9 flex items-center justify-center text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded-lg transition-colors"
                                                                onClick={() => setShowSettings(true)}
                                                                title={t.settings}
                                                        >
                                                                <Settings size={18} />
                                                        </button>

                                                        <button
                                                                className="h-9 w-9 flex items-center justify-center text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded-lg transition-colors"
                                                                onClick={() => setShowAboutPage(true)}
                                                                title={settings.language === 'zh' ? '关于' : 'About'}
                                                        >
                                                                <Info size={18} />
                                                        </button>

                                                        <button
                                                                className="h-9 w-9 flex items-center justify-center text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded-lg transition-colors"
                                                                onClick={() => handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                                                                title={t.theme}
                                                        >
                                                                {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                                        </button>

                                                        <button
                                                                className="h-9 px-3 flex items-center justify-center text-xs font-bold text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded border border-transparent hover:border-glass-border transition-all"
                                                                onClick={() => handleUpdateSettings({ language: settings.language === 'zh' ? 'en' : 'zh' })}
                                                                title={t.lang}
                                                        >
                                                                {t.toggleLang}
                                                        </button>
                                                </>
                                        ) : (
                                                <div className="relative">
                                                        <button
                                                                className="h-9 w-9 flex items-center justify-center text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded-lg transition-colors"
                                                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                                                title={t.menu}
                                                        >
                                                                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                                                        </button>
                                                        {isMobileMenuOpen && (
                                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-glass-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                                        <button
                                                                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-glass-highlight flex items-center"
                                                                                onClick={() => { setShowSettings(true); setIsMobileMenuOpen(false); }}
                                                                        >
                                                                                <Settings size={16} className="mr-2" /> {t.settings}
                                                                        </button>
                                                                        <button
                                                                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-glass-highlight flex items-center"
                                                                                onClick={() => { setShowAboutPage(true); setIsMobileMenuOpen(false); }}
                                                                        >
                                                                                <Info size={16} className="mr-2" /> {settings.language === 'zh' ? '关于' : 'About'}
                                                                        </button>
                                                                        <button
                                                                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-glass-highlight flex items-center"
                                                                                onClick={() => { handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }); setIsMobileMenuOpen(false); }}
                                                                        >
                                                                                {settings.theme === 'dark' ? <Sun size={16} className="mr-2" /> : <Moon size={16} className="mr-2" />} {t.theme}
                                                                        </button>
                                                                        <button
                                                                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-glass-highlight flex items-center"
                                                                                onClick={() => { handleUpdateSettings({ language: settings.language === 'zh' ? 'en' : 'zh' }); setIsMobileMenuOpen(false); }}
                                                                        >
                                                                                <Globe size={16} className="mr-2" /> {t.lang}
                                                                        </button>
                                                                </div>
                                                        )}
                                                </div>
                                        )}
                                </div>
                        </header>

                        {/* Main Content */}
                        <div className={`flex-1 flex overflow-hidden relative ${isMobile ? 'flex-col' : ''}`} ref={containerRef}>

                                {/* LEFT PANE */}
                                <div
                                        style={!isMobile ? { width: `${splitPosV}%` } : { width: '100%', display: mobileTab === 'preview' ? 'none' : 'flex', flex: 1 }}
                                        className={`flex ${isMobile && mobileTab === 'rules' ? 'flex-row' : 'flex-col'} relative min-w-0`}
                                        ref={leftPaneRef}
                                >

                                        {/* TOP LEFT (List + Source) */}
                                        <div
                                                style={!isMobile ? { height: `${splitPosH}%` } : { flex: mobileTab === 'rules' ? 'none' : 1, width: mobileTab === 'rules' ? 'auto' : '100%', display: mobileTab === 'rules' || mobileTab === 'source' ? 'flex' : 'none' }}
                                                className="flex relative min-h-0 overflow-hidden"
                                                ref={topLeftRef}
                                        >
                                                {/* Rule List */}
                                                <div
                                                        style={{ width: isRuleListCollapsed ? '48px' : `${ruleListWidth}px`, display: isMobile && mobileTab === 'source' ? 'none' : 'block' }}
                                                        className="shrink-0 h-full transition-all duration-300 ease-in-out border-r border-glass-border"
                                                >
                                                        <RuleList
                                                                rules={rules}
                                                                activeRuleId={activeRuleId}
                                                                onSelect={setActiveRuleId}
                                                                onToggle={handleToggleRule}
                                                                onDelete={handleDeleteRule}
                                                                onAdd={handleAddRule}
                                                                onReorder={handleReorderRules}
                                                                isCollapsed={isRuleListCollapsed}
                                                                onToggleCollapse={() => setRuleListCollapsed(!isRuleListCollapsed)}
                                                        />
                                                </div>

                                                {/* Rule List Resizer - 规则列表和源文本之间的分隔符 */}
                                                {!isRuleListCollapsed && !isMobile && (
                                                        <div
                                                                className="w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-10 shrink-0"
                                                                onMouseDown={handleMouseDownRuleList}
                                                        />
                                                )}

                                                {/* Source Text */}
                                                <div
                                                        style={{ display: isMobile && mobileTab === 'rules' ? 'none' : 'flex' }}
                                                        className="flex-1 flex flex-col bg-transparent glass-panel rounded-none border-t-0 border-b-0 border-l-0 min-w-0"
                                                >
                                                        <div className="bg-glass-surface px-3 py-1.5 text-xs text-text-primary/60 font-mono border-b border-glass-border font-bold flex justify-between items-center">
                                                                <span>{t.sourceText}</span>
                                                                <span className="text-[10px] opacity-50">RAW INPUT</span>
                                                        </div>
                                                        <div className="flex-1 relative p-0 bg-white dark:bg-neutral-900 overflow-hidden transition-colors min-w-0">
                                                                <CodeEditor
                                                                        language="text"
                                                                        value={sourceText}
                                                                        onChange={setSourceText}
                                                                />
                                                        </div>
                                                </div>

                                                {/* Resizer Handle Horizontal (Inside Left Pane) */}
                                                {!isMobile && <div className="absolute bottom-0 left-0 right-0 h-1 z-10 cursor-row-resize hover:bg-indigo-500/50" onMouseDown={handleMouseDownH} />}
                                        </div>

                                        {/* BOTTOM LEFT (Editor) */}
                                        <div
                                                style={!isMobile ? { height: `${100 - splitPosH}%` } : { flex: 1, display: mobileTab === 'rules' ? 'flex' : 'none' }}
                                                className="flex flex-col border-t border-glass-border dark:bg-glass-surface/30 relative"
                                        >
                                                {activeRule ? (
                                                        <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
                                                                <div className="flex space-x-3 items-end">
                                                                        <div className="w-1/3">
                                                                                <label className="block text-[10px] font-bold text-text-primary/60 mb-1 uppercase tracking-wider">{t.ruleName}</label>
                                                                                <input
                                                                                        type="text"
                                                                                        className="w-full bg-white dark:bg-glass-surface border border-neutral-300 dark:border-glass-border rounded px-3 py-2 text-sm text-text-primary focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                                                                        value={activeRule.name}
                                                                                        onChange={(e) => handleUpdateRule(activeRule.id, { name: e.target.value })}
                                                                                />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                                <label className="block text-[10px] font-bold text-indigo-600/80 dark:text-indigo-400/80 mb-1 uppercase tracking-wider">{t.regex}</label>
                                                                                <input
                                                                                        type="text"
                                                                                        className="w-full bg-white dark:bg-glass-surface border border-neutral-300 dark:border-glass-border rounded px-3 py-2 text-sm font-mono text-indigo-600 dark:text-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                                                                        value={activeRule.regex}
                                                                                        onChange={(e) => handleUpdateRule(activeRule.id, { regex: e.target.value })}
                                                                                />
                                                                        </div>
                                                                </div>

                                                                <div className="flex-1 flex flex-col min-h-0">
                                                                        <label className="block text-[10px] font-bold text-green-700/80 dark:text-green-400/80 mb-1 uppercase tracking-wider">{t.replace}</label>
                                                                        <div className="flex-1 min-h-0 relative border border-neutral-300 dark:border-glass-border rounded-lg overflow-hidden shadow-sm">
                                                                                <CodeEditor
                                                                                        language="html"
                                                                                        value={activeRule.replace}
                                                                                        onChange={(val) => handleUpdateRule(activeRule.id, { replace: val })}
                                                                                />
                                                                        </div>
                                                                </div>
                                                        </div>
                                                ) : (
                                                        <div className="flex items-center justify-center h-full text-text-primary/40 text-sm italic">
                                                                {t.selectRule}
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                {/* Resizer Handle Vertical (Main Split) */}
                                {!isMobile && (
                                        <div className="w-1 bg-transparent hover:bg-indigo-500/50 cursor-col-resize z-20 absolute top-0 bottom-0"
                                                style={{ left: `${splitPosV}%` }}
                                                onMouseDown={handleMouseDownV}
                                        />
                                )}

                                {/* RIGHT PANE */}
                                <div
                                        style={!isMobile ? { width: `${100 - splitPosV}%` } : { width: '100%', display: mobileTab === 'preview' ? 'flex' : 'none', flex: 1 }}
                                        className="flex flex-col relative min-w-0 border-l border-glass-border"
                                >
                                        <div className="relative flex-1 flex flex-col overflow-hidden">
                                                <PreviewPane
                                                        htmlContent={pipelineResult.finalHtml}
                                                        logs={pipelineResult.logs}
                                                        isConsoleCollapsed={isConsoleCollapsed}
                                                        onToggleConsole={() => setConsoleCollapsed(!isConsoleCollapsed)}
                                                        language={settings.language}
                                                />
                                                {isResizing && <div className="absolute inset-0 z-50 bg-transparent" />}
                                        </div>
                                </div>

                                {/* Mobile Tab Bar */}
                                {isMobile && (
                                        <div className="min-h-[3.5rem] h-auto bg-white dark:bg-neutral-900 border-t border-glass-border flex shrink-0 z-50 justify-around items-center pb-[env(safe-area-inset-bottom)]">
                                                <button
                                                        onClick={() => setMobileTab('rules')}
                                                        className={`flex flex-col items-center justify-center w-full py-2 ${mobileTab === 'rules' ? 'text-indigo-500' : 'text-text-primary/50'}`}
                                                >
                                                        <List size={20} />
                                                        <span className="text-[10px] mt-1">{t.tabRules}</span>
                                                </button>
                                                <button
                                                        onClick={() => setMobileTab('source')}
                                                        className={`flex flex-col items-center justify-center w-full py-2 ${mobileTab === 'source' ? 'text-indigo-500' : 'text-text-primary/50'}`}
                                                >
                                                        <Edit3 size={20} />
                                                        <span className="text-[10px] mt-1">{t.tabSource}</span>
                                                </button>
                                                <button
                                                        onClick={() => setMobileTab('preview')}
                                                        className={`flex flex-col items-center justify-center w-full py-2 ${mobileTab === 'preview' ? 'text-indigo-500' : 'text-text-primary/50'}`}
                                                >
                                                        <Eye size={20} />
                                                        <span className="text-[10px] mt-1">{t.tabPreview}</span>
                                                </button>
                                        </div>
                                )}

                                {/* Chat Panel - Global Overlay */}
                                <ChatPanel
                                        isOpen={isChatOpen}
                                        onClose={() => setIsChatOpen(false)}
                                        messages={chatMessages}
                                        onSendMessage={handleAiMessage}
                                        onClearMessages={() => setChatMessages([])}
                                        isProcessing={isAiProcessing}
                                        language={settings.language}
                                        isMobile={isMobile}
                                />

                        </div>

                        {/* Settings Modal */}
                        {showSettings && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <div className="glass-panel bg-white dark:bg-neutral-900 w-[90%] max-w-md p-6 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 border border-glass-border">
                                                <h2 className="text-lg font-bold mb-4 flex items-center text-text-primary"><Settings className="mr-2" size={20} />{t.settings}</h2>

                                                <div className="space-y-4">
                                                        <div>
                                                                <label className="block text-xs font-bold text-text-primary/70 mb-1">Gemini API Key</label>
                                                                <input
                                                                        type="password"
                                                                        value={settings.apiKey}
                                                                        onChange={(e) => handleUpdateSettings({ apiKey: e.target.value })}
                                                                        placeholder={t.apiKeyPlaceholder}
                                                                        className="w-full bg-neutral-100 dark:bg-black/20 border border-neutral-300 dark:border-glass-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                                                                />
                                                                <p className="text-[10px] text-text-primary/50 mt-1">{t.apiKeyHelp}</p>
                                                        </div>
                                                        <div>
                                                                <label className="block text-xs font-bold text-text-primary/70 mb-1">{t.baseUrlHelp}</label>
                                                                <input
                                                                        type="text"
                                                                        value={settings.baseUrl}
                                                                        onChange={(e) => handleUpdateSettings({ baseUrl: e.target.value })}
                                                                        placeholder="https://generativelanguage.googleapis.com"
                                                                        className="w-full bg-neutral-100 dark:bg-black/20 border border-neutral-300 dark:border-glass-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                                                                />
                                                        </div>
                                                        <div>
                                                                <label className="block text-xs font-bold text-text-primary/70 mb-1">{t.model}</label>
                                                                <div className="flex space-x-2">
                                                                        <div className="relative flex-1">
                                                                                <input
                                                                                        ref={modelInputRef}
                                                                                        type="text"
                                                                                        value={modelFilter.trim().length > 0 ? modelFilter : (settings.model || '')}
                                                                                        onChange={(e) => setModelFilter(e.target.value)}
                                                                                        onFocus={() => { setModelFilter(''); setShowModelDropdown(true); }}
                                                                                        onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                                                                                        placeholder={t.modelPlaceholder}
                                                                                        className="w-full bg-neutral-100 dark:bg-black/20 border border-neutral-300 dark:border-glass-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                                                                                />
                                                                                {showModelDropdown && (
                                                                                        <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-glass-border rounded shadow-lg max-h-60 overflow-y-auto">
                                                                                                {(() => {
                                                                                                        const filterTerm = (modelFilter || '').toLowerCase();
                                                                                                        const filtered = filterTerm.length === 0 ? availableModels : availableModels.filter(m => m.toLowerCase().includes(filterTerm));
                                                                                                        if (filtered.length === 0) {
                                                                                                                return (
                                                                                                                        <div className="px-3 py-2 text-sm text-text-primary/60">{settings.language === 'zh' ? '未找到匹配的模型' : 'No matching models'}</div>
                                                                                                                );
                                                                                                        }

                                                                                                        return filtered.map(m => (
                                                                                                                <div
                                                                                                                        key={m}
                                                                                                                        onMouseDown={(e) => {
                                                                                                                                e.preventDefault();
                                                                                                                                handleUpdateSettings({ model: m });
                                                                                                                                setModelFilter('');
                                                                                                                                setShowModelDropdown(false);
                                                                                                                        }}
                                                                                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-text-primary"
                                                                                                                >
                                                                                                                        {m}
                                                                                                                </div>
                                                                                                        ));
                                                                                                })()}
                                                                                        </div>
                                                                                )}
                                                                        </div>
                                                                        <Button
                                                                                onClick={handleFetchModels}
                                                                                disabled={isFetchingModels}
                                                                                variant="secondary"
                                                                                className="whitespace-nowrap"
                                                                        >
                                                                                {isFetchingModels ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                                                                <span className="ml-2">{isFetchingModels ? t.fetching : t.fetchModels}</span>
                                                                        </Button>
                                                                </div>
                                                        </div>
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                        <Button onClick={() => setShowSettings(false)}>{t.saveClose}</Button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        <ConfirmationModal
                                isOpen={modalConfig.isOpen}
                                title={modalConfig.title}
                                message={modalConfig.message}
                                onConfirm={modalConfig.onConfirm}
                                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                                isDangerous={modalConfig.isDangerous}
                        />

                </div>
        );
}

const AboutPage = ({ onBack, language }: { onBack: () => void; language: string }) => {
        return (
                <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-900 text-text-primary font-sans">
                        <header className="h-14 border-b border-glass-border bg-glass-panel backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
                                <div className="flex items-center space-x-3">
                                        <div className="p-1.5 bg-neutral-200 dark:bg-white/10 rounded-lg backdrop-blur-sm border border-glass-border">
                                                <Info className="text-text-primary" size={20} />
                                        </div>
                                        <h1 className="font-bold text-lg tracking-tight text-text-primary">
                                                {language === 'zh' ? '关于' : 'About'}
                                        </h1>
                                </div>
                                <button
                                        onClick={onBack}
                                        className="px-3 py-1.5 bg-glass-surface border border-glass-border rounded-md text-sm text-text-primary hover:bg-glass-highlight transition-colors"
                                >
                                        {language === 'zh' ? '返回' : 'Back'}
                                </button>
                        </header>
                        <div className="flex-1 p-6 overflow-auto">
                                <div className="max-w-4xl mx-auto space-y-8">
                                        <section>
                                                <h2 className="text-2xl font-bold mb-4 text-text-primary">
                                                        {language === 'zh' ? '常见问题 (FAQ)' : 'Frequently Asked Questions (FAQ)'}
                                                </h2>
                                                <div className="space-y-4">
                                                        <div>
                                                                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                                                                        {language === 'zh' ? '什么是正则调试器？' : 'What is Regex Debugger?'}
                                                                </h3>
                                                                <p className="text-text-primary/80">
                                                                        {language === 'zh'
                                                                                ? '正则调试器是一个用于测试和调试正则表达式的工具，帮助开发者快速验证和优化正则表达式。'
                                                                                : 'Regex Debugger is a tool for testing and debugging regular expressions, helping developers quickly validate and optimize regex patterns.'}
                                                                </p>
                                                        </div>
                                                        <div>
                                                                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                                                                        {language === 'zh' ? '如何使用？' : 'How to use it?'}
                                                                </h3>
                                                                <p className="text-text-primary/80">
                                                                        {language === 'zh'
                                                                                ? '在左侧添加规则，输入正则表达式和替换模板，然后在源文本中输入测试内容，右侧会实时显示处理结果。'
                                                                                : 'Add rules on the left, enter regex and replacement template, then input test content in source text, and the processed result will be displayed in real-time on the right.'}
                                                                </p>
                                                        </div>
                                                        <div>
                                                                <h3 className="text-lg font-semibold mb-2 text-text-primary">
                                                                        {language === 'zh' ? 'AI 助手有什么用？' : 'What is the AI Assistant for?'}
                                                                </h3>
                                                                <p className="text-text-primary/80">
                                                                        {language === 'zh'
                                                                                ? 'AI 助手可以提供正则表达式的解释、优化建议和调试帮助。'
                                                                                : 'The AI Assistant can provide explanations, optimization suggestions, and debugging help for regular expressions.'}
                                                                </p>
                                                        </div>
                                                </div>
                                        </section>
                                        <section>
                                                <h2 className="text-2xl font-bold mb-4 text-text-primary">
                                                        {language === 'zh' ? '更新日志 (Changelog)' : 'Changelog'}
                                                </h2>
                                                <div className="space-y-4">
                                                        <div>
                                                                <h3 className="text-lg font-semibold mb-2 text-text-primary">v1.1 - 2025/11/23</h3>
                                                                <ul className="list-disc list-inside text-text-primary/80 space-y-1">
                                                                        <li>{language === 'zh' ? '修复刷新页面时主题闪烁问题，现在直接应用保存的主题模式' : 'Fixed theme flickering on page refresh, now directly applies saved theme mode'}</li>
                                                                        <li>{language === 'zh' ? '改进移动设备上的布局和交互体验' : 'Improved layout and interaction experience on mobile devices'}</li>
                                                                        <li>{language === 'zh' ? '优化代码编辑器的字体大小和行间距' : 'Optimized font size and line spacing in the code editor'}</li>
                                                                        <li>{language === 'zh' ? '更新依赖包以提升性能和安全性' : 'Updated dependencies for better performance and security'}</li>
                                                                        <li>{language === 'zh' ? '改进空源处理' : ' Improved empty source handling'}</li>
                                                                </ul>
                                                        </div>
                                                        <div>
                                                                <h3 className="text-lg font-semibold mb-2 text-text-primary">v1.0</h3>
                                                                <ul className="list-disc list-inside text-text-primary/80 space-y-1">
                                                                        <li>{language === 'zh' ? '初始版本发布' : 'Initial release'}</li>
                                                                        <li>{language === 'zh' ? '支持正则表达式规则管理' : 'Support for regex rule management'}</li>
                                                                        <li>{language === 'zh' ? '实时预览和调试' : 'Real-time preview and debugging'}</li>
                                                                        <li>{language === 'zh' ? 'AI 助手集成' : 'AI Assistant integration'}</li>
                                                                        <li>{language === 'zh' ? '深色/浅色主题切换' : 'Dark/Light theme toggle'}</li>
                                                                        <li>{language === 'zh' ? '中英文界面切换' : 'Chinese/English interface toggle'}</li>
                                                                </ul>
                                                        </div>
                                                </div>
                                        </section>
                                </div>
                        </div>
                        <footer className="p-4 border-t border-glass-border bg-glass-panel backdrop-blur-md">
                                <div className="text-center text-text-primary/60">
                                        <p className="mb-2">
                                                {language === 'zh' ? '开发者 / Developer' : 'Developer'}:
                                                <a
                                                        href="https://github.com/il057"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                                                >
                                                        il057
                                                </a>
                                        </p>
                                        <p className="text-sm">
                                                {language === 'zh' ? '项目仓库' : 'Project Repository'}:
                                                <a
                                                        href="https://github.com/il057/ST_debugger"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                                                >
                                                        GitHub
                                                </a>
                                        </p>
                                </div>
                        </footer>
                </div>
        );
};

export default App;