import { Suspense } from 'react';

import { AppShell } from '@/components/AppShell';

export default function LocationDeepLinkPage() {
  return (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
}
