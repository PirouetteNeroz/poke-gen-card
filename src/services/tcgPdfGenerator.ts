
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
  
  // Dimensions des cartes TCG réduites de 15%: 56.1mm x 77.35mm
  const cardWidth = 56.1;
  const cardHeight = 77.35;
  const cardsPerRow = Math.floor(pageWidth / cardWidth);
  const cardsPerCol = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = cardsPerRow * cardsPerCol;
  
  // Marges pour centrer
  const marginX = (pageWidth - (cardsPerRow * cardWidth)) / 2;
  const marginY = (pageHeight - (cardsPerCol * cardHeight)) / 2;
  
  let currentPage = 0;
  let cardCount = 0;
  
  // Page de titre élégante pour TCG
  const addTitlePage = () => {
    // Fond dégradé TCG (violet vers doré)
    const gradientSteps = 50;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(79 + (217 - 79) * ratio);
      const g = Math.round(70 + (119 - 70) * ratio);
      const b = Math.round(229 + (35 - 229) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(0, (pageHeight / gradientSteps) * i, pageWidth, pageHeight / gradientSteps + 1, 'F');
    }
    
    // Titre principal TCG
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Collection TCG', pageWidth / 2, pageHeight / 2 - 25, { align: 'center' });
    
    // Nom de l'extension
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(255, 215, 0);
    pdf.text(setName, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
    
    // Sous-titre
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(230, 230, 255);
    pdf.text('Cartes de collection à découper', pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });
    
    // Statistiques
    pdf.setFontSize(10);
    pdf.setTextColor(200, 200, 255);
    pdf.text(`${cardsList.length} cartes incluses`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
    
    // Éléments décoratifs TCG
    pdf.setDrawColor(255, 215, 0);
    pdf.setLineWidth(3);
    const decorLength = 50;
    pdf.line(pageWidth / 2 - decorLength, pageHeight / 2 + 35, pageWidth / 2 + decorLength, pageHeight / 2 + 35);
    
    // Losanges décoratifs
    pdf.setFillColor(255, 215, 0);
    for (let i = 0; i < 3; i++) {
      const x = pageWidth / 2 - 15 + i * 15;
      const y = pageHeight / 2 + 45;
      // Dessiner un losange
      pdf.setFillColor(255, 215, 0);
      const size = 2;
      pdf.lines([[size, 0], [0, size], [-size, 0], [0, -size]], x, y, [1, 1], 'F');
    }
  };
  
  addTitlePage();
  
  for (let i = 0; i < cardsList.length; i++) {
    const card = cardsList[i];
    const row = Math.floor(cardCount / cardsPerRow);
    const col = cardCount % cardsPerRow;
    
    if (cardCount === 0) {
      pdf.addPage();
      currentPage++;
    }
    
    const x = marginX + col * cardWidth;
    const y = marginY + row * cardHeight;
    
    // Lignes de découpe élégantes TCG
    pdf.setDrawColor(147, 51, 234);
    pdf.setLineWidth(0.4);
    pdf.setLineDashPattern([3, 1], 0);
    
    if (col > 0) {
      pdf.line(x, y, x, y + cardHeight);
    }
    if (row > 0) {
      pdf.line(x, y, x + cardWidth, y);
    }
    
    pdf.setLineDashPattern([], 0);
    
    // Contenu
    const cardPadding = 2.5;
    const contentX = x + cardPadding;
    const contentY = y + cardPadding;
    const contentWidth = cardWidth - (cardPadding * 2);
    const contentHeight = cardHeight - (cardPadding * 2);
    
    // Background avec dégradé subtil TCG
    const bgSteps = 10;
    for (let i = 0; i < bgSteps; i++) {
      const ratio = i / bgSteps;
      const r = Math.round(255 - (255 - 248) * ratio);
      const g = Math.round(255 - (255 - 250) * ratio);
      const b = Math.round(255 - (255 - 255) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(contentX, contentY + (contentHeight / bgSteps) * i, contentWidth, contentHeight / bgSteps + 0.5, 'F');
    }
    
    // Bordure principale avec style TCG
    pdf.setDrawColor(147, 51, 234);
    pdf.setLineWidth(1.5);
    pdf.roundedRect(contentX, contentY, contentWidth, contentHeight, 1.5, 1.5);
    
    // Bordure intérieure dorée
    pdf.setDrawColor(255, 215, 0);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(contentX + 1, contentY + 1, contentWidth - 2, contentHeight - 2, 1, 1);
    
    // Badge numéro de carte élégant
    const numberBadgeWidth = 16;
    const numberBadgeHeight = 8;
    pdf.setFillColor(147, 51, 234);
    pdf.roundedRect(contentX + contentWidth - numberBadgeWidth - 2, contentY + 3, numberBadgeWidth, numberBadgeHeight, 2, 2, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(card.number, contentX + contentWidth - numberBadgeWidth / 2 - 2, contentY + 8.5, { align: 'center' });
    
    // Nom de la carte avec style TCG
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    const maxNameWidth = contentWidth - 4;
    let displayName = card.name;
    
    // Tronquer le nom si trop long
    while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== card.name) displayName += '...';
    
    pdf.text(displayName, contentX + contentWidth / 2, contentY + 18, { align: 'center' });
    
    // Ligne décorative sous le nom
    pdf.setDrawColor(255, 215, 0);
    pdf.setLineWidth(1);
    const nameLineWidth = Math.min(pdf.getTextWidth(displayName), contentWidth * 0.8);
    pdf.line(
      contentX + (contentWidth - nameLineWidth) / 2, 
      contentY + 21, 
      contentX + (contentWidth + nameLineWidth) / 2, 
      contentY + 21
    );
    
    // Zone image avec cadre TCG élégant
    const imageSize = Math.min(contentWidth * 0.75, contentHeight * 0.55);
    const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
    const imageY = contentY + 26;
    
    // Cadre décoratif TCG
    const frameSize = imageSize + 3;
    const frameX = imageX - 1.5;
    const frameY = imageY - 1.5;
    
    // Fond du cadre avec effet brillant
    pdf.setFillColor(245, 245, 250);
    pdf.roundedRect(frameX, frameY, frameSize, frameSize, 2, 2, 'F');
    
    // Bordure du cadre avec couleurs TCG
    pdf.setDrawColor(147, 51, 234);
    pdf.setLineWidth(1);
    pdf.roundedRect(frameX, frameY, frameSize, frameSize, 2, 2);
    
    // Placeholder élégant
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(imageX, imageY, imageSize, imageSize, 1.5, 1.5, 'F');
    
    // Motif décoratif TCG au centre
    const centerX = imageX + imageSize / 2;
    const centerY = imageY + imageSize / 2;
    
    // Cercle central
    pdf.setFillColor(147, 51, 234);
    pdf.circle(centerX, centerY, imageSize / 8, 'F');
    
    // Texte TCG stylisé
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('TCG', centerX, centerY + 1.5, { align: 'center' });
    
    // Étoiles décoratives autour
    pdf.setFillColor(255, 215, 0);
    const starPositions = [
      [centerX - imageSize/4, centerY - imageSize/6],
      [centerX + imageSize/4, centerY - imageSize/6],
      [centerX - imageSize/4, centerY + imageSize/6],
      [centerX + imageSize/4, centerY + imageSize/6]
    ];
    
    starPositions.forEach(([x, y]) => {
      pdf.circle(x, y, 1, 'F');
    });
    
    // Badge rareté stylisé
    const rarityY = imageY + frameSize + 8;
    
    // Couleur selon la rareté
    let rarityColor = [75, 85, 99]; // Gris par défaut
    if (card.rarity.toLowerCase().includes('rare')) {
      rarityColor = [147, 51, 234]; // Violet pour rare
    } else if (card.rarity.toLowerCase().includes('uncommon')) {
      rarityColor = [59, 130, 246]; // Bleu pour uncommon
    } else if (card.rarity.toLowerCase().includes('common')) {
      rarityColor = [34, 197, 94]; // Vert pour common
    }
    
    // Badge de rareté
    const rarityWidth = Math.max(pdf.getTextWidth(card.rarity) + 6, contentWidth * 0.6);
    pdf.setFillColor(rarityColor[0], rarityColor[1], rarityColor[2]);
    pdf.roundedRect(
      contentX + (contentWidth - rarityWidth) / 2, 
      rarityY - 3, 
      rarityWidth, 
      7, 
      2, 2, 'F'
    );
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(card.rarity.toUpperCase(), contentX + contentWidth / 2, rarityY + 1.5, { align: 'center' });
    
    // Extension en petit en bas
    if (card.set && card.set.series) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(100, 116, 139);
      pdf.text(card.set.series, contentX + contentWidth / 2, rarityY + 10, { align: 'center' });
    }
    
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
