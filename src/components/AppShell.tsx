'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { DashboardPage } from './dashboard/DashboardPage';
import { TherapistPage } from './therapist/TherapistPage';
import { HabitsPage } from './habits/HabitsPage';
import { SettingsPage } from './settings/SettingsPage';
import { BrainPage } from './brain/BrainPage';
import { BottomNav } from './navigation/BottomNav';
import { DailyCheckIn } from './checkin/DailyCheckIn';
import { useCheckInStore } from '@/store/checkin';
import { useRelationshipsStore } from '@/store/relationships';
import { useSettingsStore } from '@/store/settings';
import { HealthPage } from './health/HealthPage';
import { FinancePage } from './finance/FinancePage';
import { ConsumptionPage } from './consumption/ConsumptionPage';
import { NutritionPage } from './nutrition/NutritionPage';
import { RelationshipsPage } from './relationships/RelationshipsPage';
import { LocationPage } from './location/LocationPage';
import { api, type AppOpenPromptPayload } from '@/lib/api';
import { LoginGate } from './auth/LoginGate';

type PageId =
  | 'dashboard'
  | 'health'
  | 'therapist'
  | 'habits'
  | 'brain'
  | 'nutrition'
  | 'relationships'
  | 'finance'
  | 'consumption'
  | 'location';

const pageDepth: Record<PageId, number> = {
  dashboard: 0,
  health: 1,
  therapist: 0,
  habits: 0,
  brain: 1,
  nutrition: 1,
  relationships: 1,
  finance: 1,
  consumption: 1,
  location: 1,
};

