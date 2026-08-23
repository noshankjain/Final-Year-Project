import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * PageTransition — wraps page content with a fast fade-up entrance.
 * Layout (Sidebar + Navbar) does NOT animate — only page content does.
 * Duration: 0.28s max — fast enough to feel snappy, not cinematic.
 * Respects prefers-reduced-motion.
 */
const PageTransition = ({ children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
