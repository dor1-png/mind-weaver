import React, { useState, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NodeNotesPopover({ node, onSave, onClose }) {
  const [draft, setDraft] = useState(node.notes ?? "");
  const textareaRef = useRef(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 20);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = draft !== (node.notes ?? "");

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100] w-72"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate max-w-[200px]">
            {node.label}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add notes for this node…"
          className="w-full h-32 resize-none p-3 text-sm text-slate-700 leading-relaxed focus:outline-none placeholder:text-slate-300"
        />
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            disabled={!dirty}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              dirty
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>
      {/* Click-away catcher */}
      <div
        className="fixed inset-0 -z-10"
        onMouseDown={onClose}
      />
    </div>
  );
}