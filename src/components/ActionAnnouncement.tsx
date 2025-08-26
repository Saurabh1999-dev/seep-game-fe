"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ActionAnnouncement {
  id: string;
  playerSeat: number;
  playerName: string;
  actionType: "throw" | "capture" | "house" | "sweep";
  message: string;
  cards?: { handCard?: any; capturedCards?: any[] };
  duration?: number;
}

export function ActionAnnouncements({ 
  announcements 
}: { 
  announcements: ActionAnnouncement[] 
}) {
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      <AnimatePresence>
        {announcements.map((announcement, index) => (
          <ActionAnnouncementCard 
            key={announcement.id}
            announcement={announcement}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActionAnnouncementCard({ 
  announcement, 
  index 
}: { 
  announcement: ActionAnnouncement;
  index: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, announcement.duration || 3000);

    return () => clearTimeout(timer);
  }, [announcement.duration]);

  const bgColor = {
    throw: "bg-blue-500",
    capture: "bg-green-500", 
    house: "bg-purple-500",
    sweep: "bg-yellow-500"
  }[announcement.actionType];

  const icon = {
    throw: "🎯",
    capture: "✨",
    house: "🏠", 
    sweep: "💫"
  }[announcement.actionType];

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: index * 60, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ 
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-2xl max-w-md relative overflow-hidden`}
    >
      {/* Animated background gradient */}
      <motion.div
        animate={{
          x: [-100, 100],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
        style={{ opacity: 0.1 }}
      />
      
      <div className="relative z-10 flex items-center space-x-3">
        <motion.span 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          className="text-2xl"
        >
          {icon}
        </motion.span>
        
        <div>
          <div className="font-bold text-sm">{announcement.playerName}</div>
          <div className="text-sm opacity-90">{announcement.message}</div>
        </div>
        
        {announcement.actionType === "sweep" && (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity
            }}
            className="text-xl"
          >
            🌟
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
