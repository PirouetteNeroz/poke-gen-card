
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

// Function to get generation number from Pokemon ID
const getPokemonGeneration = (id: number): number => {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
};

// Function to convert image URL to base64
const getImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = btoa(
      new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

export const generatePDF = async (
  pokemonList: Pokemon[],
  generation: string,
  language: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  // Limiter le nombre de Pokémon pour éviter l'erreur de mémoire
  const maxPokemon = 500;
  const limitedPokemonList = pokemonList.slice(0, maxPokemon);
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // DIMENSIONS RÉDUITES DE 15% : 56.1mm x 77.35mm
  const cardWidth = 66;
  const cardHeight = 91;
  
  // Calculer combien de cartes peuvent tenir sur une page avec ces dimensions exactes
  const cardsPerRow = Math.floor(pageWidth / cardWidth);
  const cardsPerCol = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = cardsPerRow * cardsPerCol;
  
  // Marges pour centrer les cartes
  const marginX = (pageWidth - (cardsPerRow * cardWidth)) / 2;
  const marginY = (pageHeight - (cardsPerCol * cardHeight)) / 2;
  
  let currentPage = 0;
  let cardCount = 0;
  
  // Ajouter une page de titre élégante
  const addTitlePage = () => {
    // Fond dégradé élégant
    const gradientSteps = 50;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(59 + (99 - 59) * ratio);
      const g = Math.round(130 + (102 - 130) * ratio);
      const b = Math.round(246 + (241 - 246) * ratio);
      
      pdf.setFillColor(r, g, b);
      pdf.rect(0, (pageHeight / gradientSteps) * i, pageWidth, pageHeight / gradientSteps + 1, 'F');
    }
    
    // Titre principal avec style avancé
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    const title = generation === 'all' 
      ? 'Collection Pokédex - Toutes Générations' 
      : `Collection Pokédex - Génération ${generation}`;
    pdf.text(title, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
    
    // Sous-titre
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(230, 240, 255);
    pdf.text('Cartes de collection à découper', pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });
    
    // Statistiques
    pdf.setFontSize(12);
    pdf.setTextColor(200, 220, 255);
    const totalText = pokemonList.length > maxPokemon 
      ? `${limitedPokemonList.length} Pokémon inclus (sur ${pokemonList.length} total)`
      : `${limitedPokemonList.length} Pokémon inclus`;
    pdf.text(totalText, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    
    // Éléments décoratifs
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(2);
    const decorLength = 40;
    pdf.line(pageWidth / 2 - decorLength, pageHeight / 2 + 25, pageWidth / 2 + decorLength, pageHeight / 2 + 25);
    
    // Petits cercles décoratifs
    pdf.setFillColor(255, 255, 255);
    for (let i = 0; i < 5; i++) {
      const x = pageWidth / 2 - 20 + i * 10;
      pdf.circle(x, pageHeight / 2 + 35, 1, 'F');
    }
  };
  
  addTitlePage();
  
  for (let i = 0; i < limitedPokemonList.length; i++) {
    const pokemon = limitedPokemonList[i];
    const row = Math.floor(cardCount / cardsPerRow);
    const col = cardCount % cardsPerRow;
    
    // Add new page if needed
    if (cardCount === 0) {
      pdf.addPage();
      currentPage++;
    }
    
    // Position de la carte avec les dimensions EXACTES
    const x = marginX + col * cardWidth;
    const y = marginY + row * cardHeight;
    
    // Dessiner les lignes de découpe élégantes
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
    
    // Contenu de la carte avec padding
    const cardPadding = 3;
    const contentX = x + cardPadding;
    const contentY = y + cardPadding;
    const contentWidth = cardWidth - (cardPadding * 2);
    const contentHeight = cardHeight - (cardPadding * 2);
    
    // Background avec dégradé subtil
    pdf.setFillColor(250, 252, 255);
    pdf.rect(contentX, contentY, contentWidth, contentHeight, 'F');
    
    // Bordure de carte noire continue
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.rect(contentX, contentY, contentWidth, contentHeight);
    
    // Badge génération élégant en haut à gauche
    const pokemonGen = getPokemonGeneration(pokemon.id);
    pdf.setFillColor(0, 0, 0);
    const badgeWidth = 18;
    const badgeHeight = 8;
    pdf.roundedRect(contentX + 2, contentY + 3, badgeWidth, badgeHeight, 2, 2, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`GEN ${pokemonGen}`, contentX + 2 + badgeWidth / 2, contentY + 8.5, { align: 'center' });
    
    // NOM DU POKEMON avec style amélioré
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const nameY = contentY + 20;
    pdf.text(displayName, contentX + contentWidth / 2, nameY, { align: 'center' });
    
    // Ligne décorative sous le nom
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    const lineWidth = Math.min(displayName.length * 4, contentWidth * 0.7);
    pdf.line(
      contentX + (contentWidth - lineWidth) / 2, 
      nameY + 2, 
      contentX + (contentWidth + lineWidth) / 2, 
      nameY + 2
    );
    
    // Zone image sans cadre
    const imageSize = Math.min(contentWidth * 0.7, contentHeight * 0.45);
    const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
    const imageY = nameY + 8;
    
    // Ajouter l'image du Pokémon
    if (pokemon.sprite) {
      try {
        const base64Image = await getImageAsBase64(pokemon.sprite);
        if (base64Image) {
          pdf.addImage(base64Image, 'PNG', imageX, imageY, imageSize, imageSize);
        } else {
          // Placeholder simple
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
      } catch (error) {
        // Placeholder simple
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
    }
    
    // Numéro du Pokémon avec style amélioré
    const pokemonNumber = `#${pokemon.id.toString().padStart(4, '0')}`;
    const numberY = imageY + imageSize + 8;
    
    // Badge pour le numéro
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const numberWidth = pdf.getTextWidth(pokemonNumber) + 6;
    
    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(
      contentX + (contentWidth - numberWidth) / 2, 
      numberY - 4, 
      numberWidth, 
      8, 
      2, 2, 'F'
    );
    
    pdf.setTextColor(255, 255, 255);
    pdf.text(pokemonNumber, contentX + contentWidth / 2, numberY + 1, { align: 'center' });
    
    
    cardCount++;
    
    // Reset pour nouvelle page
    if (cardCount >= cardsPerPage) {
      cardCount = 0;
    }
    
    // Progression
    if (onProgress) {
      const progress = ((i + 1) / limitedPokemonList.length) * 100;
      onProgress(progress);
    }
  }
  
  // Nom du fichier
  const generationText = generation === 'all' ? 'toutes-generations' : `generation-${generation}`;
  const filename = `pokedex-placeholder-${generationText}-${language}.pdf`;
  
  pdf.save(filename);
};
