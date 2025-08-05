import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Loader2, FileText, Search, Sparkles } from "lucide-react";

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
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [tcgSets, setTcgSets] = useState<TCGSet[]>([]);
  const [tcgCards, setTcgCards] = useState<TCGCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  // Mock data for demonstration (replace with real API calls)
  const mockSeries = [
    "Base",
    "Jungle",
    "Fossil", 
    "Team Rocket",
    "Gym Heroes",
    "Gym Challenge",
    "Neo Genesis",
    "Neo Discovery",
    "Neo Destiny",
    "Neo Revelation",
    "Expedition",
    "Aquapolis",
    "Skyridge",
    "Ruby & Sapphire",
    "Sandstorm",
    "Dragon",
    "Team Magma vs Team Aqua",
    "Hidden Legends",
    "FireRed & LeafGreen",
    "Deoxys",
    "Emerald",
    "Unseen Forces",
    "Delta Species",
    "Legend Maker",
    "Holon Phantoms",
    "Crystal Guardians",
    "Dragon Frontiers",
    "Power Keepers"
  ];

  const mockSets: { [key: string]: TCGSet[] } = {
    "Base": [
      { id: "base1", name: "Base Set", series: "Base", total: 102, releaseDate: "1999-01-09" },
      { id: "base2", name: "Base Set 2", series: "Base", total: 130, releaseDate: "2000-02-24" }
    ],
    "Jungle": [
      { id: "jungle", name: "Jungle", series: "Jungle", total: 64, releaseDate: "1999-06-16" }
    ],
    "Fossil": [
      { id: "fossil", name: "Fossil", series: "Fossil", total: 62, releaseDate: "1999-10-10" }
    ],
    "Team Rocket": [
      { id: "teamrocket", name: "Team Rocket", series: "Team Rocket", total: 83, releaseDate: "2000-04-24" }
    ]
  };

  const handleSeriesChange = (series: string) => {
    setSelectedSeries(series);
    setSelectedSet("");
    // Fixed: Load sets for selected series
    setTcgSets(mockSets[series] || []);
    setTcgCards([]);
  };

  const handleLoadCards = async () => {
    if (!selectedSet) {
      toast.error("Veuillez sélectionner une extension");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Chargement des cartes...");

    try {
      // Simulate API call - replace with real TCG Player API
      const selectedSetData = tcgSets.find(set => set.id === selectedSet);
      if (!selectedSetData) return;

      const mockCards: TCGCard[] = [];
      for (let i = 1; i <= selectedSetData.total; i++) {
        const progress = (i / selectedSetData.total) * 100;
        setProgress(progress);
        
        mockCards.push({
          id: `${selectedSet}-${i}`,
          name: `Card ${i}`,
          number: i.toString().padStart(3, '0'),
          rarity: ['Common', 'Uncommon', 'Rare', 'Holo Rare'][Math.floor(Math.random() * 4)],
          set: {
            name: selectedSetData.name,
            series: selectedSetData.series
          }
        });

        // Simulate loading delay
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setTcgCards(mockCards);
      setCurrentStep("Cartes chargées !");
      setProgress(100);
      
      toast.success(`${mockCards.length} cartes chargées avec succès !`);
    } catch (error) {
      console.error("Error loading cards:", error);
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

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Génération du PDF...");

    try {
      // Simulate PDF generation - replace with real implementation
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCurrentStep("PDF généré !");
      toast.success("PDF généré avec succès !");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Configuration TCG
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Série TCG
              </label>
              <Select value={selectedSeries} onValueChange={handleSeriesChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une série TCG" />
                </SelectTrigger>
                <SelectContent>
                  {mockSeries.map((series) => (
                    <SelectItem key={series} value={series}>
                      {series}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Extension/Set
              </label>
              <Select 
                value={selectedSet} 
                onValueChange={setSelectedSet}
                disabled={!selectedSeries}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une extension/set" />
                </SelectTrigger>
                <SelectContent>
                  {tcgSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name} ({set.total} cartes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* Progress */}
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

      {/* Cards Preview */}
      {tcgCards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aperçu des cartes TCG
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {tcgCards.length} cartes trouvées dans {tcgSets.find(s => s.id === selectedSet)?.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {tcgCards.slice(0, 50).map((card) => (
                <div key={card.id} className="border rounded-lg p-3 bg-card">
                  <div className="text-sm font-medium mb-1">{card.name}</div>
                  <div className="text-xs text-muted-foreground">#{card.number}</div>
                  <div className="text-xs text-muted-foreground">{card.rarity}</div>
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">API TCG Player</h3>
            <p className="text-muted-foreground text-sm">
              Accès à toutes les séries et extensions officielles
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
              Création automatique de placeholders par série
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TCGPlaceholder;