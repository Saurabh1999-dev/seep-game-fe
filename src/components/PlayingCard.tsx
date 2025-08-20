"use client";

import React from "react";
import type { CardDto } from "@/lib/types";
import { motion } from "framer-motion";

function normalizeRank(rank: string | undefined, value: number): string {
  if (!rank) return String(value); // fallback if rank is missing
  const r = rank.toLowerCase();
  if (r.startsWith("ace")) return "A";
  if (r.startsWith("jack")) return "J";
  if (r.startsWith("queen")) return "Q";
  if (r.startsWith("king")) return "K";
  if (value >= 2 && value <= 10) return String(value);
  return rank.slice(0, 1).toUpperCase();
}


function suitSymbol(suit: string): string {
  switch (suit) {
    case "Spades": return "♠";
    case "Hearts": return "♥";
    case "Diamonds": return "♦";
    case "Clubs": return "♣";
    default: return "🂠";
  }
}

function isRedSuit(suit: string): boolean {
  return suit === "Hearts" || suit === "Diamonds";
}

export type PlayingCardProps = {
  card: any;
  width?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  tiltDeg?: number;
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  width = 60,
  selected = false,
  onClick,
  className = "",
  tiltDeg = 0
}) => {
  const rank = normalizeRank(card.rank, card.value);
  const suit = suitSymbol(card.suit);
  const red = isRedSuit(card.suit);

  const aspect = 1.4;
  const height = Math.round(width * aspect);

  return (
    <motion.button
      onClick={onClick}
      className={`relative rounded-lg bg-white border shadow-sm select-none ${className}`}
      style={{
        width,
        height,
        borderColor: "rgba(0,0,0,0.2)",
        transform: `rotate(${tiltDeg}deg)`,
      }}
      whileHover={{ y: -4, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      title={`${card.rank} of ${card.suit}`}
    >
      {/* selection ring */}
      {selected && (
        <span className="absolute -inset-1 rounded-xl ring-2 ring-yellow-400 pointer-events-none" />
      )}

      {/* corner top-left */}
      <div
        className="absolute top-1 left-1 leading-none text-center"
        style={{ color: red ? "#C1121F" : "#111827" }}
      >
        <div className="font-bold" style={{ fontSize: width * 0.28 }}>{rank}</div>
        <div style={{ fontSize: width * 0.24 }}>{suit}</div>
      </div>

      {/* corner bottom-right (rotated) */}
      <div
        className="absolute bottom-1 right-1 leading-none text-center rotate-180"
        style={{ color: red ? "#C1121F" : "#111827" }}
      >
        <div className="font-bold" style={{ fontSize: width * 0.28 }}>{rank}</div>
        <div style={{ fontSize: width * 0.24 }}>{suit}</div>
      </div>

      {/* center suit (big) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: red ? "#C1121F" : "#111827", fontSize: width * 0.6 }}
      >
        {suit}
      </div>
    </motion.button>
  );
};
