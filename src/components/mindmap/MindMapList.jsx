import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Brain, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function MindMapList({ onSelectMap, user }) {
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  // Fetch only this user's maps at the DB level — keyed by userId
  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["mindmaps", user?.id],
    queryFn: () => base44.entities.MindMap.filter({ userId: user.id }, "-created_date"),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const createMap = useMutation({
    mutationFn: async (title) => {
      const map = await base44.entities.MindMap.create({ title });
      await base44.entities.MindMapNode.create({
        map_id: map.id,
        label: title,
        parent_id: null,
        x: 600,
        y: 400,
        color: "slate",
      });
      return map;
    },
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: ["mindmaps", user?.email] });
      setNewTitle("");
      setShowCreate(false);
      onSelectMap(map);
    },
  });

  const deleteMap = useMutation({
    mutationFn: async (mapId) => {
      // Guard: only delete if the map belongs to this user
      const map = maps.find((m) => m.id === mapId);
      if (!map || map.created_by !== user?.email) return;
      const nodes = await base44.entities.MindMapNode.filter({ map_id: mapId });
      await Promise.allSettled(nodes.map((n) => base44.entities.MindMapNode.delete(n.id)));
      await base44.entities.MindMap.delete(mapId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mindmaps", user?.email] }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mind Maps</h1>
          <p className="text-slate-500 mt-2">Organize your thoughts visually</p>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) createMap.mutate(newTitle.trim()); }}
                className="flex gap-3 mb-6"
              >
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Mind map title..."
                  className="h-12 text-base rounded-xl"
                  autoFocus
                />
                <Button type="submit" disabled={!newTitle.trim()} className="h-12 px-6 rounded-xl bg-slate-800 hover:bg-slate-900">
                  Create
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="h-12 rounded-xl">
                  Cancel
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!showCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-900 text-base font-medium mb-6 shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Mind Map
          </Button>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : maps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-9 h-9 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No mind maps yet</h2>
            <p className="text-slate-400 mb-7 text-sm">Capture your ideas and organize your thoughts visually.</p>
            <Button
              onClick={() => setShowCreate(true)}
              className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-semibold shadow-md"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Your First Adventure
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {maps.map((map, i) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className={cn(
                    "group flex items-center justify-between p-4 rounded-2xl border border-slate-200/60",
                    "bg-white hover:bg-slate-50 hover:border-slate-300/60 transition-all duration-200 cursor-pointer",
                    "hover:shadow-md"
                  )}
                  onClick={() => onSelectMap(map)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{map.title}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(map.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMap.mutate(map.id); }}
                      className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}