import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingSpinner({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="h-16 w-16 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
