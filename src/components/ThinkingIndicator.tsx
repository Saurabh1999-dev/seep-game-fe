"use client";

import { motion, AnimatePresence } from "framer-motion";

export function ThinkingIndicator({ 
  show, 
  playerSeat, 
  playerName,
  position 
}: { 
  show: boolean;
  playerSeat: number;
  playerName: string;
  position: { x: number; y: number };
}) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3 }}
        className="absolute pointer-events-none z-40"
        style={{
          left: position.x - 60,
          top: position.y - 100,
          width: 120,
          textAlign: "center"
        }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotateZ: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="bg-gray-700 text-white px-4 py-2 rounded-full text-xs shadow-lg"
        >
          <div className="flex items-center justify-center space-x-1">
            <span>{playerName} is thinking</span>
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ 
                duration: 1,
                repeat: Infinity 
              }}
              className="flex space-x-1"
            >
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Thought bubble effect */}
        <motion.div
          animate={{ 
            y: [0, -5, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-2 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [0, -3, 0],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 -ml-2"
        >
          <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
