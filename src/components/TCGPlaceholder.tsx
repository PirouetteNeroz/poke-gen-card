import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, FileText, Search, Sparkles, Key, AlertCircle } from "lucide-react";
import { generateTCGPDF } from "@/services/tcgPdfGenerator";
import { pokemonTCGAPI, type PokemonSet, type PokemonCard } from "@/services/pokemonTcgApi";
import { tcgdxAPI, type TCGdxSet, type TCGdxCard } from "@/services/tcgdxApi";
import { LanguageSelector } from "@/components/LanguageSelector";

interface PokemonSeries {
  name: string;
  sets: PokemonSet[];
}

interface TCGdxSeries {
  name: string;
  sets: TCGdxSet[];
}

const TCGPlaceholder = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [setType, setSetType] = useState<"complete" | "master">("complete");
  const [apiService, setApiService] = useState<"pokemon-tcg" | "tcgdx">("pokemon-tcg");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [tcgdxSets, setTcgdxSets] = useState<TCGdxSet[]>([]);
  const [pokemonSeries, setPokemonSeries] = useState<PokemonSeries[]>([]);
  const [tcgdxSeries, setTcgdxSeries] = useState<TCGdxSeries[]>([]);
  const [tcgCards, setTcgCards] = useState<PokemonCard[]>([]);
  const [tcgdxCards, setTcgdxCards] = useState<TCGdxCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  // Cache pour les sets et cartes
  const CACHE_KEYS = {
    SETS: 'pokemon-tcg-sets-cache',
    CARDS: 'pokemon-tcg-cards-cache',
    SETS_TIMESTAMP: 'pokemon-tcg-sets-timestamp',
    CARDS_TIMESTAMP: 'pokemon-tcg-cards-timestamp'
  };

  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

  useEffect(() => {
    const savedApiKey = localStorage.getItem('pokemon-tcg-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      pokemonTCGAPI.setApiKey(savedApiKey);
    }
    loadSets();
  }, [apiService, selectedLanguage]);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error("Veuillez saisir votre clé API");
      return;
    }
    
    localStorage.setItem('pokemon-tcg-api-key', apiKey);
    pokemonTCGAPI.setApiKey(apiKey);
    toast.success("Clé API configurée avec succès !");
  };

  const organizePokemonSeries = (sets: PokemonSet[]) => {
    const seriesMap = new Map<string, PokemonSet[]>();
    
    sets.forEach(set => {
      const seriesName = set.series;
      
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)!.push(set);
    });
    
    // Convertir en tableau et trier par date de sortie
    const series = Array.from(seriesMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
    }));
    
    // Trier les séries par la date de sortie du premier set
    return series.sort((a, b) => {
      const dateA = new Date(a.sets[0]?.releaseDate || '1999-01-01').getTime();
      const dateB = new Date(b.sets[0]?.releaseDate || '1999-01-01').getTime();
      return dateA - dateB;
    });
  };

  const organizeTCGdxSeries = (sets: TCGdxSet[]) => {
    const seriesMap = new Map<string, TCGdxSet[]>();
    
    sets.forEach(set => {
      const seriesName = set.serie;
      
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)!.push(set);
    });
    
    // Convertir en tableau et trier par date de sortie
    const series = Array.from(seriesMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
    }));
    
    // Trier les séries par la date de sortie du premier set
    return series.sort((a, b) => {
      const dateA = new Date(a.sets[0]?.releaseDate || '1999-01-01').getTime();
      const dateB = new Date(b.sets[0]?.releaseDate || '1999-01-01').getTime();
      return dateA - dateB;
    });
  };

  const isCacheValid = (timestampKey: string) => {
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp) < CACHE_DURATION;
  };

  const loadSets = async () => {
    if (apiService === "pokemon-tcg") {
      await loadPokemonSets();
    } else {
      await loadTCGdxSets();
    }
  };

  const loadPokemonSets = async () => {
    setIsLoading(true);
    setCurrentStep("Loading Pokémon sets...");
    
    try {
      let setsList: PokemonSet[];
      
      // Vérifier le cache
      if (isCacheValid(CACHE_KEYS.SETS_TIMESTAMP)) {
        const cachedSets = localStorage.getItem(CACHE_KEYS.SETS);
        if (cachedSets) {
          setsList = JSON.parse(cachedSets);
          setCurrentStep("Sets loaded from cache...");
        } else {
          throw new Error("Invalid cache");
        }
      } else {
        // Charger depuis l'API avec retry
        setCurrentStep("Loading from API...");
        setsList = await fetchWithRetry(() => pokemonTCGAPI.getSets(), 3);
        
        // Sauvegarder en cache
        localStorage.setItem(CACHE_KEYS.SETS, JSON.stringify(setsList));
        localStorage.setItem(CACHE_KEYS.SETS_TIMESTAMP, Date.now().toString());
      }
      
      setSets(setsList);
      
      // Organiser par séries
      const organizedSeries = organizePokemonSeries(setsList);
      setPokemonSeries(organizedSeries);
      
      setCurrentStep("Pokémon sets organized by series!");
      toast.success(`${setsList.length} Pokémon sets found and organized by series!`);
    } catch (error) {
      console.error("Error loading sets:", error);
      toast.error(error instanceof Error ? error.message : "Connection error. Check your internet connection.");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  const loadTCGdxSets = async () => {
    setIsLoading(true);
    setCurrentStep("Loading TCG sets...");
    
    try {
      let setsList: TCGdxSet[];
      
      // Check cache
      const cacheKey = `tcgdx-sets-cache-${selectedLanguage}`;
      const timestampKey = `tcgdx-sets-timestamp-${selectedLanguage}`;
      
      if (isCacheValid(timestampKey)) {
        const cachedSets = localStorage.getItem(cacheKey);
        if (cachedSets) {
          setsList = JSON.parse(cachedSets);
          setCurrentStep("Sets loaded from cache...");
        } else {
          throw new Error("Invalid cache");
        }
      } else {
        // Load from API with retry
        setCurrentStep("Loading from API...");
        setsList = await fetchWithRetry(() => tcgdxAPI.getSets(selectedLanguage), 3);
        
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(setsList));
        localStorage.setItem(timestampKey, Date.now().toString());
      }
      
      setTcgdxSets(setsList);
      
      // Organize by series
      const organizedSeries = organizeTCGdxSeries(setsList);
      setTcgdxSeries(organizedSeries);
      
      setCurrentStep("TCG sets organized by series!");
      toast.success(`${setsList.length} TCG sets found and organized by series!`);
    } catch (error) {
      console.error("Error loading TCG sets:", error);
      toast.error(error instanceof Error ? error.message : "Connection error. Check your internet connection.");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  const fetchWithRetry = async (fn: () => Promise<any>, retries: number): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        setCurrentStep(`Retry ${i + 2}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Délai croissant
      }
    }
  };

  const handleLoadCards = async () => {
    if (!selectedSet) {
      toast.error("Please select a set first");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Loading cards...");

    try {
      if (apiService === "pokemon-tcg") {
        await loadPokemonCards();
      } else {
        await loadTCGdxCards();
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      toast.error("Connection error. Check your internet connection.");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const loadPokemonCards = async () => {
    const cacheKey = `${CACHE_KEYS.CARDS}-${selectedSet}`;
    const timestampKey = `${CACHE_KEYS.CARDS_TIMESTAMP}-${selectedSet}`;
    
    let cardsList: PokemonCard[];
    
    if (isCacheValid(timestampKey)) {
      const cachedCards = localStorage.getItem(cacheKey);
      if (cachedCards) {
        cardsList = JSON.parse(cachedCards);
        setCurrentStep("Cards loaded from cache...");
        setProgress(50);
      } else {
        throw new Error("Invalid cache");
      }
    } else {
      setCurrentStep("Loading cards from API...");
      setProgress(25);
      
      cardsList = await fetchWithRetry(() => pokemonTCGAPI.getCards(selectedSet), 3);
      
      localStorage.setItem(cacheKey, JSON.stringify(cardsList));
      localStorage.setItem(timestampKey, Date.now().toString());
      setProgress(75);
    }
    
    setTcgCards(cardsList);
    setProgress(100);
    setCurrentStep("Cards loaded successfully!");
    toast.success(`${cardsList.length} cards loaded for the selected set!`);
  };

  const loadTCGdxCards = async () => {
    const cacheKey = `tcgdx-cards-cache-${selectedSet}-${selectedLanguage}`;
    const timestampKey = `tcgdx-cards-timestamp-${selectedSet}-${selectedLanguage}`;
    
    let cardsList: TCGdxCard[];
    
    if (isCacheValid(timestampKey)) {
      const cachedCards = localStorage.getItem(cacheKey);
      if (cachedCards) {
        cardsList = JSON.parse(cachedCards);
        setCurrentStep("Cards loaded from cache...");
        setProgress(50);
      } else {
        throw new Error("Invalid cache");
      }
    } else {
      setCurrentStep("Loading cards from API...");
      setProgress(25);
      
      cardsList = await fetchWithRetry(() => tcgdxAPI.getCards(selectedSet, selectedLanguage), 3);
      
      localStorage.setItem(cacheKey, JSON.stringify(cardsList));
      localStorage.setItem(timestampKey, Date.now().toString());
      setProgress(75);
    }
    
    setTcgdxCards(cardsList);
    setProgress(100);
    setCurrentStep("Cards loaded successfully!");
    toast.success(`${cardsList.length} cards loaded for the selected set!`);
  };

  const handleGeneratePDF = async (pdfType: "sprites" | "complete" | "master" | "graded") => {
    const currentCards = apiService === "pokemon-tcg" ? tcgCards : tcgdxCards;
    const currentSets = apiService === "pokemon-tcg" ? sets : tcgdxSets;
    
    if (currentCards.length === 0) {
      toast.error("Please load cards first");
      return;
    }

    const selectedSetData = currentSets.find(set => set.id === selectedSet);
    if (!selectedSetData) return;

    setIsLoading(true);
    setProgress(0);
    
    const stepMessages = {
      sprites: "Generating PDF with Pokémon sprites...",
      complete: "Generating Complete Set PDF (3x3)...", 
      master: "Generating Master Set PDF (with reverses)...",
      graded: "Generating Graded PDF (special cards)..."
    };
    
    setCurrentStep(stepMessages[pdfType]);

    try {
      // Convert cards to the format expected by PDF generator
      let cardsForPDF = currentCards.filter(card => {
        if (pdfType === "graded") {
          // For graded: exclude Common, Uncommon, Rare and Double Rare
          return !["Common", "Uncommon", "Rare", "Double Rare", "ACE SPEC Rare"].includes(card.rarity);
        }
        return true;
      }).map(card => {
        if (apiService === "pokemon-tcg") {
          const pokemonCard = card as PokemonCard;
          return {
            id: pokemonCard.id,
            name: pokemonCard.name,
            number: pokemonCard.number,
            rarity: pokemonCard.rarity,
            set: {
              name: pokemonCard.set.name,
              series: pokemonCard.set.series
            },
            images: pokemonCard.images
          };
        } else {
          const tcgdxCard = card as TCGdxCard;
          return {
            id: tcgdxCard.id,
            name: tcgdxCard.name,
            number: tcgdxCard.localId,
            rarity: tcgdxCard.rarity,
            set: {
              name: tcgdxCard.set.name,
              series: tcgdxCard.set.serie
            },
            images: {
              small: tcgdxCard.image,
              large: tcgdxCard.image
            }
          };
        }
      });

      // Pour master set, ajouter les cartes reverse à côté de chaque carte normale
      if (pdfType === "master") {
        const newCardsForPDF = [];
        
        for (const card of cardsForPDF) {
          // Ajouter la carte normale
          newCardsForPDF.push(card);
          
          // Si c'est une carte Common, Uncommon ou Rare, ajouter sa version reverse à côté
          if (["Common", "Uncommon", "Rare"].includes(card.rarity)) {
            newCardsForPDF.push({
              ...card,
              id: card.id + "_reverse",
              name: card.name + " (Reverse)",
              isReverse: true
            });
          }
        }
        
        cardsForPDF = newCardsForPDF;
      }

      await generateTCGPDF(
        cardsForPDF,
        selectedSetData.name,
        pdfType,
        (pdfProgress) => {
          setProgress(pdfProgress);
        }
      );

      setCurrentStep("PDF generated!");
      
      const successMessages = {
        sprites: "PDF with Pokémon sprites generated successfully!",
        complete: "Complete Set PDF generated successfully!",
        master: "Master Set PDF generated successfully!",
        graded: "Graded PDF generated successfully!"
      };
      
      toast.success(successMessages[pdfType]);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const clearCache = () => {
    // Vider tout le cache
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      // Vider aussi les caches de cartes spécifiques
      if (key === CACHE_KEYS.CARDS) {
        sets.forEach(set => {
          localStorage.removeItem(`${key}-${set.id}`);
          localStorage.removeItem(`${CACHE_KEYS.CARDS_TIMESTAMP}-${set.id}`);
        });
        tcgdxSets.forEach(set => {
          localStorage.removeItem(`tcgdx-cards-cache-${set.id}-${selectedLanguage}`);
          localStorage.removeItem(`tcgdx-cards-timestamp-${set.id}-${selectedLanguage}`);
        });
      }
    });
    
    // Clear TCGdx caches
    localStorage.removeItem(`tcgdx-sets-cache-${selectedLanguage}`);
    localStorage.removeItem(`tcgdx-sets-timestamp-${selectedLanguage}`);
    
    localStorage.removeItem('pokemon-tcg-api-key');
    setSets([]);
    setTcgdxSets([]);
    setPokemonSeries([]);
    setTcgdxSeries([]);
    setTcgCards([]);
    setTcgdxCards([]);
    setSelectedSet("");
    setSelectedSeries("");
    setApiKey("");
    loadSets();
    toast.success("Cache cleared and data reloaded!");
  };

  const getCurrentSeries = () => {
    return apiService === "pokemon-tcg" ? pokemonSeries : tcgdxSeries;
  };

  const getCurrentCards = () => {
    return apiService === "pokemon-tcg" ? tcgCards : tcgdxCards;
  };

  const getCurrentSets = () => {
    return apiService === "pokemon-tcg" ? sets : tcgdxSets;
  };

  return (
    <div className="space-y-6">
      {/* API Service and Language Selection */}
      <Card className="shadow-card border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                API Service
              </label>
              <Select value={apiService} onValueChange={(value: "pokemon-tcg" | "tcgdx") => {
                setApiService(value);
                setSelectedSet("");
                setSelectedSeries("");
                setTcgCards([]);
                setTcgdxCards([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select API service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokemon-tcg">Pokémon TCG API (English only)</SelectItem>
                  <SelectItem value="tcgdx">TCGdx API (Multilingual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {apiService === "tcgdx" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Language
                </label>
                <LanguageSelector 
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={(lang) => {
                    setSelectedLanguage(lang);
                    setSelectedSet("");
                    setSelectedSeries("");
                    setTcgdxCards([]);
                  }}
                />
              </div>
            )}
          </div>

          {apiService === "pokemon-tcg" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Free API - Optional Key
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    The Pokémon TCG API works without an API key. For more requests per minute, you can get a free key at{" "}
                    <a href="https://dev.pokemontcg.io" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      dev.pokemontcg.io
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Pokémon TCG API Key (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Optional API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleApiKeySubmit}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Configure"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation des Sets TCG */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {apiService === "pokemon-tcg" ? "Pokémon Sets by Series" : "TCG Sets by Series"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {getCurrentSeries().length > 0 ? `${getCurrentSeries().length} series with ${getCurrentSets().length} sets total` : 'Loading sets...'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {apiService === "pokemon-tcg" ? "Pokémon Series" : "TCG Series"}
              </label>
              <Select 
                value={selectedSeries} 
                onValueChange={(value) => {
                  setSelectedSeries(value);
                  setSelectedSet("");
                }}
                disabled={getCurrentSeries().length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a series" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {getCurrentSeries().map((series) => (
                    <SelectItem key={series.name} value={series.name}>
                      {series.name} ({series.sets.length} sets)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSeries && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Set in series "{selectedSeries}"
                  </label>
                  <Select 
                    value={selectedSet} 
                    onValueChange={setSelectedSet}
                    disabled={!selectedSeries}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a set" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {getCurrentSeries()
                        .find(series => series.name === selectedSeries)
                        ?.sets.map((set) => (
                          <SelectItem key={set.id} value={set.id}>
                            {set.name} ({apiService === "pokemon-tcg" ? (set as PokemonSet).total : (set as TCGdxSet).cardCount.total} cards) - {new Date(set.releaseDate).getFullYear()}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Collection Type
                  </label>
                  <Select 
                    value={setType} 
                    onValueChange={(value: "complete" | "master") => setSetType(value)}
                    disabled={!selectedSet}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complete">
                        Complete Set (unique cards only)
                      </SelectItem>
                      <SelectItem value="master">
                        Master Set (with holographic and reverse cards)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleLoadCards}
              disabled={isLoading || !selectedSet}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Load Cards
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleGeneratePDF("sprites")}
                disabled={isLoading || getCurrentCards().length === 0}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Option 1: PDF with Pokémon sprites
              </Button>
              
              <Button
                onClick={() => handleGeneratePDF("complete")}
                disabled={isLoading || getCurrentCards().length === 0}
                className="w-full bg-gradient-pokemon hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Option 2: Complete Set PDF (3x3 cards)
              </Button>
              
              <Button
                onClick={() => handleGeneratePDF("master")}
                disabled={isLoading || getCurrentCards().length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Option 3: Master Set PDF (+ reverses)
              </Button>
              
              <Button
                onClick={() => handleGeneratePDF("graded")}
                disabled={isLoading || getCurrentCards().length === 0}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Option 4: Graded PDF (special cards)
              </Button>
            </div>
            
            <Button
              onClick={clearCache}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              <Key className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </div>

          {/* Progression */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aperçu des cartes */}
      {getCurrentCards().length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Card Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {getCurrentCards().length} cards found in {getCurrentSets().find(s => s.id === selectedSet)?.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {getCurrentCards().slice(0, 50).map((card) => (
                <div key={card.id} className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                  <div className="text-sm font-medium mb-1 truncate">{card.name}</div>
                  <div className="text-xs text-muted-foreground">#{apiService === "pokemon-tcg" ? (card as PokemonCard).number : (card as TCGdxCard).localId}</div>
                  <div className="text-xs text-muted-foreground">{card.rarity}</div>
                  <div className="text-xs text-muted-foreground mt-1">{apiService === "pokemon-tcg" ? (card as PokemonCard).set.series : (card as TCGdxCard).set.serie}</div>
                </div>
              ))}
              {getCurrentCards().length > 50 && (
                <div className="border rounded-lg p-3 bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">
                    +{getCurrentCards().length - 50} more cards...
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cartes d'info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{apiService === "pokemon-tcg" ? "Pokémon TCG API" : "TCGdx API"}</h3>
            <p className="text-muted-foreground text-sm">
              {apiService === "pokemon-tcg" ? "Official free data" : "Multilingual card data"}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Organized Placeholders</h3>
            <p className="text-muted-foreground text-sm">
              PDF ready for your Pokémon binder
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TCGPlaceholder;