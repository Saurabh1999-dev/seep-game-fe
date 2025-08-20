"use client";

import { motion } from "framer-motion";
import React from "react";

export function ShuffleOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  // A simple “riffle” impression: two halves sliding and crossing a few times.
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="relative w-40 h-56">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 rounded-md bg-slate-300"
          initial={{ x: 0, rotate: -2 }}
          animate={{
            x: [0, 16, -12, 10, -8, 0],
            rotate: [-2, 4, -3, 3, -2, 0]
          }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 rounded-md bg-slate-100"
          initial={{ x: 0, rotate: 2 }}
          animate={{
            x: [0, -16, 12, -10, 8, 0],
            rotate: [2, -4, 3, -3, 2, 0]
          }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
