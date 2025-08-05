import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GenerationSelector } from "@/components/GenerationSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PokemonCard } from "@/components/PokemonCard";
import { fetchPokemonBatch } from "@/services/pokemonApi";
import { generatePDF } from "@/services/pdfGenerator";
import { toast } from "sonner";
import { Download, Loader2, FileText, Globe, Sparkles } from "lucide-react";

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

const Index = () => {
  const [selectedGeneration, setSelectedGeneration] = useState<string>("1");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("fr");
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const handleGeneratePDF = async () => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Récupération des données Pokémon...");

    try {
      // Fetch Pokemon data
      const pokemon = await fetchPokemonBatch(
        selectedGeneration,
        selectedLanguage,
        (fetchProgress) => {
          setProgress(fetchProgress * 0.8); // 80% for data fetching
        }
      );

      setPokemonList(pokemon);
      setCurrentStep("Génération du PDF...");

      // Generate PDF
      await generatePDF(
        pokemon,
        selectedGeneration,
        selectedLanguage,
        (pdfProgress) => {
          setProgress(80 + pdfProgress * 0.2); // 20% for PDF generation
        }
      );

      setCurrentStep("Terminé !");
      setProgress(100);
      
      toast.success("PDF généré avec succès !", {
        description: `${pokemon.length} Pokémon ont été ajoutés au PDF.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF", {
        description: "Veuillez réessayer dans quelques instants.",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const handlePreviewGeneration = async () => {
    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Chargement de l'aperçu...");

    try {
      const pokemon = await fetchPokemonBatch(
        selectedGeneration,
        selectedLanguage,
        (fetchProgress) => {
          setProgress(fetchProgress);
        }
      );

      setPokemonList(pokemon.slice(0, 18)); // Show first 18 for preview
      setCurrentStep("Aperçu chargé !");
      setProgress(100);
      
      toast.success("Aperçu chargé avec succès !");
    } catch (error) {
      console.error("Error loading preview:", error);
      toast.error("Erreur lors du chargement de l'aperçu");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-pokemon shadow-pokemon">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8" />
              Générateur de Placeholder Pokédex
            </h1>
            <p className="text-xl opacity-90">
              Créez des PDF de placeholder pour votre collection Pokémon
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Génération
                </label>
                <GenerationSelector
                  selectedGeneration={selectedGeneration}
                  onGenerationChange={setSelectedGeneration}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Langue
                </label>
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={setSelectedLanguage}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handlePreviewGeneration}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Aperçu
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isLoading}
                className="flex-1 bg-gradient-pokemon hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Générer PDF
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

        {/* Preview */}
        {pokemonList.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Aperçu des cartes (9 cartes par page PDF)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Affichage des {pokemonList.length} premiers Pokémon
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pokemonList.map((pokemon) => (
                  <PokemonCard
                    key={pokemon.id}
                    pokemon={pokemon}
                    language={selectedLanguage}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-pokemon-red rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">PDF Optimisé</h3>
              <p className="text-muted-foreground text-sm">
                9 cartes par page, organisées par génération
              </p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-pokemon-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Multilingue</h3>
              <p className="text-muted-foreground text-sm">
                Noms des Pokémon en 6 langues différentes
              </p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-pokemon-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Toutes les Générations</h3>
              <p className="text-muted-foreground text-sm">
                Plus de 1000 Pokémon des 9 générations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;