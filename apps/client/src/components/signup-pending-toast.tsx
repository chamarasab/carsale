'use client';

import { CheckCircle2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SignupPendingToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      router.replace('/', { scroll: false });
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  function close() {
    setVisible(false);
    router.replace('/', { scroll: false });
  }

  return (
    <div
      className="fixed right-4 top-20 z-50 flex w-[min(390px,calc(100vw-2rem))] items-start gap-3 rounded-panel border border-owl-green/35 bg-surface p-4 text-foreground shadow-theme"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 shrink-0 text-owl-green" size={21} />
      <div className="min-w-0 flex-1">
        <p className="font-black">Signup complete</p>
        <p className="mt-1 text-sm font-semibold text-muted">Wait for administrator approval before signing in.</p>
      </div>
      <button
        aria-label="Dismiss notification"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-panel text-muted hover:bg-field hover:text-foreground"
        onClick={close}
        type="button"
      >
        <X size={17} />
      </button>
    </div>
  );
}
