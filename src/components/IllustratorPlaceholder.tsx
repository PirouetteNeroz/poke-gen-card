import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, Search, Palette, FileText } from "lucide-react";
import { toast } from "sonner";

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
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=artist:"${encodeURIComponent(illustratorName)}"&page=${page}&pageSize=250`
        );

        if (!response.ok) {
          throw new Error("Erreur lors de la recherche");
        }

        const data = await response.json();
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
    setCurrentStep("Génération du PDF...");

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const cardWidth = (pageWidth - 2 * margin - 2 * 5) / 3;
      const cardHeight = cardWidth * 1.4;
      const gap = 5;

      let currentX = margin;
      let currentY = margin;
      let cardIndex = 0;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        if (cardIndex > 0 && cardIndex % 9 === 0) {
          doc.addPage();
          currentX = margin;
          currentY = margin;
        }

        const col = cardIndex % 3;
        const row = Math.floor((cardIndex % 9) / 3);
        currentX = margin + col * (cardWidth + gap);
        currentY = margin + row * (cardHeight + gap);

        // Fond de la carte
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");

        // Bordure
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "S");

        // Nom de la carte
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        const cardName = card.name.length > 20 ? card.name.substring(0, 18) + "..." : card.name;
        doc.text(cardName, currentX + cardWidth / 2, currentY + 8, { align: "center" });

        // Set et numéro
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${card.set.name}`, currentX + cardWidth / 2, currentY + cardHeight - 12, { align: "center" });
        doc.text(`#${card.number}`, currentX + cardWidth / 2, currentY + cardHeight - 6, { align: "center" });

        // Illustrateur
        doc.setFontSize(6);
        doc.setTextColor(150, 100, 50);
        doc.text(card.artist || "", currentX + cardWidth / 2, currentY + cardHeight - 18, { align: "center" });

        cardIndex++;
        setProgress((i / cards.length) * 100);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto">
              {cards.slice(0, 100).map((card) => (
                <div
                  key={card.id}
                  className="bg-muted rounded-lg p-2 text-center hover:shadow-md transition-shadow"
                >
                  <p className="text-xs font-medium truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.set.name}</p>
                  <p className="text-[10px] text-muted-foreground">#{card.number}</p>
                </div>
              ))}
              {cards.length > 100 && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-4">
                  ... et {cards.length - 100} autres cartes
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
