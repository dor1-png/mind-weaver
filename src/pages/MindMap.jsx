import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, LogOut, Share2 } from "lucide-react";
import { Toaster } from "sonner";
import MindMapList from "../components/mindmap/MindMapList";
import MindMapCanvas from "../components/mindmap/MindMapCanvas";
import ShareModal from "../components/mindmap/ShareModal";
import PresenceAvatars from "../components/mindmap/PresenceAvatars";

export default function MindMap() {
  const [selectedMap, setSelectedMap] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        // Clear all cached queries when a new user logs in to prevent ghost data
        queryClient.clear();
        setUser(u);
        setAuthChecked(true);
      })
      .catch(() => { base44.auth.redirectToLogin(window.location.href); });
  }, []);

  const handleLogout = () => {
    // Clear cache before logout so next user starts fresh
    queryClient.clear();
    base44.auth.logout();
  };

  // Fetch nodes — for owned maps filter by userId, for shared maps filter by map_id only
  const isOwner = selectedMap?.userId === user?.id;
  const { data: nodes = [] } = useQuery({
    queryKey: ["mindmap-nodes", selectedMap?.id, user?.id],
    queryFn: () => isOwner
      ? base44.entities.MindMapNode.filter({ map_id: selectedMap.id, userId: user.id })
      : base44.entities.MindMapNode.filter({ map_id: selectedMap.id }),
    enabled: !!selectedMap?.id && !!user?.id,
    staleTime: 0,
  });

  // Real-time node sync — subscribe to changes on MindMapNode
  useEffect(() => {
    if (!selectedMap?.id) return;
    const unsub = base44.entities.MindMapNode.subscribe((event) => {
      if (event.data?.map_id !== selectedMap.id && event.type !== "delete") return;
      // Refetch to get fresh data; avoids complex merge logic
      queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", selectedMap.id, user?.id] });
    });
    return unsub;
  }, [selectedMap?.id, user?.id, queryClient]);

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

        {/* Presence avatars */}
        <PresenceAvatars mapId={selectedMap?.id} user={user} />

        {/* Share button (owner only) */}
        {isOwner && (
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        )}

        <button
          onClick={handleLogout}
          className="ml-1 p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <MindMapCanvas nodes={nodes} mapId={selectedMap.id} user={user} isOwner={isOwner} />
      </div>
      <Toaster position="bottom-center" />

      {showShare && (
        <ShareModal map={selectedMap} user={user} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}