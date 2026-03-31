'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';

interface SwipeContainerProps {
  pages: React.ReactNode[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function SwipeContainer({ pages, currentPage, onPageChange }: SwipeContainerProps) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.TouchEvent | React.PointerEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    isDragging.current = true;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent | React.PointerEvent) => {
    if (!isDragging.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragX(clientX - startX.current);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = 50;

    if (dragX < -threshold && currentPage < pages.length - 1) {
      onPageChange(currentPage + 1);
    } else if (dragX > threshold && currentPage > 0) {
      onPageChange(currentPage - 1);
    }
    setDragX(0);
  }, [dragX, currentPage, pages.length, onPageChange]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentPage}
          className="absolute inset-0"
          initial={{ x: dragX > 0 ? '-100%' : '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dragX > 0 ? '100%' : '-100%', opacity: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          style={{ x: isDragging.current ? dragX * 0.4 : 0 }}
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
