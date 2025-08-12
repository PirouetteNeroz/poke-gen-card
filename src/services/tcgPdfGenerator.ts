
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
  images?: {
    small: string;
    large: string;
  };
}

// Helper function to get Pokemon sprite from Pokemon API
const getPokemonSprite = async (cardName: string): Promise<string | null> => {
  try {
    // Extract Pokemon name from card name (remove suffixes like "EX", "V", etc.)
    let pokemonName = cardName.toLowerCase()
      .replace(/\s+(ex|v|vmax|gx|break|tag team).*$/i, '')
      .replace(/[^a-z\s]/g, '')
      .trim();
    
    // Special cases for Pokemon names
    const nameMap: { [key: string]: string } = {
      'nidoran♀': 'nidoran-f',
      'nidoran♂': 'nidoran-m',
      'farfetch\'d': 'farfetchd',
      'mr. mime': 'mr-mime',
      'ho-oh': 'ho-oh',
      'deoxys': 'deoxys-normal',
      'wormadam': 'wormadam-plant',
      'rotom': 'rotom-normal',
      'giratina': 'giratina-altered',
      'shaymin': 'shaymin-land',
      'arceus': 'arceus-normal',
      'basculin': 'basculin-red-striped',
      'darmanitan': 'darmanitan-standard',
      'tornadus': 'tornadus-incarnate',
      'thundurus': 'thundurus-incarnate',
      'landorus': 'landorus-incarnate',
      'keldeo': 'keldeo-ordinary',
      'meloetta': 'meloetta-aria',
      'flabebe': 'flabebe',
      'pumpkaboo': 'pumpkaboo-average',
      'gourgeist': 'gourgeist-average',
      'oricorio': 'oricorio-baile',
      'lycanroc': 'lycanroc-midday',
      'wishiwashi': 'wishiwashi-solo',
      'toxapex': 'toxapex',
      'mimikyu': 'mimikyu-disguised',
      'toxtricity': 'toxtricity-amped',
      'eiscue': 'eiscue-ice',
      'morpeko': 'morpeko-full-belly',
      'urshifu': 'urshifu-single-strike',
      'basculegion': 'basculegion-male'
    };
    
    if (nameMap[pokemonName]) {
      pokemonName = nameMap[pokemonName];
    }
    
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (response.ok) {
      const pokemon = await response.json();
      return pokemon.sprites?.other?.['official-artwork']?.front_default || 
             pokemon.sprites?.front_default || null;
    }
  } catch (error) {
    console.log(`Could not fetch sprite for ${cardName}`);
  }
  return null;
};

// Helper function to get image as base64
const getImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
};

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
    
    // Try to get Pokemon sprite
    let pokemonSprite = null;
    try {
      const spriteUrl = await getPokemonSprite(card.name);
      if (spriteUrl) {
        pokemonSprite = await getImageAsBase64(spriteUrl);
      }
    } catch (error) {
      console.log(`Could not load sprite for ${card.name}`);
    }
    
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
    
    if (pokemonSprite) {
      // Afficher l'image Pokémon réelle
      try {
        pdf.addImage(pokemonSprite, 'PNG', imageX, imageY, imageSize, imageSize);
      } catch (error) {
        console.log(`Could not add image for ${card.name}`);
        // Fallback to placeholder
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(imageX, imageY, imageSize, imageSize, 1.5, 1.5, 'F');
        
        // Motif décoratif Pokémon style Pokédex
        const centerX = imageX + imageSize / 2;
        const centerY = imageY + imageSize / 2;
        
        // Badge Pokémon style
        pdf.setFillColor(220, 38, 127);
        pdf.circle(centerX, centerY, imageSize / 6, 'F');
        
        // Pokéball icon simple
        pdf.setFillColor(255, 255, 255);
        pdf.circle(centerX, centerY, imageSize / 12, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.setTextColor(75, 85, 99);
        pdf.text('?', centerX, centerY + 1, { align: 'center' });
      }
    } else {
      // Placeholder élégant style Pokédex
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(imageX, imageY, imageSize, imageSize, 1.5, 1.5, 'F');
      
      // Motif décoratif Pokémon style Pokédex
      const centerX = imageX + imageSize / 2;
      const centerY = imageY + imageSize / 2;
      
      // Badge Pokémon style
      pdf.setFillColor(220, 38, 127);
      pdf.circle(centerX, centerY, imageSize / 6, 'F');
      
      // Pokéball icon simple
      pdf.setFillColor(255, 255, 255);
      pdf.circle(centerX, centerY, imageSize / 12, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(75, 85, 99);
      pdf.text('?', centerX, centerY + 1, { align: 'center' });
    }
    
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
