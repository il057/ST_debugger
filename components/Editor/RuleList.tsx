import React from 'react';
import { RegexRule } from '../../types';
import { Trash2, Eye, EyeOff, Plus, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

interface RuleListProps {
  rules: RegexRule[];
  activeRuleId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const RuleList: React.FC<RuleListProps> = ({ 
  rules, activeRuleId, onSelect, onToggle, onDelete, onAdd, onReorder, isCollapsed, onToggleCollapse
}) => {
  
  const moveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 0) onReorder(index, index - 1);
  };

  const moveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < rules.length - 1) onReorder(index, index + 1);
  };

  return (
    <div className={`flex flex-col h-full glass-panel border-r-0 border-l-0 border-t-0 rounded-none bg-transparent ${isCollapsed ? 'items-center' : ''}`}>
      {/* Header */}
      <div 
        className={`p-3 border-b border-glass-border flex items-center bg-glass-surface cursor-pointer select-none ${isCollapsed ? 'justify-center w-full' : 'justify-between'}`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center space-x-2">
             {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
             {!isCollapsed && <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider opacity-80">管道 (Pipeline)</h3>}
        </div>
        
        {!isCollapsed && (
            <button 
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="p-1 hover:bg-glass-highlight rounded text-text-primary transition-colors glass-button"
            title="添加规则"
            >
            <Plus size={14} />
            </button>
        )}
      </div>
      
      {/* List */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'w-full px-1 py-2 space-y-2' : 'p-2 space-y-2'}`}>
        {rules.map((rule, index) => (
          <div 
            key={rule.id}
            onClick={() => onSelect(rule.id)}
            className={`
              group relative flex items-center rounded-lg border cursor-pointer transition-all duration-200
              ${isCollapsed ? 'justify-center p-2' : 'p-2'}
              ${activeRuleId === rule.id 
                ? 'bg-black/10 dark:bg-white/10 border-text-primary/30 shadow-sm' 
                : 'bg-transparent border-transparent hover:bg-glass-highlight hover:border-glass-border'}
              ${!rule.active ? 'opacity-50 grayscale' : ''}
            `}
            title={isCollapsed ? rule.name : ''}
          >
            {isCollapsed ? (
                // Collapsed View: Just index or status indicator
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold font-mono opacity-60">{index + 1}</span>
                    <div className={`w-2 h-2 rounded-full mt-1 ${rule.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
            ) : (
                // Expanded View
                <>
                    {/* Reorder Controls */}
                    <div className="mr-2 text-text-primary/40 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div onClick={(e) => moveUp(e, index)} className="hover:text-text-primary hover:bg-glass-highlight rounded cursor-pointer p-0.5"><div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-current"></div></div>
                        <div onClick={(e) => moveDown(e, index)} className="hover:text-text-primary hover:bg-glass-highlight rounded cursor-pointer p-0.5"><div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-current"></div></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary truncate pr-2">{rule.name}</span>
                    </div>
                    <div className="text-[10px] text-text-primary/60 truncate font-mono mt-0.5">
                        {rule.regex || 'Empty Regex'}
                    </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggle(rule.id); }}
                        className={`p-1.5 rounded hover:bg-glass-highlight transition-colors ${rule.active ? 'text-text-primary' : 'text-text-primary/50'}`}
                    >
                        {rule.active ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(rule.id); }}
                        className="p-1.5 rounded hover:bg-red-500/20 text-text-primary/50 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                    </div>
                </>
            )}
          </div>
        ))}
        
        {rules.length === 0 && !isCollapsed && (
          <div className="text-center py-8 text-text-primary/40 text-xs">
            暂无规则 <br/> 点击 + 开始
          </div>
        )}
        
        {isCollapsed && (
             <button 
                onClick={onAdd}
                className="w-full p-2 flex justify-center text-text-primary/60 hover:text-text-primary hover:bg-glass-highlight rounded"
             >
                 <Plus size={16} />
             </button>
        )}
      </div>
    </div>
  );
};