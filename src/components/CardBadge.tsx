// File: src/components/CardBadge.tsx
"use client";
import React from "react";
import type { CardDto } from "@/lib/types";

function rankShort(rank: string | undefined, value: number): string {
  if (!rank) return String(value);
  const r = rank.toLowerCase();
  if (r.startsWith("ace")) return "A";
  if (r.startsWith("king")) return "K";
  if (r.startsWith("queen")) return "Q";
  if (r.startsWith("jack")) return "J";
  if (value >= 2 && value <= 10) return String(value);
  // fallback first letter
  return rank.slice(0, 1).toUpperCase();
}
function suitSymbol(suit: string | undefined): string {
  switch ((suit || "").toLowerCase()) {
    case "spades": return "♠";
    case "hearts": return "♥";
    case "diamonds": return "♦";
    case "clubs": return "♣";
    default: return "•";
  }
}
function isRed(suit: string | undefined) {
  const s = (suit || "").toLowerCase();
  return s === "hearts" || s === "diamonds";
}

export function CardBadge({
  card,
  width = 52,
  className = "",
  highlight = false,
}: {
  card: CardDto;
  width?: number;
  className?: string;
  highlight?: boolean;
}) {
  const h = Math.round(width * 1.2); // more compact than 1.4
  const r = rankShort(card.rank, card.value);
  const s = suitSymbol(card.suit);
  const red = isRed(card.suit);

  return (
    <div
      className={`relative rounded-md border bg-white shadow-sm ${className}`}
      style={{ width, height: h, borderColor: "rgba(0,0,0,0.25)" }}
      title={`${card.rank} of ${card.suit}`}
    >
      {highlight && (
        <div className="absolute inset-0 rounded-md ring-2 ring-emerald-400 pointer-events-none" />
      )}
      {/* Only rank + suit shown (no artwork) */}
      <div className="absolute top-1 left-1 text-[11px]" style={{ color: red ? "#dc2626" : "#111827" }}>
        <div className="leading-none font-semibold">{r}</div>
        <div className="leading-none">{s}</div>
      </div>
      <div className="absolute bottom-1 right-1 text-[11px] rotate-180" style={{ color: red ? "#dc2626" : "#111827" }}>
        <div className="leading-none font-semibold">{r}</div>
        <div className="leading-none">{s}</div>
      </div>
      {/* faint center icon for balance (optional) */}
      <div className="absolute inset-0 flex items-center justify-center text-lg opacity-60" style={{ color: red ? "#ef4444" : "#111827" }}>
        {s}
      </div>
    </div>
  );
}
