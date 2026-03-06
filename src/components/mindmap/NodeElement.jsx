import React, { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const colorSchemes = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  rose: "bg-rose-50 border-rose-200 text-rose-900",
  violet: "bg-violet-50 border-violet-200 text-violet-900",
  sky: "bg-sky-50 border-sky-200 text-sky-900",
  slate: "bg-slate-800 border-slate-600 text-white",
};

const dotColors = {
  indigo: "bg-indigo-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  sky: "bg-sky-400",
  slate: "bg-white",
};

const selectedRing = {
  indigo: "ring-indigo-400",
  emerald: "ring-emerald-400",
  amber: "ring-amber-400",
  rose: "ring-rose-400",
  violet: "ring-violet-400",
  sky: "ring-sky-400",
  slate: "ring-white",
};

export default function NodeElement({
  node,
  childCount,
  isRoot,
  isSelected,
  onSelect,
  onToggleCollapse,
  onDragStart,
  onRename,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const inputRef = useRef(null);
  const color = node.color || "slate";

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.label) {
      onRename(node, trimmed);
    } else {
      setEditValue(node.label);
    }
    setIsEditing(false);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleMouseDown = (e) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect(node);
    onDragStart(e, node);
  };

  const handleClick = (e) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect(node);
  };

  return (
    <div
      className="absolute"
      style={{
        left: node.x,
        top: node.y,
        transform: "translate(-50%, -50%)",
        zIndex: isSelected ? 50 : 10,
      }}
    >
      <div
        className={cn(
          "relative rounded-2xl border-2 px-5 py-3 transition-all duration-150",
          "hover:shadow-lg",
          colorSchemes[color] || colorSchemes.slate,
          isRoot && "px-7 py-4",
          isSelected && `ring-2 ring-offset-2 shadow-lg ${selectedRing[color] || selectedRing.slate}`,
          !isEditing && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center gap-2">
          {childCount > 0 && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node);
              }}
              className="p-0.5 rounded-md hover:bg-black/10 transition-colors flex-shrink-0"
            >
              {node.collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {childCount === 0 && !isEditing && (
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColors[color] || dotColors.slate)} />
          )}

          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setEditValue(node.label); setIsEditing(false); }
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-transparent outline-none border-b border-current min-w-[60px] max-w-[200px]",
                "text-sm font-medium whitespace-nowrap",
                isRoot && "text-base font-bold"
              )}
              style={{ width: `${Math.max(editValue.length, 4)}ch` }}
            />
          ) : (
            <span className={cn("whitespace-nowrap select-none", isRoot ? "text-base font-bold" : "text-sm font-medium")}>
              {node.label}
            </span>
          )}

          {childCount > 0 && node.collapsed && !isEditing && (
            <span className="text-xs opacity-50 ml-1">({childCount})</span>
          )}
        </div>
      </div>

      {/* Selected indicator hint */}
      {isSelected && !isEditing && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          <span className="text-[10px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            Tab: add child · Del: delete · DblClick: rename
          </span>
        </div>
      )}
    </div>
  );
}