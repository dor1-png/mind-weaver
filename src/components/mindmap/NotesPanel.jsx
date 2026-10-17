import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Save, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NotesPanel({ map, user, onClose }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const isOwner = map?.userId === user?.id;

  // Fetch the latest map (with notes)
  const { data: currentMap } = useQuery({
    queryKey: ["mindmap", map?.id],
    queryFn: () => base44.entities.MindMap.get(map.id),
    enabled: !!map?.id,
  });

  // Sync draft when the map loads or changes
  useEffect(() => {
    setDraft(currentMap?.notes ?? "");
  }, [currentMap?.id, currentMap?.notes]);

  const saveNotes = useMutation({
    mutationFn: (text) => base44.entities.MindMap.update(map.id, { notes: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mindmap", map.id] });
      queryClient.invalidateQueries({ queryKey: ["mindmaps", user?.id] });
      toast.success("Notes saved");
    },
  });

  const dirty = draft !== (currentMap?.notes ?? "");

  return (
    <div className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white border-l border-slate-200/60 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <StickyNote className="w-4 h-4 text-amber-600" />
        </div>
        <h2 className="font-semibold text-slate-800 flex-1">Notes</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        {isOwner ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write notes, ideas, or reminders for this mind map…"
              className="flex-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300 transition-all"
              autoFocus
            />
            <button
              onClick={() => saveNotes.mutate(draft)}
              disabled={!dirty || saveNotes.isPending}
              className={cn(
                "flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all",
                dirty && !saveNotes.isPending
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              {saveNotes.isPending ? "Saving…" : dirty ? "Save notes" : "Saved"}
            </button>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {currentMap?.notes || (
              <span className="text-slate-400 italic">No notes have been added to this mind map.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}