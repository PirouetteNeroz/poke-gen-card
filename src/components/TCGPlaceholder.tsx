
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

interface PokemonSeries {
  name: string;
  sets: PokemonSet[];
}

const TCGPlaceholder = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [pokemonSeries, setPokemonSeries] = useState<PokemonSeries[]>([]);
  const [tcgCards, setTcgCards] = useState<PokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  useEffect(() => {
    const savedApiKey = localStorage.getItem('pokemon-tcg-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      pokemonTCGAPI.setApiKey(savedApiKey);
    }
    loadPokemonSets();
  }, []);

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

  const loadPokemonSets = async () => {
    setIsLoading(true);
    setCurrentStep("Chargement des sets Pokémon...");
    
    try {
      const setsList = await pokemonTCGAPI.getSets();
      setSets(setsList);
      
      // Organiser par séries
      const organizedSeries = organizePokemonSeries(setsList);
      setPokemonSeries(organizedSeries);
      
      setCurrentStep("Sets Pokémon organisés par séries !");
      toast.success(`${setsList.length} sets Pokémon trouvés et organisés par séries !`);
    } catch (error) {
      console.error("Erreur lors du chargement des sets:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des sets");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };


  const handleLoadCards = async () => {
    if (!selectedSet) {
      toast.error("Veuillez sélectionner un set");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Chargement des cartes...");

    try {
      const selectedSetData = sets.find(set => set.id === selectedSet);
      if (!selectedSetData) return;

      console.log("Chargement des cartes pour:", selectedSetData);

      const cards = await pokemonTCGAPI.getCards(selectedSetData.id);
      
      // Mise à jour du progrès
      setProgress(100);
      setTcgCards(cards);
      setCurrentStep("Cartes chargées !");
      
      toast.success(`${cards.length} cartes chargées avec succès !`);
    } catch (error) {
      console.error("Erreur lors du chargement des cartes:", error);
      toast.error("Erreur lors du chargement des cartes");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const handleGeneratePDF = async () => {
    if (tcgCards.length === 0) {
      toast.error("Veuillez d'abord charger les cartes");
      return;
    }

    const selectedSetData = sets.find(set => set.id === selectedSet);
    if (!selectedSetData) return;

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Génération du PDF TCG...");

    try {
      // Convertir les cartes au format attendu par le générateur PDF
      const cardsForPDF = tcgCards.map(card => ({
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        set: {
          name: card.set.name,
          series: card.set.series
        }
      }));

      await generateTCGPDF(
        cardsForPDF,
        selectedSetData.name,
        (pdfProgress) => {
          setProgress(pdfProgress);
        }
      );

      setCurrentStep("PDF généré !");
      toast.success("PDF TCG généré avec succès !");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration de l'API (optionnelle) */}
      <Card className="shadow-card border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Key className="w-5 h-5" />
            Configuration API Pokémon TCG (Optionnelle)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                API gratuite - Clé optionnelle
              </p>
              <p className="text-green-700 dark:text-green-300">
                L'API Pokémon TCG fonctionne sans clé API. Pour plus de requêtes par minute, vous pouvez obtenir une clé gratuite sur{" "}
                <a href="https://dev.pokemontcg.io" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  dev.pokemontcg.io
                </a>
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Clé API Pokémon TCG (optionnelle)
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Clé API optionnelle..."
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
                  "Configurer"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation des Sets TCG */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Sets Pokémon par Séries
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {pokemonSeries.length > 0 ? `${pokemonSeries.length} séries avec ${sets.length} sets au total` : 'Chargement des sets...'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Série Pokémon
              </label>
              <Select 
                value={selectedSeries} 
                onValueChange={(value) => {
                  setSelectedSeries(value);
                  setSelectedSet("");
                }}
                disabled={pokemonSeries.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une série Pokémon" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {pokemonSeries.map((series) => (
                    <SelectItem key={series.name} value={series.name}>
                      {series.name} ({series.sets.length} sets)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSeries && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Set dans la série "{selectedSeries}"
                </label>
                <Select 
                  value={selectedSet} 
                  onValueChange={setSelectedSet}
                  disabled={!selectedSeries}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un set" />
                  </SelectTrigger>
                  <SelectContent className="max-h-96">
                    {pokemonSeries
                      .find(series => series.name === selectedSeries)
                      ?.sets.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name} ({set.total} cartes) - {new Date(set.releaseDate).getFullYear()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
              Charger les cartes
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isLoading || tcgCards.length === 0}
              className="flex-1 bg-gradient-pokemon hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Générer PDF TCG
            </Button>
            
            <Button
              onClick={() => {
                localStorage.removeItem('pokemon-tcg-api-key');
                setSets([]);
                setPokemonSeries([]);
                setTcgCards([]);
                setSelectedSet("");
                setSelectedSeries("");
                setApiKey("");
                loadPokemonSets();
              }}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              <Key className="w-4 h-4 mr-2" />
              Recharger
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
      {tcgCards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aperçu des cartes Pokémon
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {tcgCards.length} cartes trouvées dans {sets.find(s => s.id === selectedSet)?.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {tcgCards.slice(0, 50).map((card) => (
                <div key={card.id} className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                  <div className="text-sm font-medium mb-1 truncate">{card.name}</div>
                  <div className="text-xs text-muted-foreground">#{card.number}</div>
                  <div className="text-xs text-muted-foreground">{card.rarity}</div>
                  <div className="text-xs text-muted-foreground mt-1">{card.set.series}</div>
                </div>
              ))}
              {tcgCards.length > 50 && (
                <div className="border rounded-lg p-3 bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">
                    +{tcgCards.length - 50} autres cartes...
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
            <h3 className="font-semibold text-lg mb-2">API Pokémon TCG</h3>
            <p className="text-muted-foreground text-sm">
              Données officielles gratuites
            </p>
          </CardContent>
        </Card>

        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Placeholders Organisés</h3>
            <p className="text-muted-foreground text-sm">
              PDF prêt pour votre classeur Pokémon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TCGPlaceholder;
