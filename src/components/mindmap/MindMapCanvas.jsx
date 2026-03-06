import React, { useState, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NodeElement from "./NodeElement";
import ConnectionLines from "./ConnectionLines";
import NodeEditor from "./NodeEditor";
import MindMapToolbar from "./MindMapToolbar";

const DEPTH_COLORS = ["slate", "indigo", "emerald", "amber", "rose", "violet", "sky"];

function getVisibleNodes(nodes, collapsedIds) {
  const hiddenIds = new Set();

  function hideChildren(parentId) {
    nodes.forEach((n) => {
      if (n.parent_id === parentId) {
        hiddenIds.add(n.id);
        hideChildren(n.id);
      }
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
  while (current?.parent_id) {
    depth++;
    current = nodeMap[current.parent_id];
  }
  return depth;
}

function autoLayout(nodes) {
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = { ...n }));

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
    const children = childrenMap[id] || [];
    if (children.length === 0) return 1;
    return children.reduce((sum, cid) => sum + getSubtreeSize(cid), 0);
  }

  const H_SPACING = 220;
  const V_SPACING = 70;
  const CENTER_X = 600;
  const CENTER_Y = 400;

  const positions = {};
  positions[root.id] = { x: CENTER_X, y: CENTER_Y };

  function layoutChildren(parentId, startY) {
    const children = childrenMap[parentId] || [];
    if (children.length === 0) return 0;

    const parentPos = positions[parentId];
    const totalSize = children.reduce((sum, cid) => sum + getSubtreeSize(cid), 0);
    const totalHeight = totalSize * V_SPACING;

    let currentY = startY - totalHeight / 2;

    children.forEach((cid) => {
      const subtreeSize = getSubtreeSize(cid);
      const subtreeHeight = subtreeSize * V_SPACING;
      const cy = currentY + subtreeHeight / 2;

      positions[cid] = {
        x: parentPos.x + H_SPACING,
        y: cy,
      };

      layoutChildren(cid, cy);
      currentY += subtreeHeight;
    });

    return totalHeight;
  }

  layoutChildren(root.id, CENTER_Y);

  return nodes.map((n) => ({
    ...n,
    x: positions[n.id]?.x ?? n.x,
    y: positions[n.id]?.y ?? n.y,
  }));
}

export default function MindMapCanvas({ nodes, mapId }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editor, setEditor] = useState(null);

  const collapsedIds = new Set(nodes.filter((n) => n.collapsed).map((n) => n.id));
  const visibleNodes = getVisibleNodes(nodes, collapsedIds);

  const updateNode = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MindMapNode.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] }),
  });

  const createNode = useMutation({
    mutationFn: (data) => base44.entities.MindMapNode.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] }),
  });

  const deleteNodeMut = useMutation({
    mutationFn: (id) => base44.entities.MindMapNode.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] }),
  });

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === "svg" || e.target.tagName === "path") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
      if (draggingNode) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        updateNode.mutate({
          id: draggingNode.id,
          data: { x: x - dragOffset.x, y: y - dragOffset.y },
        });
      }
    },
    [isPanning, panStart, draggingNode, dragOffset, pan, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const handleDragStart = (e, node) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({ x: mouseX - node.x, y: mouseY - node.y });
    setDraggingNode(node);
  };

  const handleToggleCollapse = (node) => {
    updateNode.mutate({ id: node.id, data: { collapsed: !node.collapsed } });
  };

  const handleAddChild = (parentNode) => {
    const depth = getNodeDepth(nodes, parentNode.id) + 1;
    const color = DEPTH_COLORS[depth % DEPTH_COLORS.length];
    setEditor({
      mode: "add",
      parentNode,
      defaultColor: color,
    });
  };

  const handleEdit = (node) => {
    setEditor({ mode: "edit", node });
  };

  const handleDelete = async (node) => {
    const toDelete = [node.id];
    function findChildren(parentId) {
      nodes.forEach((n) => {
        if (n.parent_id === parentId) {
          toDelete.push(n.id);
          findChildren(n.id);
        }
      });
    }
    findChildren(node.id);
    for (const id of toDelete) {
      await base44.entities.MindMapNode.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ["mindmap-nodes", mapId] });
  };

  const handleEditorSave = (data) => {
    if (editor.mode === "edit") {
      updateNode.mutate({ id: editor.node.id, data });
    } else {
      const siblings = nodes.filter((n) => n.parent_id === editor.parentNode.id);
      const offsetY = (siblings.length - siblings.length / 2) * 70;
      createNode.mutate({
        map_id: mapId,
        label: data.label,
        color: data.color,
        parent_id: editor.parentNode.id,
        x: editor.parentNode.x + 220,
        y: editor.parentNode.y + offsetY,
      });
    }
    setEditor(null);
  };

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
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rect = canvasRef.current.getBoundingClientRect();
    const w = maxX - minX + 400;
    const h = maxY - minY + 300;
    const newZoom = Math.min(rect.width / w, rect.height / h, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - cx * newZoom,
      y: rect.height / 2 - cy * newZoom,
    });
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleCanvasMouseDown}
      style={{
        backgroundImage:
          "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <div
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
            childCount={getChildCount(nodes, node.id)}
            onToggleCollapse={handleToggleCollapse}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            isRoot={!node.parent_id}
          />
        ))}
      </div>

      <MindMapToolbar
        onZoomIn={() => setZoom((z) => Math.min(3, z + 0.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.2, z - 0.15))}
        onFitView={handleFitView}
        onAutoLayout={handleAutoLayout}
      />

      {editor && (
        <NodeEditor
          node={editor.mode === "edit" ? editor.node : { color: editor.defaultColor }}
          mode={editor.mode}
          onSave={handleEditorSave}
          onCancel={() => setEditor(null)}
        />
      )}
    </div>
  );
}