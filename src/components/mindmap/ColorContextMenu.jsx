import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const colors = [
  { name: "slate",   bg: "bg-slate-700",   label: "Dark" },
  { name: "indigo",  bg: "bg-indigo-400",  label: "Indigo" },
  { name: "emerald", bg: "bg-emerald-400", label: "Green" },
  { name: "amber",   bg: "bg-amber-400",   label: "Amber" },
  { name: "rose",    bg: "bg-rose-400",    label: "Rose" },
  { name: "violet",  bg: "bg-violet-400",  label: "Violet" },
  { name: "sky",     bg: "bg-sky-400",     label: "Sky" },
];

export default function ColorContextMenu({ x, y, currentColor, onSelect, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200/60 p-3"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
        Node Color
      </p>
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            key={c.name}
            title={c.label}
            onClick={() => { onSelect(c.name); onClose(); }}
            className={cn(
              "w-8 h-8 rounded-xl transition-all duration-150 flex items-center justify-center",
              c.bg,
              currentColor === c.name ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
            )}
          >
            {currentColor === c.name && <Check className="w-4 h-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  );
}