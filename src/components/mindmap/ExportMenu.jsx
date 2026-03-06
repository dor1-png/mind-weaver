import React, { useState, useRef, useEffect } from "react";
import { Download, Image, FileText, FileJson, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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

  function toOutline(n) {
    const childXml = n.children.map(toOutline).join("");
    return `<outline text="${escXml(n.label)}">${childXml}</outline>`;
  }
  function escXml(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const outlines = roots.map(toOutline).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head/>\n  <body>\n  ${outlines}\n  </body>\n</opml>`;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportMenu({ contentRef, nodes, mapTitle }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const captureCanvas = async () => {
    const el = contentRef.current;
    if (!el) return null;
    return await html2canvas(el, { backgroundColor: "#f8fafc", scale: 2, useCORS: true, logging: false });
  };

  const exportPNG = async () => {
    setExporting("png"); setOpen(false);
    const canvas = await captureCanvas();
    canvas.toBlob((blob) => { download(blob, `${mapTitle || "mindmap"}.png`); setExporting(null); }, "image/png");
  };

  const exportJPG = async () => {
    setExporting("jpg"); setOpen(false);
    const canvas = await captureCanvas();
    canvas.toBlob((blob) => { download(blob, `${mapTitle || "mindmap"}.jpg`); setExporting(null); }, "image/jpeg", 0.92);
  };

  const exportPDF = async () => {
    setExporting("pdf"); setOpen(false);
    const canvas = await captureCanvas();
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${mapTitle || "mindmap"}.pdf`);
    setExporting(null);
  };

  const exportJSON = () => {
    setOpen(false);
    const data = nodes.map(({ id, label, parent_id, x, y, color, collapsed, map_id }) =>
      ({ id, label, parent_id, x, y, color, collapsed, map_id })
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    download(blob, `${mapTitle || "mindmap"}.json`);
  };

  const exportOPML = () => {
    setOpen(false);
    const blob = new Blob([buildOPML(nodes)], { type: "text/xml" });
    download(blob, `${mapTitle || "mindmap"}.opml`);
  };

  const items = [
    { label: "PNG Image", icon: Image, action: exportPNG, key: "png" },
    { label: "JPG Image", icon: Image, action: exportJPG, key: "jpg" },
    { label: "PDF Document", icon: FileText, action: exportPDF, key: "pdf" },
    { label: "JSON Data", icon: FileJson, action: exportJSON, key: "json" },
    { label: "OPML", icon: FileText, action: exportOPML, key: "opml" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
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
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-slate-200/60 py-1.5 min-w-40 z-50">
          <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Export as</div>
          {items.map((item) => (
            <button
              key={item.key}
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