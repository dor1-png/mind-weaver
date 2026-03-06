import React, { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PRESENCE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

const HEARTBEAT_INTERVAL = 15_000; // 15s
const STALE_THRESHOLD = 45_000;    // 45s — consider absent if no heartbeat

function getColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export default function PresenceAvatars({ mapId, user }) {
  const queryClient = useQueryClient();
  const presenceRecordId = useRef(null);

  // Register / heartbeat presence
  useEffect(() => {
    if (!mapId || !user?.id) return;

    const color = getColor(user.id);

    const upsertPresence = async () => {
      const now = new Date().toISOString();
      if (presenceRecordId.current) {
        await base44.entities.Presence.update(presenceRecordId.current, { last_seen: now });
      } else {
        // Check if a record already exists for this user+map
        const existing = await base44.entities.Presence.filter({ map_id: mapId, user_id: user.id });
        if (existing.length > 0) {
          presenceRecordId.current = existing[0].id;
          await base44.entities.Presence.update(existing[0].id, { last_seen: now });
        } else {
          const rec = await base44.entities.Presence.create({
            map_id: mapId,
            user_id: user.id,
            user_name: user.full_name || user.email,
            user_email: user.email,
            color,
            last_seen: now,
          });
          presenceRecordId.current = rec.id;
        }
      }
    };

    upsertPresence();
    const interval = setInterval(upsertPresence, HEARTBEAT_INTERVAL);

    // Cleanup: remove presence on unmount
    return () => {
      clearInterval(interval);
      if (presenceRecordId.current) {
        base44.entities.Presence.delete(presenceRecordId.current).catch(() => {});
        presenceRecordId.current = null;
      }
    };
  }, [mapId, user?.id]);

  // Poll presence records
  const { data: presenceList = [] } = useQuery({
    queryKey: ["presence", mapId],
    queryFn: () => base44.entities.Presence.filter({ map_id: mapId }),
    refetchInterval: 20_000,
    enabled: !!mapId && !!user?.id,
  });

  // Subscribe to real-time presence changes
  useEffect(() => {
    const unsub = base44.entities.Presence.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["presence", mapId] });
    });
    return unsub;
  }, [mapId, queryClient]);

  // Filter to only active (not stale) users, excluding self
  const now = Date.now();
  const active = presenceList.filter((p) => {
    if (p.user_id === user?.id) return false;
    const age = now - new Date(p.last_seen).getTime();
    return age < STALE_THRESHOLD;
  });

  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {active.slice(0, 5).map((p) => (
          <div
            key={p.id}
            title={`${p.user_name} is viewing`}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ backgroundColor: p.color || getColor(p.user_id) }}
          >
            {(p.user_name || p.user_email || "?")[0].toUpperCase()}
          </div>
        ))}
        {active.length > 5 && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            +{active.length - 5}
          </div>
        )}
      </div>
      <span className="text-xs text-slate-400 ml-1">
        {active.length === 1 ? "1 other here" : `${active.length} others here`}
      </span>
    </div>
  );
}