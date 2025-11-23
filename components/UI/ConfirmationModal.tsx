import React from 'react';
import { Button } from '../UI/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
        isOpen: boolean;
        onClose: () => void;
        onConfirm: () => void;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
        isOpen,
        onClose,
        onConfirm,
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        isDangerous = false,
}) => {
        if (!isOpen) return null;

        return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="glass-panel bg-white dark:bg-neutral-900 w-96 p-6 rounded-xl shadow-2xl border border-glass-border transform transition-all scale-100">
                                <div className="flex items-center mb-4 text-text-primary">
                                        {isDangerous && <AlertTriangle className="text-red-500 mr-3" size={24} />}
                                        <h3 className="text-lg font-bold">{title}</h3>
                                </div>

                                <p className="text-sm text-text-primary/80 mb-6 leading-relaxed">
                                        {message}
                                </p>

                                <div className="flex justify-end space-x-3">
                                        <button
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm text-text-primary/70 hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                                {cancelText}
                                        </button>
                                        <Button
                                                onClick={() => {
                                                        onConfirm();
                                                        onClose();
                                                }}
                                                variant={isDangerous ? 'danger' : 'primary'}
                                                className={isDangerous ? 'bg-red-500 hover:bg-red-600 text-white border-none' : ''}
                                        >
                                                {confirmText}
                                        </Button>
                                </div>
                        </div>
                </div>
        );
};
