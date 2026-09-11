'use client';
import { useEffect, useRef, useState } from 'react';
import { MechanicalKeyAudio } from './key-sound';

const storageKey = 'ai-pad-key-sound-v1';
export function useKeySound() {
  const player = useRef<MechanicalKeyAudio | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(35);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (typeof saved?.enabled === 'boolean') setEnabled(saved.enabled);
        if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) setVolume(Math.max(0, Math.min(saved.volume, 100)));
      } catch { /* Optional preference; private browsing/storage denial is safe. */ }
    }, 0);
    return () => { clearTimeout(timer); player.current?.dispose(); player.current = null; };
  }, []);
  const save = (nextEnabled: boolean, nextVolume: number) => {
    if (!nextEnabled || nextVolume === 0) player.current?.stop();
    setEnabled(nextEnabled); setVolume(nextVolume);
    try { localStorage.setItem(storageKey, JSON.stringify({ enabled: nextEnabled, volume: nextVolume })); } catch { /* optional */ }
  };
  return {
    enabled, volume, unavailable,
    toggle: (value: boolean) => save(value, volume),
    changeVolume: (value: number) => save(enabled, value),
    play: () => {
      if (!enabled || !volume) return;
      const audio = player.current ?? (player.current = new MechanicalKeyAudio());
      void audio.play(volume / 100).then(ok => { if (player.current === audio) setUnavailable(!ok); });
    },
  };
}
