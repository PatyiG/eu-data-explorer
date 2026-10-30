import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** Tracks the operating system's light/dark preference as a signal. */
export function injectPrefersDark(): Signal<boolean> {
  const query = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  const dark = signal(query?.matches ?? false);
  if (query) {
    const onChange = (e: MediaQueryListEvent) => dark.set(e.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }
  return dark.asReadonly();
}
