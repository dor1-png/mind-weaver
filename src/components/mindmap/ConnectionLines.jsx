import React from "react";

const lineColors = {
  indigo: "#818cf8",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  violet: "#a78bfa",
  sky: "#38bdf8",
  slate: "#94a3b8",
};

export default function ConnectionLines({ nodes, collapsedIds }) {
  const lines = [];

  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  nodes.forEach((node) => {
    if (!node.parent_id) return;
    if (collapsedIds.has(node.parent_id)) return;
    const parent = nodeMap[node.parent_id];
    if (!parent) return;

    const color = lineColors[node.color] || lineColors.slate;

    const dx = node.x - parent.x;
    const dy = node.y - parent.y;

    const cx1 = parent.x + dx * 0.4;
    const cy1 = parent.y;
    const cx2 = parent.x + dx * 0.6;
    const cy2 = node.y;

    lines.push(
      <path
        key={`${parent.id}-${node.id}`}
        d={`M ${parent.x} ${parent.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${node.x} ${node.y}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.5}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
      {lines}
    </svg>
  );
}