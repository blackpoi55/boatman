"use client";

import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  width = "max-w-2xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`${width} w-full overflow-hidden rounded-lg border border-pm-border2 bg-pm-bg2 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-pm-border px-4 py-3">
          <span className="text-[14px] font-semibold text-pm-text">{title}</span>
          <button
            onClick={onClose}
            className="text-pm-muted hover:text-pm-text"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
