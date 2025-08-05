
import jsPDF from 'jspdf';

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

export const generateTCGPDF = async (
  cardsList: TCGCard[],
  setName: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Dimensions des cartes TCG: 66mm x 91mm
  const cardWidth = 66;
  const cardHeight = 91;
  const cardsPerRow = Math.floor(pageWidth / cardWidth);
  const cardsPerCol = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = cardsPerRow * cardsPerCol;
  
  // Marges pour centrer
  const marginX = (pageWidth - (cardsPerRow * cardWidth)) / 2;
  const marginY = (pageHeight - (cardsPerCol * cardHeight)) / 2;
  
  let currentPage = 0;
  let cardCount = 0;
  
  for (let i = 0; i < cardsList.length; i++) {
    const card = cardsList[i];
    const row = Math.floor(cardCount / cardsPerRow);
    const col = cardCount % cardsPerRow;
    
    if (cardCount === 0) {
      if (currentPage > 0) {
        pdf.addPage();
      }
      currentPage++;
    }
    
    const x = marginX + col * cardWidth;
    const y = marginY + row * cardHeight;
    
    // Lignes de découpe
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1], 0);
    
    if (col > 0) {
      pdf.line(x, y, x, y + cardHeight);
    }
    if (row > 0) {
      pdf.line(x, y, x + cardWidth, y);
    }
    
    pdf.setLineDashPattern([], 0);
    
    // Contenu
    const cardPadding = 3;
    const contentX = x + cardPadding;
    const contentY = y + cardPadding;
    const contentWidth = cardWidth - (cardPadding * 2);
    const contentHeight = cardHeight - (cardPadding * 2);
    
    // Background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(contentX, contentY, contentWidth, contentHeight, 'F');
    
    // Bordure
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(contentX, contentY, contentWidth, contentHeight);
    
    // Numéro de carte en haut à droite
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(card.number, contentX + contentWidth - 2, contentY + 8, { align: 'right' });
    
    // Nom de la carte
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(card.name, contentX + contentWidth / 2, contentY + 20, { align: 'center' });
    
    // Zone image placeholder
    const imageSize = Math.min(contentWidth * 0.7, contentHeight * 0.5);
    const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
    const imageY = contentY + 28;
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(imageX, imageY, imageSize, imageSize);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('TCG', imageX + imageSize / 2, imageY + imageSize / 2 + 2, { align: 'center' });
    
    // Rareté
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(card.rarity, contentX + contentWidth / 2, imageY + imageSize + 10, { align: 'center' });
    
    cardCount++;
    
    if (cardCount >= cardsPerPage) {
      cardCount = 0;
    }
    
    if (onProgress) {
      const progress = ((i + 1) / cardsList.length) * 100;
      onProgress(progress);
    }
  }
  
  const filename = `tcg-placeholders-${setName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
  pdf.save(filename);
};
