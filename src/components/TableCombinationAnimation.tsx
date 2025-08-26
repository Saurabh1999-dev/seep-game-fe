"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { CardDto } from "@/lib/types";

interface CombinationAnimation {
  id: string;
  cards: CardDto[];
  targetPosition: { x: number; y: number };
  startPositions: { x: number; y: number }[];
  combinedValue: number;
  onComplete?: () => void;
}

export function TableCombinationAnimation({ 
  animation 
}: { 
  animation: CombinationAnimation | null 
}) {
  if (!animation) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 pointer-events-none z-45">
        {/* Individual cards moving to center */}
        {animation.cards.map((card, index) => (
          <motion.div
            key={`${animation.id}-card-${index}`}
            initial={{
              x: animation.startPositions[index]?.x || 0,
              y: animation.startPositions[index]?.y || 0,
              scale: 1,
              opacity: 1
            }}
            animate={{
              x: animation.targetPosition.x,
              y: animation.targetPosition.y,
              scale: 0.8,
              opacity: 0.9
            }}
            transition={{
              duration: 1.2,
              delay: index * 0.2, // Stagger the animations
              ease: [0.25, 0.8, 0.25, 1],
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="absolute"
          >
            <PlayingCard 
              card={card} 
              width={60}
              className="border-2 border-purple-400 shadow-lg"
            //   style={{
            //     filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))"
            //   }}
            />
          </motion.div>
        ))}

        {/* Combined value indicator */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="absolute"
          style={{
            left: animation.targetPosition.x - 30,
            top: animation.targetPosition.y - 80
          }}
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold shadow-lg text-center"
          >
            <div className="text-lg">{animation.combinedValue}</div>
            <div className="text-xs opacity-90">Combined</div>
          </motion.div>
        </motion.div>

        {/* Combination effect particles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (360 / 8) * i;
          const radians = (angle * Math.PI) / 180;
          const distance = 60;
          
          return (
            <motion.div
              key={`particle-${i}`}
              initial={{
                x: animation.targetPosition.x,
                y: animation.targetPosition.y,
                scale: 0,
                opacity: 1
              }}
              animate={{
                x: animation.targetPosition.x + Math.cos(radians) * distance,
                y: animation.targetPosition.y + Math.sin(radians) * distance,
                scale: [0, 1, 0],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 1.0,
                delay: 1.2,
                ease: "easeOut"
              }}
              className="absolute w-2 h-2 bg-purple-400 rounded-full"
              style={{
                boxShadow: "0 0 6px #a855f7"
              }}
            />
          );
        })}
      </div>
    </AnimatePresence>
  );
}
