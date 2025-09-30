import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerationSelector } from "@/components/GenerationSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PokemonCard } from "@/components/PokemonCard";
import TCGPlaceholder from "@/components/TCGPlaceholder";
import { usePokemonData } from "@/hooks/usePokemonData";
import { Download, Loader2, FileText, Globe, Sparkles, Search } from "lucide-react";

const Index = () => {
  const [selectedGeneration, setSelectedGeneration] = useState<string>("1");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("fr");
  
  const {
    pokemonList,
    isLoading,
    progress,
    currentStep,
    loadPokemon,
    generatePokemonPDF,
    generateChecklistPokemonPDF,
  } = usePokemonData();

  const handleGenerateChecklistPDF = useCallback(async () => {
    await generateChecklistPokemonPDF(selectedGeneration, selectedLanguage);
  }, [selectedGeneration, selectedLanguage, generateChecklistPokemonPDF]);

  const handleGeneratePDF = useCallback(async () => {
    await generatePokemonPDF(selectedGeneration, selectedLanguage);
  }, [selectedGeneration, selectedLanguage, generatePokemonPDF]);

  const handlePreviewGeneration = useCallback(async () => {
    await loadPokemon(selectedGeneration, selectedLanguage);
  }, [selectedGeneration, selectedLanguage, loadPokemon]);

  const pokemonCount = useMemo(() => pokemonList.length, [pokemonList]);

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
        <Tabs defaultValue="pokemon" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pokemon" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Pokémon
            </TabsTrigger>
            <TabsTrigger value="tcg" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              TCG Séries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pokemon" className="space-y-6">
            {/* Pokemon Controls */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Configuration Pokémon
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
                    Générer PDF Cartes
                  </Button>
                  <Button
                    onClick={handleGenerateChecklistPDF}
                    disabled={isLoading}
                    variant="secondary"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Checklist PDF
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

            {/* Pokemon Preview */}
            {pokemonList.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Aperçu des cartes (9 cartes par page PDF)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Affichage de {pokemonCount} Pokémon
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

            {/* Pokemon Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    Plus de 1025 Pokémon des 9 générations
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tcg">
            <TCGPlaceholder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;