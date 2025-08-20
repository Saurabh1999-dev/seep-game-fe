// File: src/components/DealAnimator.tsx
"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { CardDto } from "@/lib/types";
import { PlayingCard } from "@/components/PlayingCard";
import { cardKey } from "@/lib/ui/cards";

type Seat = 0 | 1 | 2 | 3;

export type DealStep = {
  seat: Seat;
  index: number;
  card: CardDto;
};

export function DealAnimator({
  active,
  steps,
  deckCenter,
  seatTargets,
  onComplete
}: {
  active: boolean;
  steps: DealStep[];
  deckCenter: { x: number; y: number };
  seatTargets: Record<0 | 1 | 2 | 3, { x: number; y: number }>;
  onComplete?: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) return;
    setCurrent(0);
    setVisible(true);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (current >= steps.length) {
      const t = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 150);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), 140);
    return () => clearTimeout(t);
  }, [active, current, steps.length, onComplete]);

  if (!active || !visible) return null;

  const showSteps = steps.slice(0, current + 1);

  return (
    <>
      {showSteps.map((s, i) => {
        const to = seatTargets[s.seat];
        return (
          <motion.div
            key={`${cardKey(s.card)}-${i}`}
            initial={{ x: deckCenter.x, y: deckCenter.y, scale: 0.9, opacity: 0.9 }}
            animate={{ x: to.x, y: to.y, scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <PlayingCard card={s.card} width={52} />
          </motion.div>
        );
      })}
    </>
  );
}
