import { useCallback } from "react";

interface CacheOptions {
  key: string;
  duration?: number; // in milliseconds
}

export const useCache = () => {
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  const isCacheValid = useCallback((timestampKey: string, duration: number = CACHE_DURATION): boolean => {
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < duration;
  }, [CACHE_DURATION]);

  const getCache = useCallback(<T>(options: CacheOptions): T | null => {
    const { key, duration = CACHE_DURATION } = options;
    const timestampKey = `${key}-timestamp`;

    if (!isCacheValid(timestampKey, duration)) {
      return null;
    }

    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    try {
      return JSON.parse(cachedData) as T;
    } catch (error) {
      console.error("Error parsing cached data:", error);
      return null;
    }
  }, [isCacheValid, CACHE_DURATION]);

  const setCache = useCallback(<T>(key: string, data: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(`${key}-timestamp`, Date.now().toString());
    } catch (error) {
      console.error("Error setting cache:", error);
    }
  }, []);

  const clearCache = useCallback((pattern?: string): void => {
    if (!pattern) {
      localStorage.clear();
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  const clearSpecificCache = useCallback((key: string): void => {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-timestamp`);
  }, []);

  return {
    getCache,
    setCache,
    clearCache,
    clearSpecificCache,
    isCacheValid,
  };
};
