"use client";

import React from "react";

export function BidModal({
  open,
  onClose,
  onBid,
  min = 9,
  max = 13,
  canSayNone = true,
}: {
  open: boolean;
  onClose: () => void;
  onBid: (value: number | "none") => void;
  min?: number;
  max?: number;
  canSayNone?: boolean;
}) {
  if (!open) return null;

  const options = Array.from({ length: max - min + 1 }).map((_, i) => min + i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[320px] rounded-lg bg-white text-slate-900 shadow-xl p-4">
        <h3 className="text-lg font-semibold mb-2">Place your bid</h3>
        <p className="text-sm text-slate-600 mb-3">
          Select a number between {min} and {max}.
        </p>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {options.map((v) => (
            <button
              key={v}
              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => onBid(v)}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancel
          </button>

          {canSayNone && (
            <button
              className="px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-400"
              onClick={() => onBid("none")}
            >
              I can’t bid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
