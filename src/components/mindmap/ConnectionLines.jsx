import React, { memo } from "react";

const lineColors = {
  indigo:  "#818cf8",
  emerald: "#34d399",
  amber:   "#fbbf24",
  rose:    "#fb7185",
  violet:  "#a78bfa",
  sky:     "#38bdf8",
  slate:   "#94a3b8",
};

const ConnectionLines = memo(function ConnectionLines({ nodes, collapsedIds }) {
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  const lines = [];
  nodes.forEach((node) => {
    if (!node.parent_id) return;
    if (collapsedIds.has(node.parent_id)) return;
    const parent = nodeMap[node.parent_id];
    if (!parent) return;

    const color = lineColors[node.color] || lineColors.slate;
    const dx = node.x - parent.x;
    const cx1 = parent.x + dx * 0.4;
    const cx2 = parent.x + dx * 0.6;

    lines.push(
      <path
        key={`${parent.id}-${node.id}`}
        d={`M ${parent.x} ${parent.y} C ${cx1} ${parent.y}, ${cx2} ${node.y}, ${node.x} ${node.y}`}
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
});

export default ConnectionLines;