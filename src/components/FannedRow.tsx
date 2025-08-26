// File: src/components/FannedRow.tsx
"use client";
import React from "react";
import type { CardDto } from "@/lib/types";
import { CardBadge } from "@/components/CardBadge";
import { cardKey } from "@/lib/ui/cards";

export function FannedRow({
  cards,
  width = 52,
  maxSpread = 14,
  overlap = 0.55,
  curved = true,
  onClickCard,
  selectedKeys,
  interactive = true,
}: {
  cards: CardDto[];
  width?: number;         // single card width
  maxSpread?: number;     // max tilt degrees at edges
  overlap?: number;       // 0..1, how much each card overlaps previous (0=no overlap, 0.5=half)
  curved?: boolean;       // apply slight y-curve
  onClickCard?: (c: CardDto) => void;
  selectedKeys?: Set<string>;
  interactive?: boolean;
}) {
  const n = cards.length;
  if (n === 0) return null;

  // tilt angles from -maxSpread..+maxSpread
  const angles = cards.map((_, i) => {
    if (n === 1) return 0;
    const t = (i / (n - 1)) * 2 - 1; // -1..1
    return Math.round(t * maxSpread);
  });

  // horizontal offset per card due to overlap
  const step = Math.round(width * (1 - overlap));
  const totalW = step * (n - 1) + width;

  // simple curve (lift middle a bit)
  const yCurve = (i: number) => {
    if (!curved) return 0;
    const mid = (n - 1) / 2;
    const d = Math.abs(i - mid);
    return Math.round(-Math.pow((d / (mid || 1)), 2) * 10); // up to -10px at center
  };

  return (
    <div className="relative mx-auto" style={{ width: totalW }}>
      {cards.map((c, i) => {
        const k = cardKey(c);
        const left = i * step;
        const rotate = angles[i];
        const top = yCurve(i);
        const selected = selectedKeys?.has(k) ?? false;

        return (
          <div
            key={k}
            className="absolute"
            style={{
              left,
              top,
              transform: `rotate(${rotate}deg)`,
              transformOrigin: "50% 80%",
              zIndex: i + 1,
            }}
            onClick={() => interactive && onClickCard?.(c)}
          >
            <CardBadge card={c} width={width} highlight={selected} />
          </div>
        );
      })}
      {/* Reserve height so container doesn't collapse */}
      <div style={{ height: Math.round(width * 1.2) + 14 }} />
    </div>
  );
}
