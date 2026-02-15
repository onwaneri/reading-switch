/**
 * Simple audio cache hook
 * Caches generated audio in memory to avoid re-generation
 */

import { useState, useCallback, useRef } from 'react';

interface CachedAudio {
  word: string;
  audioUrl: string; // data URL
  timestamp: number;
}

interface UseAudioCacheReturn {
  selectedWord: string | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  loadWord: (word: string) => Promise<void>;
  playAudio: () => void;
  clearCache: () => void;
  cacheSize: number;
}

export function useAudioCache(): UseAudioCacheReturn {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState(0);

  // In-memory cache
  const cacheRef = useRef<Map<string, CachedAudio>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Load word audio (from cache or generate)
   */
  const loadWord = useCallback(async (word: string) => {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      setError('Invalid word');
      return;
    }

    setSelectedWord(normalizedWord);
    setError(null);
    setIsReady(false);

    // Stop and cleanup any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Helper: create an Audio element and wait until it's fully decoded
    const prepareAudio = (url: string): Promise<HTMLAudioElement> =>
      new Promise((resolve, reject) => {
        const el = new Audio(url);
        el.loop = false;
        el.preload = 'auto';
        el.addEventListener('canplaythrough', () => resolve(el), { once: true });
        el.addEventListener('error', () => reject(new Error('Audio decode failed')), { once: true });
        el.load();
      });

    // Check cache first
    const cached = cacheRef.current.get(normalizedWord);
    if (cached) {
      console.log(`Cache HIT: ${normalizedWord}`);

      audioRef.current = await prepareAudio(cached.audioUrl);
      setIsReady(true);
      return;
    }

    // Cache miss - generate
    console.log(`Cache MISS: ${normalizedWord}, generating...`);
    setIsLoading(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: normalizedWord }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `TTS generation failed: ${response.statusText}`);
      }

      const { audio, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      if (!audio) {
        throw new Error('No audio data received from API');
      }

      // Create data URL
      const audioUrl = `data:audio/mp3;base64,${audio}`;

      // Cache it
      cacheRef.current.set(normalizedWord, {
        word: normalizedWord,
        audioUrl,
        timestamp: Date.now(),
      });
      setCacheSize(cacheRef.current.size); // Update cache size state

      audioRef.current = await prepareAudio(audioUrl);
      setIsReady(true);
      console.log(`Cached: ${normalizedWord}, cache size: ${cacheRef.current.size}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Error loading audio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Play the currently loaded audio
   */
  const playAudio = useCallback(async () => {
    if (!audioRef.current || !isReady) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Playback error';
      setError(errorMsg);
      console.error('Error playing audio:', err);
    }
  }, [isReady]);

  /**
   * Clear all cached audio
   */
  const clearCache = useCallback(() => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    cacheRef.current.clear();
    setCacheSize(0); // Update cache size state
    setSelectedWord(null);
    setIsReady(false);
    setError(null);
    console.log('Cache cleared');
  }, []);

  return {
    selectedWord,
    isLoading,
    isReady,
    error,
    loadWord,
    playAudio,
    clearCache,
    cacheSize,
  };
}
