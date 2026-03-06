import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const colors = [
  { name: "indigo", bg: "bg-indigo-400" },
  { name: "emerald", bg: "bg-emerald-400" },
  { name: "amber", bg: "bg-amber-400" },
  { name: "rose", bg: "bg-rose-400" },
  { name: "violet", bg: "bg-violet-400" },
  { name: "sky", bg: "bg-sky-400" },
];

export default function NodeEditor({ node, onSave, onCancel, mode }) {
  const [label, setLabel] = useState(node?.label || "");
  const [color, setColor] = useState(node?.color || "indigo");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ label: label.trim(), color });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-800">
            {mode === "edit" ? "Edit Node" : "New Node"}
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
              Label
            </label>
            <Input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter node text..."
              className="text-base h-11"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
              Color
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={cn(
                    "w-9 h-9 rounded-xl transition-all duration-200 flex items-center justify-center",
                    c.bg,
                    color === c.name
                      ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                      : "hover:scale-105 opacity-60"
                  )}
                >
                  {color === c.name && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-900">
              {mode === "edit" ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}