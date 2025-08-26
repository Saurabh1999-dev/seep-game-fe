"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ErrorPopupProps {
  show: boolean;
  message: string;
  type?: "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

export function ErrorPopup({ 
  show, 
  message, 
  type = "error", 
  duration = 3000, 
  onClose 
}: ErrorPopupProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const bgColor = {
    error: "bg-red-500",
    warning: "bg-yellow-500", 
    info: "bg-blue-500"
  }[type];

  const icon = {
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  }[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ 
            type: "spring",
            duration: 0.5,
            stiffness: 300,
            damping: 25
          }}
          className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 1, -1, 0]
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.3, 0.7, 1]
            }}
            className={`${bgColor} text-white px-8 py-6 rounded-xl shadow-2xl max-w-md relative overflow-hidden`}
          >
            {/* Animated background pattern */}
            <motion.div
              animate={{
                x: [-20, 20, -20],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            />
            
            <div className="relative z-10 flex items-center space-x-4">
              <motion.span 
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: 2
                }}
                className="text-3xl"
              >
                {icon}
              </motion.span>
              
              <div>
                <div className="font-bold text-lg mb-1">
                  {type === "error" ? "Invalid Move!" : 
                   type === "warning" ? "Warning!" : "Info"}
                </div>
                <div className="text-sm opacity-90 leading-relaxed">
                  {message}
                </div>
              </div>
            </div>
            
            {/* Pulsing border */}
            <motion.div
              animate={{ 
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity
              }}
              className="absolute inset-0 border-4 border-white/30 rounded-xl pointer-events-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
