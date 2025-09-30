import { useState, useCallback } from "react";
import { fetchPokemonBatch } from "@/services/pokemonApi";
import { generatePDF } from "@/services/pdfGenerator";
import { generateChecklistPDF } from "@/services/checklistPdfGenerator";
import { Pokemon, ProgressCallback } from "@/types";
import { showErrorToast } from "@/utils/errorHandler";
import { toast } from "sonner";

export const usePokemonData = () => {
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const loadPokemon = useCallback(async (
    generation: string,
    language: string,
    onProgress?: ProgressCallback
  ): Promise<Pokemon[]> => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Récupération des données Pokémon...");

    try {
      const pokemon = await fetchPokemonBatch(
        generation,
        language,
        (fetchProgress) => {
          setProgress(fetchProgress);
          onProgress?.(fetchProgress);
        }
      );

      setPokemonList(pokemon);
      setCurrentStep("Chargement terminé !");
      setProgress(100);
      
      toast.success(`${pokemon.length} Pokémon chargés avec succès !`);
      return pokemon;
    } catch (error) {
      showErrorToast(error, "loadPokemon");
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, []);

  const generatePokemonPDF = useCallback(async (
    generation: string,
    language: string,
    onProgress?: ProgressCallback
  ): Promise<void> => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Récupération des données Pokémon...");

    try {
      const pokemon = await fetchPokemonBatch(
        generation,
        language,
        (fetchProgress) => {
          setProgress(fetchProgress * 0.8);
          onProgress?.(fetchProgress * 0.8);
        }
      );

      setPokemonList(pokemon);
      setCurrentStep("Génération du PDF...");

      await generatePDF(
        pokemon,
        generation,
        language,
        (pdfProgress) => {
          const totalProgress = 80 + pdfProgress * 0.2;
          setProgress(totalProgress);
          onProgress?.(totalProgress);
        }
      );

      setCurrentStep("Terminé !");
      setProgress(100);
      
      toast.success("PDF généré avec succès !", {
        description: `${pokemon.length} Pokémon ont été ajoutés au PDF.`,
      });
    } catch (error) {
      showErrorToast(error, "generatePokemonPDF");
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, []);

  const generateChecklistPokemonPDF = useCallback(async (
    generation: string,
    language: string,
    onProgress?: ProgressCallback
  ): Promise<void> => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Récupération des données Pokémon...");
    
    try {
      const pokemonData = await fetchPokemonBatch(
        generation,
        language,
        (fetchProgress) => {
          if (fetchProgress <= 50) {
            setProgress(fetchProgress);
            onProgress?.(fetchProgress);
          }
        }
      );
      
      setCurrentStep("Génération du PDF checklist...");
      
      await generateChecklistPDF(
        pokemonData, 
        generation, 
        language, 
        (checklistProgress) => {
          const totalProgress = 50 + (checklistProgress * 0.5);
          setProgress(totalProgress);
          onProgress?.(totalProgress);
        }
      );
      
      setProgress(100);
      toast.success("PDF checklist généré avec succès !", {
        description: `Checklist de ${pokemonData.length} Pokémon créée.`,
      });
    } catch (error) {
      showErrorToast(error, "generateChecklistPokemonPDF");
      throw error;
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, []);

  return {
    pokemonList,
    isLoading,
    progress,
    currentStep,
    loadPokemon,
    generatePokemonPDF,
    generateChecklistPokemonPDF,
  };
};
