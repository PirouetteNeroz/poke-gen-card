
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, FileText, Search, Sparkles, Key, AlertCircle } from "lucide-react";
import { generateTCGPDF } from "@/services/tcgPdfGenerator";
import { cardtraderAPI, type CardTraderGame, type CardTraderExpansion, type CardTraderBlueprint } from "@/services/cardtraderApi";

interface TCGSet {
  id: string;
  name: string;
  series: string;
  total: number;
  releaseDate: string;
}

interface TCGCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  set: {
    name: string;
    series: string;
  };
}

const TCGPlaceholder = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [selectedExpansion, setSelectedExpansion] = useState<string>("");
  const [expansions, setExpansions] = useState<CardTraderExpansion[]>([]);
  const [tcgCards, setTcgCards] = useState<TCGCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  useEffect(() => {
    const savedApiKey = localStorage.getItem('cardtrader-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
      cardtraderAPI.setApiKey(savedApiKey);
      loadPokemonExpansions();
    }
  }, []);

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast.error("Veuillez saisir votre clé API");
      return;
    }
    
    localStorage.setItem('cardtrader-api-key', apiKey);
    cardtraderAPI.setApiKey(apiKey);
    setIsApiKeySet(true);
    loadPokemonExpansions();
    toast.success("Clé API configurée avec succès !");
  };

  const loadPokemonExpansions = async () => {
    setIsLoading(true);
    setCurrentStep("Chargement des extensions Pokémon...");
    
    try {
      // Pokémon game ID is 5 based on the API response
      const expansionsList = await cardtraderAPI.getExpansions(5);
      setExpansions(expansionsList);
      setCurrentStep("Extensions Pokémon chargées !");
      toast.success(`${expansionsList.length} extensions Pokémon trouvées !`);
    } catch (error) {
      console.error("Erreur lors du chargement des extensions:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des extensions");
      // Reset API key on error
      if (error instanceof Error && error.message.includes('Clé API')) {
        setIsApiKeySet(false);
        localStorage.removeItem('cardtrader-api-key');
      }
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };


  const handleLoadCards = async () => {
    if (!selectedExpansion) {
      toast.error("Veuillez sélectionner une extension");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Chargement des cartes...");

    try {
      const selectedExpansionData = expansions.find(exp => exp.id.toString() === selectedExpansion);
      if (!selectedExpansionData) return;

      console.log("Chargement des cartes pour:", selectedExpansionData);

      const blueprints = await cardtraderAPI.getBlueprints(selectedExpansionData.id);
      
      const cards: TCGCard[] = blueprints.map((blueprint, index) => {
        setProgress(((index + 1) / blueprints.length) * 100);
        
        return {
          id: blueprint.id.toString(),
          name: blueprint.name,
          number: blueprint.collector_number || (index + 1).toString().padStart(3, '0'),
          rarity: blueprint.rarity || 'Unknown',
          set: {
            name: selectedExpansionData.name,
            series: 'Pokémon'
          }
        };
      });

      setTcgCards(cards);
      setCurrentStep("Cartes chargées !");
      setProgress(100);
      
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

    const selectedExpansionData = expansions.find(exp => exp.id.toString() === selectedExpansion);
    if (!selectedExpansionData) return;

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Génération du PDF TCG...");

    try {
      await generateTCGPDF(
        tcgCards,
        selectedExpansionData.name,
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
      {/* Configuration de l'API */}
      {!isApiKeySet && (
        <Card className="shadow-card border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Key className="w-5 h-5" />
              Configuration API CardTrader
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Clé API CardTrader requise
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Pour utiliser cette fonctionnalité, vous devez créer un compte sur{" "}
                  <a href="https://www.cardtrader.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    CardTrader.com
                  </a>{" "}
                  et obtenir votre clé API dans les paramètres de votre compte.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Clé API CardTrader
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Saisissez votre clé API CardTrader..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleApiKeySubmit}
                  disabled={!apiKey.trim() || isLoading}
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
      )}

      {/* Configuration TCG */}
      {isApiKeySet && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Extensions Pokémon TCG
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {expansions.length > 0 ? `${expansions.length} extensions Pokémon disponibles` : 'Chargement des extensions...'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Extension Pokémon
              </label>
              <Select 
                value={selectedExpansion} 
                onValueChange={setSelectedExpansion}
                disabled={expansions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une extension Pokémon" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {expansions.map((expansion) => (
                    <SelectItem key={expansion.id} value={expansion.id.toString()}>
                      {expansion.name} {expansion.total_cards && `(${expansion.total_cards} cartes)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleLoadCards}
              disabled={isLoading || !selectedExpansion}
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
            
            {isApiKeySet && (
              <Button
                onClick={() => {
                  setIsApiKeySet(false);
                  localStorage.removeItem('cardtrader-api-key');
                  setExpansions([]);
                  setTcgCards([]);
                  setSelectedExpansion("");
                }}
                variant="outline"
                size="sm"
                className="text-muted-foreground"
              >
                <Key className="w-4 h-4 mr-2" />
                Changer clé API
              </Button>
            )}
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
      )}

      {/* Aperçu des cartes */}
      {tcgCards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aperçu des cartes Pokémon
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {tcgCards.length} cartes trouvées dans {expansions.find(e => e.id.toString() === selectedExpansion)?.name}
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
            <h3 className="font-semibold text-lg mb-2">API CardTrader</h3>
            <p className="text-muted-foreground text-sm">
              Données officielles Pokémon TCG
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
