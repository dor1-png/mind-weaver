import React from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ExportMenu from "./ExportMenu";

export default function MindMapToolbar({ onZoomIn, onZoomOut, onFitView, onAutoLayout, canvasRef, nodes, mapTitle, mapNotes }) {
  const buttons = [
    { icon: ZoomIn, label: "Zoom in", onClick: onZoomIn },
    { icon: ZoomOut, label: "Zoom out", onClick: onZoomOut },
    { icon: Maximize2, label: "Fit view", onClick: onFitView },
    { icon: RotateCcw, label: "Auto layout", onClick: onAutoLayout },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/60 px-2 py-2">
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            title={btn.label}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
              "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            <btn.icon className="w-4.5 h-4.5" />
          </button>
        ))}
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ExportMenu canvasRef={canvasRef} nodes={nodes} mapTitle={mapTitle} mapNotes={mapNotes} />
      </div>
    </div>
  );
}