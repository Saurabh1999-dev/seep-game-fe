"use client";

import { motion, AnimatePresence } from "framer-motion";

interface BotPersonality {
  name: string;
  aggressiveness: number;
  riskTolerance: number;
  houseFocus: number;
}

export function ActionToast({
  show,
  text,
  botName,
  personality,
  actionTime
}: {
  show: boolean;
  text: string;
  botName?: string;
  personality?: BotPersonality;
  actionTime?: number;
}) {
  if (!show) return null;

  const personalityColor = personality ? getPersonalityColor(personality) : "bg-blue-500";
  const personalityIcon = personality ? getPersonalityIcon(personality) : "🤖";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`${personalityColor} text-white px-6 py-3 rounded-lg shadow-2xl max-w-md`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{personalityIcon}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {botName || "Bot"}
                  {personality && (
                    <span className="ml-2 text-xs opacity-75">
                      ({getPersonalityDescription(personality)})
                    </span>
                  )}
                </div>
                <div className="text-sm">{text}</div>
                {actionTime && (
                  <div className="text-xs opacity-75 mt-1">
                    Decided in {actionTime}ms
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getPersonalityColor(personality: BotPersonality): string {
  if (personality.aggressiveness > 0.7) return "bg-red-500";
  if (personality.aggressiveness < 0.3) return "bg-green-500";
  return "bg-blue-500";
}

function getPersonalityIcon(personality: BotPersonality): string {
  if (personality.aggressiveness > 0.7) return "⚡";
  if (personality.aggressiveness < 0.3) return "🛡️";
  return "⚖️";
}

function getPersonalityDescription(personality: BotPersonality): string {
  if (personality.aggressiveness > 0.7) return "Aggressive";
  if (personality.aggressiveness < 0.3) return "Cautious";
  return "Balanced";
}