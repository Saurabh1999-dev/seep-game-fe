"use client";
import { motion, AnimatePresence } from "framer-motion";

export function ActionToast({
  show,
  text
}: {
  show: boolean;
  text: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute left-1/2 top-4 -translate-x-1/2 z-50"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="px-3 py-1.5 rounded bg-black/70 text-emerald-100 text-xs border border-emerald-700 shadow">
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
