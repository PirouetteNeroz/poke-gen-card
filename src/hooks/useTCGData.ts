import { useState, useCallback, useEffect } from "react";
import { pokemonTCGAPI, type PokemonSet, type PokemonCard } from "@/services/pokemonTcgApi";
import { tcgdexAPI, type TCGdexSeries, type TCGdexSet, type TCGdexCard } from "@/services/tcgdexApi";
import { APIService, Language, ProgressCallback } from "@/types";
import { useCache } from "./useCache";
import { showErrorToast, retryWithBackoff } from "@/utils/errorHandler";
import { toast } from "sonner";

interface PokemonSeries {
  name: string;
  sets: PokemonSet[];
}

export const useTCGData = (apiService: APIService, language: Language) => {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [tcgdexSets, setTcgdexSets] = useState<TCGdexSet[]>([]);
  const [pokemonSeries, setPokemonSeries] = useState<PokemonSeries[]>([]);
  const [tcgdexSeries, setTcgdexSeries] = useState<TCGdexSeries[]>([]);
  const [currentTcgdexSets, setCurrentTcgdexSets] = useState<TCGdexSet[]>([]);
  const [tcgCards, setTcgCards] = useState<PokemonCard[]>([]);
  const [tcgdexCards, setTcgdexCards] = useState<TCGdexCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const { getCache, setCache, clearCache } = useCache();

  const organizePokemonSeries = useCallback((sets: PokemonSet[]): PokemonSeries[] => {
    const seriesMap = new Map<string, PokemonSet[]>();
    
    sets.forEach(set => {
      const seriesName = set.series;
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)!.push(set);
    });
    
    const series = Array.from(seriesMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => 
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
      )
    }));
    
    return series.sort((a, b) => {
      const dateA = new Date(a.sets[0]?.releaseDate || '1999-01-01').getTime();
      const dateB = new Date(b.sets[0]?.releaseDate || '1999-01-01').getTime();
      return dateA - dateB;
    });
  }, []);

  const loadPokemonSets = useCallback(async () => {
    setIsLoading(true);
    setCurrentStep("Loading Pokémon sets...");
    
    try {
      const cacheKey = 'pokemon-tcg-sets-cache';
      let setsList = getCache<PokemonSet[]>({ key: cacheKey });
      
      if (!setsList) {
        setCurrentStep("Loading from API...");
        setsList = await retryWithBackoff(() => pokemonTCGAPI.getSets(), 3);
        setCache(cacheKey, setsList);
      } else {
        setCurrentStep("Sets loaded from cache...");
      }
      
      setSets(setsList);
      const organizedSeries = organizePokemonSeries(setsList);
      setPokemonSeries(organizedSeries);
      
      setCurrentStep("Pokémon sets organized by series!");
      toast.success(`${setsList.length} Pokémon sets found!`);
    } catch (error) {
      showErrorToast(error, "loadPokemonSets");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  }, [getCache, setCache, organizePokemonSeries]);

  const loadTCGdexSets = useCallback(async () => {
    setIsLoading(true);
    setCurrentStep("Loading TCG series...");
    
    try {
      const cacheKey = `tcgdex-series-cache-${language}`;
      let seriesList = getCache<TCGdexSeries[]>({ key: cacheKey });
      
      if (!seriesList) {
        setCurrentStep("Loading from API...");
        seriesList = await retryWithBackoff(
          () => tcgdexAPI.getSeries(language), 
          3
        );
        setCache(cacheKey, seriesList);
      } else {
        setCurrentStep("Series loaded from cache...");
      }
      
      setTcgdexSeries(seriesList);
      setCurrentStep("TCG series loaded!");
      toast.success(`${seriesList.length} TCG series found!`);
    } catch (error) {
      showErrorToast(error, "loadTCGdexSets");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  }, [language, getCache, setCache]);

  const loadPokemonCards = useCallback(async (setId: string) => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Loading cards...");
    
    try {
      const cacheKey = `pokemon-tcg-cards-${setId}`;
      let cardsList = getCache<PokemonCard[]>({ key: cacheKey });
      
      if (!cardsList) {
        setCurrentStep("Loading cards from API...");
        setProgress(25);
        cardsList = await retryWithBackoff(
          () => pokemonTCGAPI.getCards(setId), 
          3
        );
        setCache(cacheKey, cardsList);
        setProgress(75);
      } else {
        setCurrentStep("Cards loaded from cache...");
        setProgress(50);
      }
      
      setTcgCards(cardsList);
      setProgress(100);
      setCurrentStep("Cards loaded successfully!");
      toast.success(`${cardsList.length} cards loaded!`);
    } catch (error) {
      showErrorToast(error, "loadPokemonCards");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [getCache, setCache]);

  const loadTCGdexCards = useCallback(async (setId: string) => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Loading cards...");
    
    try {
      const cacheKey = `tcgdex-cards-${setId}-${language}`;
      let cardsList = getCache<TCGdexCard[]>({ key: cacheKey });
      
      if (!cardsList) {
        setCurrentStep("Loading cards from API...");
        setProgress(25);
        cardsList = await retryWithBackoff(
          () => tcgdexAPI.getCards(setId, language), 
          3
        );
        setCache(cacheKey, cardsList);
        setProgress(75);
      } else {
        setCurrentStep("Cards loaded from cache...");
        setProgress(50);
      }
      
      setTcgdexCards(cardsList);
      setProgress(100);
      setCurrentStep("Cards loaded successfully!");
      toast.success(`${cardsList.length} cards loaded!`);
    } catch (error) {
      showErrorToast(error, "loadTCGdexCards");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [language, getCache, setCache]);

  const loadCards = useCallback(async (setId: string) => {
    if (!setId) {
      toast.error("Please select a set first");
      return;
    }

    if (apiService === "pokemon-tcg") {
      await loadPokemonCards(setId);
    } else {
      await loadTCGdexCards(setId);
    }
  }, [apiService, loadPokemonCards, loadTCGdexCards]);

  const clearAllCache = useCallback(() => {
    clearCache();
    setSets([]);
    setTcgdexSets([]);
    setPokemonSeries([]);
    setTcgdexSeries([]);
    setCurrentTcgdexSets([]);
    setTcgCards([]);
    setTcgdexCards([]);
    toast.success("Cache cleared successfully!");
  }, [clearCache]);

  // Load sets when service or language changes
  useEffect(() => {
    if (apiService === "pokemon-tcg") {
      loadPokemonSets();
    } else {
      loadTCGdexSets();
    }
  }, [apiService, language, loadPokemonSets, loadTCGdexSets]);

  return {
    sets,
    tcgdexSets,
    pokemonSeries,
    tcgdexSeries,
    currentTcgdexSets,
    setCurrentTcgdexSets,
    tcgCards,
    tcgdexCards,
    isLoading,
    progress,
    currentStep,
    loadCards,
    clearAllCache,
  };
};
