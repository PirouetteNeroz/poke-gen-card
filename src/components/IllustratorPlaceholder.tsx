import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, Search, Palette, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TCGCard {
  id: string;
  name: string;
  number: string;
  set: {
    name: string;
    id: string;
  };
  artist?: string;
  images?: {
    small: string;
    large: string;
  };
}

const IllustratorPlaceholder = () => {
  const [illustratorName, setIllustratorName] = useState("");
  const [cards, setCards] = useState<TCGCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const searchByIllustrator = useCallback(async () => {
    if (!illustratorName.trim()) {
      toast.error("Veuillez entrer un nom d'illustrateur");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Recherche des cartes...");
    setCards([]);

    try {
      const allCards: TCGCard[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('pokemon-tcg-proxy', {
          body: { endpoint: `/cards?q=artist:"${encodeURIComponent(illustratorName)}"&page=${page}&pageSize=250` }
        });

        if (error) {
          throw new Error(error.message || "Erreur lors de la recherche");
        }

        allCards.push(...data.data);

        setProgress((page * 25) % 90);
        setCurrentStep(`${allCards.length} cartes trouvées...`);

        if (data.data.length < 250) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Trier par set puis par numéro
      allCards.sort((a, b) => {
        const setCompare = a.set.name.localeCompare(b.set.name);
        if (setCompare !== 0) return setCompare;
        return parseInt(a.number) - parseInt(b.number);
      });

      setCards(allCards);
      setProgress(100);
      setCurrentStep("Recherche terminée !");

      if (allCards.length === 0) {
        toast.info("Aucune carte trouvée pour cet illustrateur");
      } else {
        toast.success(`${allCards.length} cartes trouvées pour ${illustratorName}`);
      }
    } catch (error) {
      console.error("Error searching by illustrator:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [illustratorName]);

  const generatePDF = useCallback(async () => {
    if (cards.length === 0) {
      toast.error("Aucune carte à exporter");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep("Génération du PDF avec images...");

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const margin = 10;
      const cardWidth = (pageWidth - 2 * margin - 2 * 5) / 3;
      const cardHeight = cardWidth * 1.4;
      const gap = 5;

      let cardIndex = 0;

      // Helper function to load image as base64
      const loadImage = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        if (cardIndex > 0 && cardIndex % 9 === 0) {
          doc.addPage();
        }

        const col = cardIndex % 3;
        const row = Math.floor((cardIndex % 9) / 3);
        const currentX = margin + col * (cardWidth + gap);
        const currentY = margin + row * (cardHeight + gap);

        // Try to load card image
        if (card.images?.small) {
          const imageData = await loadImage(card.images.small);
          if (imageData) {
            try {
              doc.addImage(imageData, "PNG", currentX, currentY, cardWidth, cardHeight);
            } catch {
              // Fallback to placeholder if image fails
              doc.setFillColor(245, 245, 245);
              doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.text(card.name, currentX + cardWidth / 2, currentY + cardHeight / 2, { align: "center" });
            }
          } else {
            // Fallback placeholder
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(card.name, currentX + cardWidth / 2, currentY + cardHeight / 2, { align: "center" });
          }
        } else {
          // No image available - placeholder
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(card.name, currentX + cardWidth / 2, currentY + cardHeight / 2, { align: "center" });
        }

        cardIndex++;
        setProgress((i / cards.length) * 100);
        setCurrentStep(`Traitement ${i + 1}/${cards.length} cartes...`);
      }

      doc.save(`illustrator_${illustratorName.replace(/\s+/g, "_")}.pdf`);
      setProgress(100);
      toast.success("PDF généré avec succès !");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [cards, illustratorName]);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Recherche par Illustrateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Nom de l'illustrateur (ex: Mitsuhiro Arita)"
                value={illustratorName}
                onChange={(e) => setIllustratorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchByIllustrator()}
              />
            </div>
            <Button
              onClick={searchByIllustrator}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Rechercher
            </Button>
            <Button
              onClick={generatePDF}
              disabled={isLoading || cards.length === 0}
              className="bg-gradient-pokemon hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Générer PDF
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Illustrateurs populaires */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Illustrateurs populaires :</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Mitsuhiro Arita",
                "Ken Sugimori",
                "Atsuko Nishida",
                "Kouki Saitou",
                "Ryo Ueda",
                "HYOGONOSUKE",
                "Akira Komayama",
                "Naoki Saito",
              ].map((artist) => (
                <Button
                  key={artist}
                  variant="outline"
                  size="sm"
                  onClick={() => setIllustratorName(artist)}
                  className="text-xs"
                >
                  {artist}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu des cartes */}
      {cards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Cartes de {illustratorName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {cards.length} cartes trouvées
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[600px] overflow-y-auto">
              {cards.slice(0, 150).map((card) => (
                <div
                  key={card.id}
                  className="bg-muted rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {card.images?.small ? (
                    <img 
                      src={card.images.small} 
                      alt={card.name}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  ) : (
                    <div className="aspect-[2.5/3.5] bg-muted-foreground/10 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="p-2 text-center">
                    <p className="text-xs font-medium truncate">{card.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{card.set.name}</p>
                    <p className="text-[10px] text-muted-foreground">#{card.number}</p>
                  </div>
                </div>
              ))}
              {cards.length > 150 && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-4">
                  ... et {cards.length - 150} autres cartes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Par Artiste</h3>
            <p className="text-muted-foreground text-sm">
              Recherchez toutes les cartes d'un illustrateur
            </p>
          </CardContent>
        </Card>

        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Recherche Rapide</h3>
            <p className="text-muted-foreground text-sm">
              Accédez rapidement aux artistes populaires
            </p>
          </CardContent>
        </Card>

        <Card className="text-center shadow-card hover:shadow-pokemon transition-all duration-300">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-pokemon-yellow rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">PDF Organisé</h3>
            <p className="text-muted-foreground text-sm">
              Cartes triées par set et numéro
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IllustratorPlaceholder;
