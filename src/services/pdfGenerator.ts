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
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Card dimensions (9 cards per page in 3x3 grid) - Fill entire page
  const cardWidth = pageWidth / 3; // Full width, 3 cards per row
  const cardHeight = (pageHeight - 20) / 3; // Small top margin for title, 3 cards per column
  const margin = 0;
  
  let currentPage = 0;
  let cardCount = 0;
  
  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    const row = Math.floor(cardCount / 3);
    const col = cardCount % 3;
    
    // Add new page if needed
    if (cardCount === 0) {
      if (currentPage > 0) {
        pdf.addPage();
      }
      currentPage++;
    }
    
    // Calculate card position
    const x = col * cardWidth;
    const y = 10 + row * cardHeight; // Start from top
    
    // Draw cutting lines for binder insertion
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1], 0);
    
    // Vertical cutting lines
    if (col > 0) {
      pdf.line(x, y, x, y + cardHeight);
    }
    // Horizontal cutting lines
    if (row > 0) {
      pdf.line(x, y, x + cardWidth, y);
    }
    
    // Reset line style
    pdf.setLineDashPattern([], 0);
    
    // Card content area with padding
    const cardPadding = 3;
    const contentX = x + cardPadding;
    const contentY = y + cardPadding;
    const contentWidth = cardWidth - (cardPadding * 2);
    const contentHeight = cardHeight - (cardPadding * 2);
    
    // Draw card background
    pdf.setFillColor(255, 255, 255); // White background
    pdf.rect(contentX, contentY, contentWidth, contentHeight, 'F');
    
    // Draw card border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.8);
    pdf.rect(contentX, contentY, contentWidth, contentHeight);
    
    // Add Pokemon generation in top left
    const pokemonGen = getPokemonGeneration(pokemon.id);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Gen ${pokemonGen}`, contentX + 2, contentY + 8);
    
    // Add HP placeholder in top right
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`HP ___`, contentX + contentWidth - 2, contentY + 8, { align: 'right' });
    
    // Pokemon image area - much larger and centered
    const imageSize = Math.min(contentWidth * 0.8, contentHeight * 0.6);
    const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
    const imageY = contentY + 15;
    
    // Try to add real Pokemon image
    if (pokemon.sprite) {
      try {
        const base64Image = await getImageAsBase64(pokemon.sprite);
        if (base64Image) {
          pdf.addImage(base64Image, 'PNG', imageX, imageY, imageSize, imageSize);
        } else {
          // Fallback to placeholder
          pdf.setFillColor(240, 240, 240);
          pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(imageX, imageY, imageSize, imageSize);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text('IMG', imageX + imageSize / 2, imageY + imageSize / 2 + 2, { align: 'center' });
        }
      } catch (error) {
        // Fallback to placeholder
        pdf.setFillColor(240, 240, 240);
        pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(imageX, imageY, imageSize, imageSize);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('IMG', imageX + imageSize / 2, imageY + imageSize / 2 + 2, { align: 'center' });
      }
    }
    
    // Add Pokemon name in bold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    const nameY = imageY + imageSize + 8;
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    pdf.text(displayName, contentX + contentWidth / 2, nameY, { align: 'center' });
    
    // Add Pokemon number below name (as requested)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    const pokemonNumber = `#${pokemon.id.toString().padStart(4, '0')}`;
    pdf.text(pokemonNumber, contentX + contentWidth / 2, nameY + 8, { align: 'center' });
    
    // Add types below number
    if (pokemon.types.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(80, 80, 80);
      const typesText = pokemon.types.slice(0, 2).join(' • ');
      pdf.text(typesText, contentX + contentWidth / 2, nameY + 16, { align: 'center' });
    }
    
    // Add rarity placeholder at bottom
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text('◆ Rare', contentX + 2, contentY + contentHeight - 3);
    
    // Add condition box at bottom right
    pdf.text('État: ___', contentX + contentWidth - 2, contentY + contentHeight - 3, { align: 'right' });
    
    cardCount++;
    
    // Reset card count for new page (9 cards per page)
    if (cardCount >= 9) {
      cardCount = 0;
    }
    
    // Update progress
    if (onProgress) {
      const progress = ((i + 1) / pokemonList.length) * 100;
      onProgress(progress);
    }
  }
  
  // Generate filename
  const generationText = generation === 'all' ? 'toutes-generations' : `generation-${generation}`;
  const filename = `pokedex-placeholder-${generationText}-${language}.pdf`;
  
  // Save PDF
  pdf.save(filename);
};