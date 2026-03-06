import React, { useState, useRef } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const colorSchemes = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-indigo-100",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100",
  amber: "bg-amber-50 border-amber-200 text-amber-900 shadow-amber-100",
  rose: "bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100",
  violet: "bg-violet-50 border-violet-200 text-violet-900 shadow-violet-100",
  sky: "bg-sky-50 border-sky-200 text-sky-900 shadow-sky-100",
  slate: "bg-slate-800 border-slate-600 text-white shadow-slate-300",
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

export default function NodeElement({
  node,
  childCount,
  onToggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onDragStart,
  isRoot,
}) {
  const [hovered, setHovered] = useState(false);
  const color = node.color || "slate";

  return (
    <div
      className="absolute group"
      style={{
        left: node.x,
        top: node.y,
        transform: "translate(-50%, -50%)",
        zIndex: hovered ? 50 : 10,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "relative rounded-2xl border-2 px-5 py-3 cursor-grab active:cursor-grabbing transition-all duration-200",
          "hover:shadow-lg hover:scale-105",
          colorSchemes[color] || colorSchemes.slate,
          isRoot && "px-7 py-4 text-lg font-semibold"
        )}
        onMouseDown={(e) => onDragStart(e, node)}
      >
        <div className="flex items-center gap-2">
          {childCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node);
              }}
              className="p-0.5 rounded-md hover:bg-black/10 transition-colors"
            >
              {node.collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          {childCount === 0 && (
            <div className={cn("w-2 h-2 rounded-full", dotColors[color] || dotColors.slate)} />
          )}
          <span className={cn("whitespace-nowrap select-none", isRoot ? "text-base font-bold" : "text-sm font-medium")}>
            {node.label}
          </span>
          {childCount > 0 && node.collapsed && (
            <span className="text-xs opacity-50 ml-1">({childCount})</span>
          )}
        </div>

        {/* Action buttons */}
        <div
          className={cn(
            "absolute -top-3 -right-3 flex items-center gap-1 transition-all duration-200",
            hovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
            className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {!isRoot && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
              className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}