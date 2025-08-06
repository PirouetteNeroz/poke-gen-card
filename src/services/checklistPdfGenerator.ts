import jsPDF from 'jspdf';

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export const generateChecklistPDF = async (
  pokemonList: Pokemon[],
  generation: string,
  language: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const margin = 15;
  const tableWidth = pageWidth - (margin * 2);
  const rowHeight = 8;
  const headerHeight = 12;
  
  // Colonnes du tableau
  const colWidths = [25, tableWidth - 45, 20]; // Numéro, Nom, Case
  const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
  
  let currentY = margin + 20;
  let pageNumber = 1;
  
  // Titre
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  const title = generation === 'all' 
    ? 'Checklist Pokédex - Toutes générations' 
    : `Checklist Pokédex - Génération ${generation}`;
  pdf.text(title, pageWidth / 2, margin + 10, { align: 'center' });
  
  // En-têtes du tableau
  const drawHeader = (y: number) => {
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y, tableWidth, headerHeight, 'F');
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, y, tableWidth, headerHeight);
    
    // Lignes verticales
    pdf.line(colPositions[1], y, colPositions[1], y + headerHeight);
    pdf.line(colPositions[2], y, colPositions[2], y + headerHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    pdf.text('N°', colPositions[0] + colWidths[0] / 2, y + 7, { align: 'center' });
    pdf.text('Nom du Pokémon', colPositions[1] + colWidths[1] / 2, y + 7, { align: 'center' });
    pdf.text('Possédé', colPositions[2] + colWidths[2] / 2, y + 7, { align: 'center' });
  };
  
  drawHeader(currentY);
  currentY += headerHeight;
  
  const maxRowsPerPage = Math.floor((pageHeight - currentY - margin) / rowHeight);
  let rowCount = 0;
  
  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    
    // Nouvelle page si nécessaire
    if (rowCount >= maxRowsPerPage) {
      pdf.addPage();
      pageNumber++;
      currentY = margin + 10;
      drawHeader(currentY);
      currentY += headerHeight;
      rowCount = 0;
    }
    
    // Fond de ligne alternée
    if (i % 2 === 1) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
    }
    
    // Bordures de ligne
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, currentY, tableWidth, rowHeight);
    
    // Lignes verticales
    pdf.line(colPositions[1], currentY, colPositions[1], currentY + rowHeight);
    pdf.line(colPositions[2], currentY, colPositions[2], currentY + rowHeight);
    
    // Contenu des cellules
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    
    // Numéro
    const pokemonNumber = `#${pokemon.id.toString().padStart(4, '0')}`;
    pdf.text(pokemonNumber, colPositions[0] + colWidths[0] / 2, currentY + 5.5, { align: 'center' });
    
    // Nom
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    pdf.text(displayName, colPositions[1] + 3, currentY + 5.5);
    
    // Case à cocher
    const checkboxSize = 4;
    const checkboxX = colPositions[2] + (colWidths[2] - checkboxSize) / 2;
    const checkboxY = currentY + (rowHeight - checkboxSize) / 2;
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
    
    currentY += rowHeight;
    rowCount++;
    
    // Progression
    if (onProgress) {
      const progress = ((i + 1) / pokemonList.length) * 100;
      onProgress(progress);
    }
  }
  
  // Pied de page avec numéros de page
  const totalPages = pageNumber;
  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) pdf.setPage(p);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${p} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Statistiques
    const stats = `Total: ${pokemonList.length} Pokémon`;
    pdf.text(stats, margin, pageHeight - 10);
  }
  
  // Nom du fichier
  const generationText = generation === 'all' ? 'toutes-generations' : `generation-${generation}`;
  const filename = `checklist-pokedex-${generationText}-${language}.pdf`;
  
  pdf.save(filename);
};