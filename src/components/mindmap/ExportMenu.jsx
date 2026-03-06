import React, { useState, useRef, useEffect } from "react";
import { Download, Image, FileText, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function buildOPML(nodes) {
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = { ...n, children: [] }));
  const roots = [];
  nodes.forEach((n) => {
    if (n.parent_id && nodeMap[n.parent_id]) {
      nodeMap[n.parent_id].children.push(nodeMap[n.id]);
    } else if (!n.parent_id) {
      roots.push(nodeMap[n.id]);
    }
  });

  function escXml(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function toOutline(n) {
    const childXml = n.children.map(toOutline).join("");
    return `<outline text="${escXml(n.label)}">${childXml}</outline>`;
  }

  const outlines = roots.map(toOutline).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head/>\n  <body>\n  ${outlines}\n  </body>\n</opml>`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function captureElement(el) {
  const canvas = await html2canvas(el, {
    backgroundColor: "#f8fafc",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL("image/png");
}

export default function ExportMenu({ canvasRef, nodes, mapTitle }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const menuRef = useRef(null);
  const title = mapTitle || "mindmap";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const exportPNG = async (e) => {
    e.preventDefault();
    setOpen(false);
    setExporting("png");
    try {
      const dataUrl = await captureElement(canvasRef.current);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      triggerDownload(blob, `${title}.png`);
    } finally {
      setExporting(null);
    }
  };

  const exportJPG = async (e) => {
    e.preventDefault();
    setOpen(false);
    setExporting("jpg");
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => { triggerDownload(blob, `${title}.jpg`); setExporting(null); }, "image/jpeg", 0.92);
    } catch {
      setExporting(null);
    }
  };

  const exportPDF = async (e) => {
    e.preventDefault();
    setOpen(false);
    setExporting("pdf");
    try {
      const dataUrl = await captureElement(canvasRef.current);
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const w = img.naturalWidth / 2;
      const h = img.naturalHeight / 2;
      const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`${title}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const exportJSON = (e) => {
    e.preventDefault();
    setOpen(false);
    const data = nodes.map(({ id, label, parent_id, x, y, color, collapsed, map_id }) =>
      ({ id, label, parent_id, x, y, color, collapsed, map_id })
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    triggerDownload(blob, `${title}.json`);
  };

  const exportOPML = (e) => {
    e.preventDefault();
    setOpen(false);
    const blob = new Blob([buildOPML(nodes)], { type: "text/xml" });
    triggerDownload(blob, `${title}.opml`);
  };

  const items = [
    { label: "PNG Image", icon: Image, action: exportPNG, key: "png" },
    { label: "JPG Image", icon: Image, action: exportJPG, key: "jpg" },
    { label: "PDF Document", icon: FileText, action: exportPDF, key: "pdf" },
    { label: "JSON Data", icon: FileJson, action: exportJSON, key: "json" },
    { label: "OPML", icon: FileText, action: exportOPML, key: "opml" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        title="Export"
        disabled={!!exporting}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
          "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
          exporting && "opacity-50 cursor-wait"
        )}
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-slate-200/60 py-1.5 min-w-44 z-50">
          <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Export as</div>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <item.icon className="w-4 h-4 text-slate-400" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}