import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import NodeElement from "./NodeElement";
import ConnectionLines from "./ConnectionLines";
import MindMapToolbar from "./MindMapToolbar";
import ColorContextMenu from "./ColorContextMenu";

const DEPTH_COLORS = ["slate", "indigo", "emerald", "amber", "rose", "violet", "sky"];

function getVisibleNodes(nodes, collapsedIds) {
  const hiddenIds = new Set();
  function hideChildren(parentId) {
    nodes.forEach((n) => {
      if (n.parent_id === parentId) { hiddenIds.add(n.id); hideChildren(n.id); }
    });
  }
  collapsedIds.forEach((id) => hideChildren(id));
  return nodes.filter((n) => !hiddenIds.has(n.id));
}

function getChildCount(nodes, parentId) {
  return nodes.filter((n) => n.parent_id === parentId).length;
}

function getNodeDepth(nodes, nodeId) {
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));
  let depth = 0;
  let current = nodeMap[nodeId];
  while (current?.parent_id) { depth++; current = nodeMap[current.parent_id]; }
  return depth;
}

function autoLayout(nodes) {
  const root = nodes.find((n) => !n.parent_id);
  if (!root) return nodes;
  const childrenMap = {};
  nodes.forEach((n) => {
    if (n.parent_id) {
      if (!childrenMap[n.parent_id]) childrenMap[n.parent_id] = [];
      childrenMap[n.parent_id].push(n.id);
    }
  });
  function getSubtreeSize(id) {
    const ch = childrenMap[id] || [];
    return ch.length === 0 ? 1 : ch.reduce((s, c) => s + getSubtreeSize(c), 0);
  }
  const H = 220, V = 70, CX = 600, CY = 400;
  const pos = { [root.id]: { x: CX, y: CY } };
  function layout(pid, startY) {
    const ch = childrenMap[pid] || [];
    if (!ch.length) return;
    const totalH = ch.reduce((s, c) => s + getSubtreeSize(c), 0) * V;
    let curY = startY - totalH / 2;
    ch.forEach((cid) => {
      const h = getSubtreeSize(cid) * V;
      const cy = curY + h / 2;
      pos[cid] = { x: pos[pid].x + H, y: cy };
      layout(cid, cy);
      curY += h;
    });
  }
  layout(root.id, CY);
  return nodes.map((n) => ({ ...n, x: pos[n.id]?.x ?? n.x, y: pos[n.id]?.y ?? n.y }));
}

