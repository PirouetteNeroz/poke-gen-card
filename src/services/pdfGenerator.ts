import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export const generatePDF = async (
  pokemonList: Pokemon[],
  generation: string,
  language: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Card dimensions (9 cards per page in 3x3 grid)
  const cardWidth = (pageWidth - 40) / 3; // 20mm margin, 3 cards per row
  const cardHeight = (pageHeight - 40) / 3; // 20mm margin, 3 cards per column
  const margin = 20;
  
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
      
      // Add page title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      const title = generation === 'all' 
        ? `Pokédex Placeholder - Toutes les générations`
        : `Pokédex Placeholder - Génération ${generation}`;
      pdf.text(title, pageWidth / 2, 15, { align: 'center' });
    }
    
    // Calculate card position
    const x = margin + col * cardWidth;
    const y = margin + 10 + row * cardHeight;
    
    // Draw card background
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.rect(x, y, cardWidth - 5, cardHeight - 5, 'F');
    
    // Draw card border
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.rect(x, y, cardWidth - 5, cardHeight - 5);
    
    // Add Pokemon number
    pdf.setFontSize(10);
    pdf.setTextColor(239, 68, 68); // Red color
    const pokemonNumber = `#${pokemon.id.toString().padStart(3, '0')}`;
    pdf.text(pokemonNumber, x + cardWidth - 15, y + 8, { align: 'right' });
    
    // Add placeholder image area
    const imageSize = 30;
    const imageX = x + (cardWidth - 5) / 2 - imageSize / 2;
    const imageY = y + 15;
    
    pdf.setFillColor(229, 231, 235); // Gray for image placeholder
    pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
    pdf.setDrawColor(156, 163, 175);
    pdf.rect(imageX, imageY, imageSize, imageSize);
    
    // Add "IMG" text in placeholder
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('IMG', imageX + imageSize / 2, imageY + imageSize / 2 + 2, { align: 'center' });
    
    // Add Pokemon name
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    const nameY = imageY + imageSize + 10;
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    pdf.text(displayName, x + (cardWidth - 5) / 2, nameY, { align: 'center' });
    
    // Add types
    if (pokemon.types.length > 0) {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      const typesText = pokemon.types.slice(0, 2).join(' • ');
      pdf.text(typesText, x + (cardWidth - 5) / 2, nameY + 8, { align: 'center' });
    }
    
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