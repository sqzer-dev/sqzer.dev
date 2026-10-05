import { useEffect, useState } from 'react';

const KEY = 'panels';

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // storage is off: the choice lasts as long as the page
    return null;
  }
}

function store(choice: string) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // as above
  }
}

/**
 * Whether the glass is opaque by the reader's choice, and the way to change it (ADR-0003 D5).
 * `prefers-reduced-transparency` reaches the page in Chromium only, so the choice is a switch
 * in every browser. It starts on where the media query matches, and is kept on this device.
 */
export function useSolidPanels() {
  const [solid, setSolid] = useState(() => {
    const choice = stored();
    return choice === null ? matchMedia('(prefers-reduced-transparency: reduce)').matches : choice === 'solid';
  });

  // the stylesheet reads the choice from `<html>`, which React does not render
  useEffect(() => {
    document.documentElement.dataset['panels'] = solid ? 'solid' : 'glass';
  }, [solid]);

  const choose = (choice: boolean) => {
    store(choice ? 'solid' : 'glass');
    setSolid(choice);
  };
  return [solid, choose] as const;
}