export function AppShell() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [direction, setDirection] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [therapistContext, setTherapistContext] = useState<string | null>(null);
  const [openPrompt, setOpenPrompt] = useState<AppOpenPromptPayload | null>(null);
  const [openPromptVisible, setOpenPromptVisible] = useState(false);
  const [settingsSourceId, setSettingsSourceId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedInToday = useCheckInStore((state) => state.hasCheckedInToday)();
  const checkInHydrated = useCheckInStore((state) => state.hydrated);
  const hydrateCheckIns = useCheckInStore((state) => state.hydrateFromApi);
  const applyCheckInDataMode = useCheckInStore((state) => state.applyDataMode);
  const applyRelationshipsDataMode = useRelationshipsStore((state) => state.applyDataMode);
  const dataMode = useSettingsStore((state) => state.dataMode);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    void api.getCurrentUser().then(() => {
      if (!active) return;
      setIsAuthenticated(true);
      setAuthChecked(true);
    }).catch(() => {
      void api.getAuthStatus().then((status) => {
        if (!active) return;
        setIsAuthenticated(!status.configured);
        setAuthChecked(true);
      }).catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setAuthChecked(true);
      });
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const shouldOpenSettings = searchParams.get('settings') === '1';
    const sourceId = searchParams.get('source');
    if (shouldOpenSettings) {
      setShowSettings(true);
      setSettingsSourceId(sourceId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!checkInHydrated) {
      void hydrateCheckIns();
    }
  }, [checkInHydrated, hydrateCheckIns, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void applyCheckInDataMode(dataMode);
    void applyRelationshipsDataMode();
  }, [applyCheckInDataMode, applyRelationshipsDataMode, dataMode, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !mounted || !checkInHydrated || !hasCheckedInToday) return;

    let active = true;
    void api.getOpenPrompt().then((prompt) => {
      if (!active) return;
      setOpenPrompt(prompt);
      setOpenPromptVisible(Boolean(prompt));
    }).catch(() => {
      if (!active) return;
      setOpenPrompt(null);
      setOpenPromptVisible(false);
    });

    return () => { active = false; };
  }, [isAuthenticated, mounted, checkInHydrated, hasCheckedInToday]);

  function navigateTo(page: PageId) {
    setDirection(pageDepth[page] >= pageDepth[currentPage] ? 1 : -1);
    setCurrentPage(page);
  }

  function navigateHome() {
    setDirection(-1);
    setCurrentPage('dashboard');
  }

  function navigateToTherapist(context?: string) {
    if (context) setTherapistContext(context);
    navigateTo('therapist');
  }

  function navigateToBrain() {
    setShowSettings(false);
    navigateTo('brain');
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // best effort
    } finally {
      setShowSettings(false);
      setIsAuthenticated(false);
    }
  }

  async function dismissOpenPrompt() {
    if (!openPrompt) return;
    setOpenPromptVisible(false);
    try {
      await api.dismissOpenPrompt(openPrompt.promptKey);
    } catch {
      // best effort
    }
  }

  async function completeOpenPrompt() {
    if (!openPrompt) return;
    setOpenPromptVisible(false);
    try {
      await api.completeOpenPrompt(openPrompt.promptKey);
    } catch {
      // best effort
    }

    const targetPage = openPrompt.targetPage as PageId | 'dashboard';
    if (targetPage === 'therapist' && openPrompt.question) {
      navigateToTherapist(openPrompt.question);
      return;
    }

    if (targetPage in pageDepth) {
      navigateTo(targetPage as PageId);
    }
  }

  let currentContent: React.ReactNode = null;
  switch (currentPage) {
    case 'dashboard':
      currentContent = (
        <DashboardPage
          onSettings={() => setShowSettings(true)}
          onOpenBrain={navigateToBrain}
          onNavigateToTherapist={navigateToTherapist}
          onOpenDomain={(page) => navigateTo(page)}
        />
      );
      break;
    case 'health':
      currentContent = <HealthPage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
    case 'therapist':
      currentContent = (
        <TherapistPage
          onSettings={() => setShowSettings(true)}
          preloadedContext={therapistContext}
          onClearContext={() => setTherapistContext(null)}
        />
      );
      break;
    case 'habits':
      currentContent = <HabitsPage onSettings={() => setShowSettings(true)} />;
      break;
    case 'brain':
      currentContent = <BrainPage onBack={navigateHome} />;
      break;
    case 'nutrition':
      currentContent = <NutritionPage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
    case 'relationships':
      currentContent = <RelationshipsPage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
    case 'finance':
      currentContent = <FinancePage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
    case 'consumption':
      currentContent = <ConsumptionPage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
    case 'location':
      currentContent = <LocationPage onBack={navigateHome} onSettings={() => setShowSettings(true)} onTalkAboutThis={navigateToTherapist} />;
      break;
  }

  const showBottomNav = true;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Checking session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col w-full" style={{ height: '100dvh', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            className="absolute inset-0"
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          >
            {currentContent}
          </motion.div>
        </AnimatePresence>
      </div>

      {showBottomNav && (
        <BottomNav
          current={currentPage}
          onNavigate={(page) => navigateTo(page)}
        />
      )}

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
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>
              <SettingsPage
                onBack={() => {
                  setShowSettings(false);
                  setSettingsSourceId(null);
                }}
                onOpenBrain={navigateToBrain}
                requestedSourceId={settingsSourceId}
                onLogout={handleLogout}
                onSourceRequestHandled={() => setSettingsSourceId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openPrompt && openPromptVisible && mounted && checkInHydrated && hasCheckedInToday && (
          <motion.div
            className="fixed inset-x-4 bottom-24 z-30 rounded-[28px] p-4"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(82,183,136,0.12)' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{openPrompt.title}</p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {openPrompt.question}
                  </p>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {openPrompt.supportingText}
                  </p>
                </div>
              </div>
              <button onClick={() => { void dismissOpenPrompt(); }} className="p-2 rounded-xl" aria-label="Dismiss app open prompt">
                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { void dismissOpenPrompt(); }}
                className="flex-1 h-11 rounded-2xl font-medium"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              >
                Not now
              </button>
              <button
                onClick={() => { void completeOpenPrompt(); }}
                className="flex-1 h-11 rounded-2xl font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
              >
                {openPrompt.primaryLabel}
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mounted && checkInHydrated && !hasCheckedInToday && <DailyCheckIn onComplete={() => navigateHome()} />}
    </div>
  );
}
