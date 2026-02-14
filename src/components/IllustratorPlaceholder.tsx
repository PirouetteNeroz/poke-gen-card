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
  localId: string;
  image: string;
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
      setProgress(30);
      setCurrentStep("Recherche des cartes...");

      // The /en/ endpoint already returns only English cards
      const cardsResponse = await fetch(
        `https://api.tcgdex.net/v2/en/cards?illustrator=${encodeURIComponent(illustratorName)}`
      );

      if (!cardsResponse.ok) {
        throw new Error(`API error: ${cardsResponse.status}`);
      }

      const data: TCGCard[] = await cardsResponse.json();

      if (!Array.isArray(data)) {
        throw new Error("Réponse invalide de l'API");
      }

      // Filter out TCG Pocket cards (sets like A1, A1a, A2, A2a, A2b, B1, P-A, etc.)
      const tcgPocketPattern = /^(A\d|B\d|P-A)/i;
      const filtered = data.filter((card) => {
        const setParts = card.id.split('-');
        const setId = setParts.slice(0, -1).join('-');
        return !tcgPocketPattern.test(setId);
      });

      setProgress(80);
      setCurrentStep(`${filtered.length} cartes trouvées...`);

      // Sort chronologically: extract set prefix and card number for proper ordering
      filtered.sort((a, b) => {
        const partsA = a.id.split('-');
        const partsB = b.id.split('-');
        const setA = partsA.slice(0, -1).join('-');
        const setB = partsB.slice(0, -1).join('-');
        if (setA !== setB) return setA.localeCompare(setB);
        const numA = parseInt(partsA[partsA.length - 1]) || 0;
        const numB = parseInt(partsB[partsB.length - 1]) || 0;
        return numA - numB;
      });

      setCards(filtered);
      setProgress(100);
      setCurrentStep("Recherche terminée !");

      if (filtered.length === 0) {
        toast.info("Aucune carte trouvée pour cet illustrateur");
      } else {
        toast.success(`${filtered.length} cartes trouvées pour ${illustratorName}`);
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
      const pageHeight = 297;
      // Exact card dimensions in mm
      const cardWidth = 63.5;
      const cardHeight = 88.9;
      // Center the 3-column grid on the page
      const marginX = (pageWidth - 3 * cardWidth) / 2;
      const marginY = (pageHeight - 3 * cardHeight) / 2;

      // Title page
      doc.setFontSize(32);
      doc.setTextColor(40, 40, 40);
      doc.text(illustratorName, pageWidth / 2, pageHeight / 2 - 15, { align: "center" });
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text(`${cards.length} cartes`, pageWidth / 2, pageHeight / 2 + 8, { align: "center" });

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

        // First card or every 9 cards: new page (skip title page logic since we already have one)
        if (cardIndex === 0 || cardIndex % 9 === 0) {
          doc.addPage();
        }

        const col = cardIndex % 3;
        const row = Math.floor((cardIndex % 9) / 3);
        const currentX = marginX + col * cardWidth;
        const currentY = marginY + row * cardHeight;

        // Try to load card image
        if (card.image) {
          const imageUrl = `${card.image}/high.png`;
          const imageData = await loadImage(imageUrl);
          if (imageData) {
            try {
              doc.addImage(imageData, "PNG", currentX, currentY, cardWidth, cardHeight);
              // Add set name and card number at bottom-left with semi-transparent background
              const setParts = card.id.split('-');
              const setName = setParts.slice(0, -1).join('-');
              const label = `${setName} #${card.localId}`;
              doc.setFontSize(7);
              const textWidth = doc.getTextWidth(label);
              const textHeight = 3.5;
              const labelX = currentX + cardWidth - textWidth - 1.5;
              const labelY = currentY + cardHeight - 2;
              doc.setFillColor(255, 255, 255);
              doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
              doc.roundedRect(labelX - 0.5, labelY - textHeight, textWidth + 1, textHeight + 0.8, 0.5, 0.5, "F");
              doc.setGState(new (doc as any).GState({ opacity: 1 }));
              doc.setTextColor(30, 30, 30);
              doc.text(label, labelX, labelY - 0.5);
            } catch {
              doc.setFillColor(245, 245, 245);
              doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.text(card.name, currentX + cardWidth / 2, currentY + cardHeight / 2, { align: "center" });
            }
          } else {
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, "F");
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(card.name, currentX + cardWidth / 2, currentY + cardHeight / 2, { align: "center" });
          }
        } else {
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

      // Draw cut lines on each page (skip title page = page 1)
      const totalPages = doc.getNumberOfPages();
      const totalCardPages = totalPages - 1;
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p);
        const pageIndex = p - 2; // 0-based card page index
        const cardsOnThisPage = Math.min(9, cards.length - pageIndex * 9);
        const colsUsed = cardsOnThisPage >= 3 ? 3 : cardsOnThisPage;
        const rowsUsed = Math.ceil(cardsOnThisPage / 3);

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);
        // Vertical lines
        for (let c = 0; c <= colsUsed; c++) {
          const x = marginX + c * cardWidth;
          doc.line(x, marginY, x, marginY + rowsUsed * cardHeight);
        }
        // Horizontal lines
        for (let r = 0; r <= rowsUsed; r++) {
          const y = marginY + r * cardHeight;
          doc.line(marginX, y, marginX + colsUsed * cardWidth, y);
        }
      }

      doc.save(`placeholder_${illustratorName.replace(/\s+/g, "_")}.pdf`);
      setProgress(100);
      toast.success("PDF placeholder généré avec succès !");
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
                  {card.image ? (
                    <img 
                      src={`${card.image}/low.png`} 
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
                    <p className="text-[10px] text-muted-foreground">#{card.localId}</p>
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
