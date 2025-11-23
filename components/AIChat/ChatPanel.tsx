import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Move, Trash2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { ChatMessage } from '../../services/aiApiService';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
        isOpen: boolean;
        onClose: () => void;
        messages: ChatMessage[];
        onSendMessage: (msg: string) => Promise<void>;
        onClearMessages: () => void;
        isProcessing: boolean;
        language: 'zh' | 'en';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
        isOpen, onClose, messages, onSendMessage, onClearMessages, isProcessing, language
}) => {
        const [input, setInput] = useState('');
        const scrollRef = useRef<HTMLDivElement>(null);

        // Dragging state - Default to bottom rightish
        const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
        const [isDragging, setIsDragging] = useState(false);
        const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
        const panelRef = useRef<HTMLDivElement>(null);

        // Reset position if out of bounds on resize or init
        useEffect(() => {
                const maxX = window.innerWidth - 384; // 96 * 4 (w-96)
                const maxY = window.innerHeight - 600;
                if (position.x > maxX || position.y > maxY) {
                        setPosition({
                                x: Math.max(20, window.innerWidth - 420),
                                y: Math.max(80, window.innerHeight - 650)
                        });
                }
        }, [window.innerWidth, window.innerHeight]);

        useEffect(() => {
                if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
        }, [messages, isOpen]);

        const handleSubmit = (e: React.FormEvent) => {
                e.preventDefault();
                if (!input.trim() || isProcessing) return;
                onSendMessage(input);
                setInput('');
        };

        const handleMouseDown = (e: React.MouseEvent) => {
                if (panelRef.current) {
                        setIsDragging(true);
                        const rect = panelRef.current.getBoundingClientRect();
                        setDragOffset({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top
                        });
                }
        };

        const handleMouseMove = (e: MouseEvent) => {
                if (isDragging) {
                        const newX = e.clientX - dragOffset.x;
                        const newY = e.clientY - dragOffset.y;

                        // Basic bounds checking
                        const maxX = window.innerWidth - 100;
                        const maxY = window.innerHeight - 100;

                        setPosition({
                                x: Math.max(-50, Math.min(newX, maxX)),
                                y: Math.max(0, Math.min(newY, maxY))
                        });
                }
        };

        const handleMouseUp = () => {
                setIsDragging(false);
        };

        useEffect(() => {
                if (isDragging) {
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                } else {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                }
                return () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                };
        }, [isDragging]);

        if (!isOpen) return null;

        const t = {
                title: language === 'zh' ? 'AI 助手' : 'AI Assistant',
                placeholder: language === 'zh' ? '告诉 AI 您想修改什么...' : 'How can I help you modify the regex?',
                intro1: language === 'zh' ? '已连接到您的规则库。' : 'Connected to your rule library.',
                intro2: language === 'zh' ? '我可以帮您修复正则、编写 HTML 模板或调试管道问题。' : 'I can help fix regex, write HTML templates, or debug pipeline issues.',
                thinking: language === 'zh' ? '思考中...' : 'Thinking...',
                clearMessages: language === 'zh' ? '清空消息' : 'Clear Messages',
        };

        return (
                <div
                        ref={panelRef}
                        style={{
                                left: position.x,
                                top: position.y,
                                zIndex: 100
                        }}
                        className="fixed w-96 flex flex-col h-[600px] shadow-2xl rounded-xl overflow-hidden glass-panel border border-glass-border"
                >
                        {/* Header (Draggable) */}
                        <div
                                className="p-3 border-b border-glass-border flex justify-between items-center bg-glass-highlight cursor-move select-none backdrop-blur-md"
                                onMouseDown={handleMouseDown}
                        >
                                <div className="flex items-center space-x-2 text-text-primary">
                                        <Sparkles size={16} className="text-indigo-500" />
                                        <h2 className="font-semibold text-sm">{t.title}</h2>
                                </div>
                                <div className="flex items-center space-x-2">
                                        <Move size={14} className="text-text-primary/40" />
                                        {messages.length > 0 && (
                                                <button 
                                                        onClick={(e) => { e.stopPropagation(); onClearMessages(); }}
                                                        className="text-text-primary/60 hover:text-red-500 transition-colors"
                                                        title={t.clearMessages}
                                                >
                                                        <Trash2 size={16} />
                                                </button>
                                        )}
                                        <button onClick={onClose} className="text-text-primary/60 hover:text-text-primary transition-colors">
                                                <X size={18} />
                                        </button>
                                </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/5 dark:bg-black/20" ref={scrollRef}>
                                {messages.length === 0 && (
                                        <div className="text-center text-text-primary/50 mt-10 text-xs">
                                                <p>{t.intro1}</p>
                                                <p className="mt-2">{t.intro2}</p>
                                        </div>
                                )}

                                {messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm shadow-sm ${msg.role === 'user'
                                                                        ? 'bg-neutral-800 text-white dark:bg-neutral-700'
                                                                        : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-glass-border'
                                                                } break-words whitespace-pre-wrap overflow-hidden`}
                                                >
                                                        {msg.role === 'model' ? (
                                                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                                </div>
                                                        ) : (
                                                                msg.content
                                                        )}
                                                </div>
                                        </div>
                                ))}

                                {isProcessing && (
                                        <div className="flex justify-start">
                                                <div className="bg-white/50 dark:bg-white/5 rounded-lg px-4 py-2 text-xs border border-glass-border flex items-center space-x-2">
                                                        <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                                        <span className="text-text-primary/50 italic">{t.thinking}</span>
                                                </div>
                                        </div>
                                )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-glass-border bg-glass-surface">
                                <form onSubmit={handleSubmit} className="flex space-x-2">
                                        <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder={t.placeholder}
                                                className="flex-1 bg-white/50 dark:bg-black/20 border border-glass-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-primary/30 focus:outline-none focus:border-indigo-500 transition-colors"
                                                disabled={isProcessing}
                                        />
                                        <Button type="submit" variant="primary" size="sm" disabled={isProcessing}>
                                                <Send size={16} />
                                        </Button>
                                </form>
                        </div>
                </div>
        );
};