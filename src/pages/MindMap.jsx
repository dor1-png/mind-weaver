import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain } from "lucide-react";
import { Toaster } from "sonner";
import MindMapList from "../components/mindmap/MindMapList";
import MindMapCanvas from "../components/mindmap/MindMapCanvas";

export default function MindMap() {
  const [selectedMap, setSelectedMap] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then((u) => { setUser(u); setAuthChecked(true); })
      .catch(() => { base44.auth.redirectToLogin(window.location.href); });
  }, []);

  // Only fetch nodes belonging to current user's selected map
  const { data: nodes = [] } = useQuery({
    queryKey: ["mindmap-nodes", selectedMap?.id],
    queryFn: () => base44.entities.MindMapNode.filter({ map_id: selectedMap.id, created_by: user?.email }),
    enabled: !!selectedMap && !!user,
  });

  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (!selectedMap) {
    return <MindMapList onSelectMap={setSelectedMap} user={user} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-50">
        <button
          onClick={() => setSelectedMap(null)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800 truncate">{selectedMap.title}</h1>
        <span className="text-xs text-slate-400 ml-auto">{nodes.length} nodes</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <MindMapCanvas nodes={nodes} mapId={selectedMap.id} user={user} />
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}