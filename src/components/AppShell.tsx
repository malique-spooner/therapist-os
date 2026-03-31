'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeContainer } from './navigation/SwipeContainer';
import { DashboardPage } from './dashboard/DashboardPage';
import { TherapistPage } from './therapist/TherapistPage';
import { HabitsPage } from './habits/HabitsPage';
import { SettingsPage } from './settings/SettingsPage';

// Page order: Dashboard(0) → AI Therapist(1) → Habits(2) → (Settings is a modal slide-up)
const PAGE_LABELS = ['Dashboard', 'Therapist', 'Habits'];

export function AppShell() {
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [therapistContext, setTherapistContext] = useState<string | null>(null);

  function navigateToTherapist(context?: string) {
    if (context) setTherapistContext(context);
    setCurrentPage(1);
  }

  const pages = [
    <DashboardPage
      key="dashboard"
      onSettings={() => setShowSettings(true)}
      onNavigateToTherapist={navigateToTherapist}
    />,
    <TherapistPage
      key="therapist"
      onBack={() => setCurrentPage(0)}
      preloadedContext={currentPage === 1 ? therapistContext : null}
      onClearContext={() => setTherapistContext(null)}
    />,
    <HabitsPage
      key="habits"
      onSettings={() => setShowSettings(true)}
    />,
  ];

  return (
    <div className="flex flex-col w-full" style={{ height: '100dvh', backgroundColor: 'var(--color-surface)' }}>
      {/* Main page area */}
      <div className="flex-1 overflow-hidden">
        <SwipeContainer
          pages={pages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Bottom nav dots */}
      <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-center gap-6 py-2">
          {PAGE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setCurrentPage(i)}
              className="flex flex-col items-center gap-1 px-2 py-1 active:scale-90 transition-transform"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                animate={{ scale: currentPage === i ? 1.4 : 1, backgroundColor: currentPage === i ? 'var(--color-primary)' : 'var(--color-border)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
              <span className="text-xs font-medium" style={{ color: currentPage === i ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: 10 }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings modal slide-up */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden"
              style={{ height: '92dvh', backgroundColor: 'var(--color-surface)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>
              <SettingsPage onBack={() => setShowSettings(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