export default function MindMapCanvas({ nodes, mapId }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);

  // Pan/zoom stored in refs for imperative use during mouse move
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // React state for pan/zoom — only updated on mouseUp / wheel end to trigger re-render
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Drag state — all in refs, no React state, so dragging = zero re-renders
  const draggingNodeRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragPendingRAF = useRef(null);
  // Live positions during drag (id -> {x,y}) — updated imperatively
  const livePositions = useRef({});

  // Map of nodeId -> DOM element for imperative drag moves
  const nodeElRefs = useRef({});
  const registerNodeEl = useCallback((id, el) => {
    if (el) nodeElRefs.current[id] = el;
    else delete nodeElRefs.current[id];
  }, []);

  const [selectedId, setSelectedId] = useState(null);
  const [autoEditId, setAutoEditId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // ─── History stack for Undo ───────────────────────────────────────────────
  const historyRef = useRef([]); // array of node snapshots
  const MAX_HISTORY = 50;

  const pushHistory = useCallback((currentNodes) => {
    // Deep-clone only the data we need (positions + labels + structure)
    const snapshot = currentNodes
      .filter((n) => !n.id.startsWith("temp-"))
      .map(({ id, label, x, y, parent_id, color, collapsed, map_id }) =>
        ({ id, label, x, y, parent_id, color, collapsed, map_id })
      );
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), snapshot];
  }, []);

  // Build derived data with useMemo to avoid recalculating every render
  const collapsedIds = useMemo(
    () => new Set(nodes.filter((n) => n.collapsed).map((n) => n.id)),
    [nodes]
  );
  const visibleNodes = useMemo(() => getVisibleNodes(nodes, collapsedIds), [nodes, collapsedIds]);
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

  // Child counts map — stable reference
  const childCountMap = useMemo(() => {
    const map = {};
    nodes.forEach((n) => {
      if (n.parent_id) map[n.parent_id] = (map[n.parent_id] || 0) + 1;
    });
    return map;
  }, [nodes]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const updateNode = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MindMapNode.update(id, data),
    onMutate: ({ id, data, skipHistory }) => {
      const current = queryClient.getQueryData(["mindmap-nodes", mapId]) || [];
      if (!skipHistory) pushHistory(current);
      queryClient.setQueryData(["mindmap-nodes", mapId], (old) =>
        old ? old.map((n) => n.id === id ? { ...n, ...data } : n) : old
      );
    },
  });

  const createNode = useMutation({
    mutationFn: ({ tempId, ...data }) => base44.entities.MindMapNode.create(data),
    onSuccess: (newNode, { tempId }) => {
      queryClient.setQueryData(["mindmap-nodes", mapId], (old) =>
        old ? old.map((n) => n.id === tempId ? newNode : n) : [newNode]
      );
      setSelectedId(newNode.id);
      setAutoEditId(newNode.id);
    },
    onError: (_err, { tempId }) => {
      queryClient.setQueryData(["mindmap-nodes", mapId], (old) =>
        old ? old.filter((n) => n.id !== tempId) : old
      );
    },
  });

  // ─── Undo ─────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (historyRef.current.length === 0) return;
    const snapshot = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);

    const current = queryClient.getQueryData(["mindmap-nodes", mapId]) || [];

    // Figure out what changed between snapshot and current
    const snapshotIds = new Set(snapshot.map((n) => n.id));
    const currentIds = new Set(current.map((n) => n.id));

    // Nodes to delete (exist in current but not in snapshot)
    const toDelete = current.filter((n) => !snapshotIds.has(n.id) && !n.id.startsWith("temp-"));
    // Nodes to create (exist in snapshot but not in current)
    const toCreate = snapshot.filter((n) => !currentIds.has(n.id));
    // Nodes to update (exist in both but data differs)
    const toUpdate = snapshot.filter((n) => {
      const c = current.find((x) => x.id === n.id);
      return c && (c.x !== n.x || c.y !== n.y || c.label !== n.label || c.color !== n.color);
    });

    // Apply optimistically
    queryClient.setQueryData(["mindmap-nodes", mapId], snapshot);
    setSelectedId(null);

    // Sync to DB
    await Promise.all([
      ...toDelete.map((n) => base44.entities.MindMapNode.delete(n.id)),
      ...toCreate.map((n) => base44.entities.MindMapNode.create(n)),
      ...toUpdate.map((n) => base44.entities.MindMapNode.update(n.id, n)),
    ]);

    toast.success("Undone");
  }, [mapId, queryClient]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo — always active, even in inputs
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === "z") { e.preventDefault(); handleUndo(); return; }

      // Below shortcuts: skip when typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!selectedNode) return;

      if (e.key === "Tab") { e.preventDefault(); handleAddChild(selectedNode); }
      // Backspace deletes selected node (not root)
      if (e.key === "Backspace") {
        if (!selectedNode.parent_id) return;
        e.preventDefault();
        handleDelete(selectedNode);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, nodes, handleUndo]);

  // ─── Mouse events ─────────────────────────────────────────────────────────
  const handleCanvasMouseDown = (e) => {
    if (
      e.target === canvasRef.current ||
      e.target.tagName === "svg" ||
      e.target.tagName === "path"
    ) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      setSelectedId(null);
      setAutoEditId(null);
      setContextMenu(null);
    }
  };

  // Move the canvas wrapper imperatively during pan
  const contentRef = useRef(null);

  const applyTransform = useCallback((px, py, z) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${px}px, ${py}px) scale(${z})`;
    }
    if (canvasRef.current) {
      canvasRef.current.style.backgroundSize = `${20 * z}px ${20 * z}px`;
      canvasRef.current.style.backgroundPosition = `${px}px ${py}px`;
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanningRef.current) {
      const px = e.clientX - panStartRef.current.x;
      const py = e.clientY - panStartRef.current.y;
      panRef.current = { x: px, y: py };
      applyTransform(px, py, zoomRef.current);
      return;
    }

    if (draggingNodeRef.current) {
      if (dragPendingRAF.current) return; // skip if previous frame not done
      dragPendingRAF.current = requestAnimationFrame(() => {
        dragPendingRAF.current = null;
        const dn = draggingNodeRef.current;
        if (!dn) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - panRef.current.x) / zoomRef.current - dragOffsetRef.current.x;
        const y = (e.clientY - rect.top - panRef.current.y) / zoomRef.current - dragOffsetRef.current.y;

        // Move DOM node directly — no React state change
        const el = nodeElRefs.current[dn.id];
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
        livePositions.current[dn.id] = { x, y };
      });
    }
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      // Commit pan to React state so nodes re-render at correct offset
      setPan({ ...panRef.current });
    }

    const dn = draggingNodeRef.current;
    if (dn) {
      draggingNodeRef.current = null;
      if (dragPendingRAF.current) { cancelAnimationFrame(dragPendingRAF.current); dragPendingRAF.current = null; }
      const pos = livePositions.current[dn.id];
      if (pos) {
        // updateNode.onMutate will push history before applying
        updateNode.mutate({ id: dn.id, data: pos });
        delete livePositions.current[dn.id];
      }
    }
  }, [mapId, queryClient, updateNode]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ─── Wheel zoom ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newZoom = Math.max(0.2, Math.min(3, zoomRef.current + delta));
      zoomRef.current = newZoom;
      applyTransform(panRef.current.x, panRef.current.y, newZoom);
      setZoom(newZoom); // sync React state for toolbar / fit
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  // ─── Stable node callbacks ────────────────────────────────────────────────
  const handleDragStart = useCallback((e, node) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
    const mouseY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;
    dragOffsetRef.current = { x: mouseX - node.x, y: mouseY - node.y };
    draggingNodeRef.current = node;
  }, []);

  const handleToggleCollapse = useCallback((node) => {
    updateNode.mutate({ id: node.id, data: { collapsed: !node.collapsed } });
  }, [updateNode]);

  const handleAddChild = useCallback((parentNode) => {
    const depth = getNodeDepth(nodes, parentNode.id) + 1;
    const color = DEPTH_COLORS[depth % DEPTH_COLORS.length];
    const siblings = nodes.filter((n) => n.parent_id === parentNode.id);
    const offsetY = (siblings.length - Math.floor(siblings.length / 2)) * 70;
    const tempId = `temp-${Date.now()}`;
    const newNodeData = {
      map_id: mapId,
      label: "New node",
      color,
      parent_id: parentNode.id,
      x: parentNode.x + 220,
      y: parentNode.y + offsetY,
    };
    // Save snapshot before adding (so undo can remove it)
    pushHistory(nodes);
    queryClient.setQueryData(["mindmap-nodes", mapId], (old) =>
      old ? [...old, { id: tempId, ...newNodeData }] : [{ id: tempId, ...newNodeData }]
    );
    setSelectedId(tempId);
    setAutoEditId(tempId);
    createNode.mutate({ tempId, ...newNodeData });
  }, [nodes, mapId, createNode, queryClient, pushHistory]);

  const handleSelect = useCallback((n) => {
    setSelectedId(n.id);
    setAutoEditId(null);
  }, []);

  const handleRename = useCallback((node, newLabel) => {
    // history is pushed inside updateNode.onMutate
    updateNode.mutate({ id: node.id, data: { label: newLabel } });
    setAutoEditId((prev) => prev === node.id ? null : prev);
  }, [updateNode]);

  const handleDelete = useCallback(async (node) => {
    if (!node.parent_id) return;
    const toDelete = [node.id];
    function findChildren(pid) {
      nodes.forEach((n) => { if (n.parent_id === pid) { toDelete.push(n.id); findChildren(n.id); } });
    }
    findChildren(node.id);
    // Save snapshot before deleting so Ctrl+Z can restore
    pushHistory(nodes);
    // Optimistic remove
    queryClient.setQueryData(["mindmap-nodes", mapId], (old) =>
      old ? old.filter((n) => !toDelete.includes(n.id)) : old
    );
    setSelectedId(null);
    setAutoEditId(null);
    const hadChildren = toDelete.length > 1;
    for (const id of toDelete) await base44.entities.MindMapNode.delete(id);
    queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] });
    toast(`"${node.label}" deleted${hadChildren ? ` (+${toDelete.length - 1} children)` : ""}`, {
      action: { label: "Undo", onClick: handleUndo },
    });
  }, [nodes, mapId, queryClient, pushHistory, handleUndo]);

  const handleContextMenu = useCallback((e, node) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleColorChange = useCallback((color) => {
    if (!contextMenu?.node) return;
    updateNode.mutate({ id: contextMenu.node.id, data: { color } });
  }, [contextMenu, updateNode]);

  const handleAutoLayout = async () => {
    const laid = autoLayout(nodes);
    for (const n of laid) {
      const orig = nodes.find((o) => o.id === n.id);
      if (orig && (orig.x !== n.x || orig.y !== n.y)) {
        await base44.entities.MindMapNode.update(n.id, { x: n.x, y: n.y });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] });
  };

  const handleFitView = () => {
    if (nodes.length === 0) return;
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rect = canvasRef.current.getBoundingClientRect();
    const newZoom = Math.min(rect.width / (maxX - minX + 400), rect.height / (maxY - minY + 300), 1.5);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const px = rect.width / 2 - cx * newZoom;
    const py = rect.height / 2 - cy * newZoom;
    panRef.current = { x: px, y: py };
    zoomRef.current = newZoom;
    applyTransform(px, py, newZoom);
    setPan({ x: px, y: py });
    setZoom(newZoom);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleCanvasMouseDown}
      style={{
        backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <ConnectionLines nodes={visibleNodes} collapsedIds={collapsedIds} />
        {visibleNodes.map((node) => (
          <NodeElement
            key={node.id}
            node={node}
            childCount={childCountMap[node.id] || 0}
            isRoot={!node.parent_id}
            isSelected={node.id === selectedId}
            autoEdit={node.id === autoEditId}
            onSelect={handleSelect}
            onToggleCollapse={handleToggleCollapse}
            onDragStart={handleDragStart}
            onRename={handleRename}
            onContextMenu={handleContextMenu}
            onMount={registerNodeEl}
          />
        ))}
      </div>

      <MindMapToolbar
        onZoomIn={() => { const z = Math.min(3, zoomRef.current + 0.15); zoomRef.current = z; applyTransform(panRef.current.x, panRef.current.y, z); setZoom(z); }}
        onZoomOut={() => { const z = Math.max(0.2, zoomRef.current - 0.15); zoomRef.current = z; applyTransform(panRef.current.x, panRef.current.y, z); setZoom(z); }}
        onFitView={handleFitView}
        onAutoLayout={handleAutoLayout}
      />

      {contextMenu && (
        <ColorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          currentColor={contextMenu.node.color}
          onSelect={handleColorChange}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}