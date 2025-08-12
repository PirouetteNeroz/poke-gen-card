
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
  
  // Page de titre sobre pour impression comme le Pokédex
  const addTitlePage = () => {
    // Fond blanc (pas de couleur ajoutée, fond par défaut)
    
    // Titre principal en noir
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Collection TCG', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });
    
    // Nom de l'extension en noir
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text(setName, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
    
    // Sous-titre en gris foncé
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16);
    pdf.setTextColor(60, 60, 60);
    pdf.text('Cartes de collection à découper', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    
    // Statistiques en gris
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${cardsList.length} cartes incluses`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
    
    // Ligne décorative simple en noir
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    const decorLength = 50;
    pdf.line(pageWidth / 2 - decorLength, pageHeight / 2 + 40, pageWidth / 2 + decorLength, pageHeight / 2 + 40);
    
    // Bordure de page simple
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Date de génération
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    const currentDate = new Date().toLocaleDateString('fr-FR');
    pdf.text(`Généré le ${currentDate}`, pageWidth / 2, pageHeight - 25, { align: 'center' });
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
    
    // Lignes de découpe comme le Pokédex
    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    
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
    
    // Background blanc comme le Pokédex
    pdf.setFillColor(250, 252, 255);
    pdf.rect(contentX, contentY, contentWidth, contentHeight, 'F');
    
    // Bordure de carte noire continue comme le Pokédex
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.rect(contentX, contentY, contentWidth, contentHeight);
    
    // Badge numéro de carte comme le Pokédex
    const numberBadgeWidth = 18;
    const numberBadgeHeight = 8;
    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(contentX + 2, contentY + 3, numberBadgeWidth, numberBadgeHeight, 2, 2, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`#${card.number}`, contentX + 2 + numberBadgeWidth / 2, contentY + 8.5, { align: 'center' });
    
    // Nom de la carte en noir comme le Pokédex
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    const maxNameWidth = contentWidth - 4;
    let displayName = card.name;
    
    // Tronquer le nom si trop long
    while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== card.name) displayName += '...';
    
    const nameY = contentY + 20;
    pdf.text(displayName, contentX + contentWidth / 2, nameY, { align: 'center' });
    
    // Ligne décorative sous le nom en noir
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    const lineWidth = Math.min(displayName.length * 4, contentWidth * 0.7);
    pdf.line(
      contentX + (contentWidth - lineWidth) / 2, 
      nameY + 2, 
      contentX + (contentWidth + lineWidth) / 2, 
      nameY + 2
    );
    
    // Zone image sans cadre comme le Pokédex
    const imageSize = Math.min(contentWidth * 0.7, contentHeight * 0.45);
    const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
    const imageY = nameY + 8;
    
    if (pokemonSprite) {
      // Afficher l'image Pokémon réelle
      try {
        pdf.addImage(pokemonSprite, 'PNG', imageX, imageY, imageSize, imageSize);
      } catch (error) {
        console.log(`Could not add image for ${card.name}`);
        // Placeholder simple comme le Pokédex
        pdf.setFillColor(248, 250, 252);
        pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(1);
        pdf.rect(imageX, imageY, imageSize, imageSize);
        
        // Icône pokéball stylisée
        pdf.setFillColor(220, 38, 38);
        pdf.circle(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 8, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.circle(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 12, 'F');
      }
    } else {
      // Placeholder simple comme le Pokédex
      pdf.setFillColor(248, 250, 252);
      pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1);
      pdf.rect(imageX, imageY, imageSize, imageSize);
      
      // Icône pokéball stylisée
      pdf.setFillColor(220, 38, 38);
      pdf.circle(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 8, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.circle(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 12, 'F');
    }
    
    // Numéro de carte du set comme le Pokédex avec badge noir
    const cardNumber = `${card.number}/${cardsList.length}`;
    const numberY = imageY + imageSize + 8;
    
    // Badge pour le numéro comme le Pokédex
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const numberWidth = pdf.getTextWidth(cardNumber) + 6;
    
    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(
      contentX + (contentWidth - numberWidth) / 2, 
      numberY - 4, 
      numberWidth, 
      8, 
      2, 2, 'F'
    );
    
    pdf.setTextColor(255, 255, 255);
    pdf.text(cardNumber, contentX + contentWidth / 2, numberY + 1, { align: 'center' });
    
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
