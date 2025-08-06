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
  
  const margin = 10;
  const columnGap = 8;
  const availableWidth = pageWidth - (margin * 2) - columnGap;
  const columnWidth = availableWidth / 2;
  const rowHeight = 6;
  const headerHeight = 10;
  
  // Colonnes du tableau pour chaque colonne de Pokémon
  const colWidths = [20, columnWidth - 35, 15]; // Numéro, Nom, Case
  const leftColumnStart = margin;
  const rightColumnStart = margin + columnWidth + columnGap;

    let currentY = margin + 35; // Plus d'espace pour le logo
  let pageNumber = 1;

  
  // Titre
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  const title = generation === 'all' 
    ? 'Checklist Pokédex - Toutes générations' 
    : `Checklist Pokédex - Génération ${generation}`;
  pdf.text(title, pageWidth / 2, margin + 25, { align: 'center' });
  
  // Fonction pour dessiner l'en-tête d'une colonne
  const drawColumnHeader = (x: number, y: number) => {
    const colPositions = [x, x + colWidths[0], x + colWidths[0] + colWidths[1]];
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, columnWidth, headerHeight, 'F');
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.rect(x, y, columnWidth, headerHeight);
    
    // Lignes verticales
    pdf.line(colPositions[1], y, colPositions[1], y + headerHeight);
    pdf.line(colPositions[2], y, colPositions[2], y + headerHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    
    pdf.text('N°', colPositions[0] + colWidths[0] / 2, y + 6, { align: 'center' });
    pdf.text('Nom du Pokémon', colPositions[1] + colWidths[1] / 2, y + 6, { align: 'center' });
    pdf.text('✓', colPositions[2] + colWidths[2] / 2, y + 6, { align: 'center' });
  };
  
  // Fonction pour dessiner une ligne de Pokémon dans une colonne
  const drawPokemonRow = (pokemon: Pokemon, x: number, y: number, index: number) => {
    const colPositions = [x, x + colWidths[0], x + colWidths[0] + colWidths[1]];
    
    // Fond de ligne alternée
    if (index % 2 === 1) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(x, y, columnWidth, rowHeight, 'F');
    }
    
    // Bordures de ligne
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, columnWidth, rowHeight);
    
    // Lignes verticales
    pdf.line(colPositions[1], y, colPositions[1], y + rowHeight);
    pdf.line(colPositions[2], y, colPositions[2], y + rowHeight);
    
    // Contenu des cellules
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    
    // Numéro
    const pokemonNumber = `#${pokemon.id.toString().padStart(4, '0')}`;
    pdf.text(pokemonNumber, colPositions[0] + colWidths[0] / 2, y + 4, { align: 'center' });
    
    // Nom (tronqué si trop long)
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const maxNameLength = 12;
    const truncatedName = displayName.length > maxNameLength 
      ? displayName.substring(0, maxNameLength - 1) + '.' 
      : displayName;
    pdf.text(truncatedName, colPositions[1] + 1, y + 4);
    
    // Case à cocher
    const checkboxSize = 3;
    const checkboxX = colPositions[2] + (colWidths[2] - checkboxSize) / 2;
    const checkboxY = y + (rowHeight - checkboxSize) / 2;
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
  };
  
  // Dessiner les en-têtes des deux colonnes
  drawColumnHeader(leftColumnStart, currentY);
  drawColumnHeader(rightColumnStart, currentY);
  currentY += headerHeight;
  
  const maxRowsPerPage = Math.floor((pageHeight - currentY - margin - 10) / rowHeight);
  let rowCount = 0;
  let leftColumnIndex = 0;
  let rightColumnIndex = 0;
  
  // Séparer les Pokémon en deux colonnes pour que les numéros se suivent verticalement
  const halfLength = Math.ceil(pokemonList.length / 2);
  const leftColumnPokemon = pokemonList.slice(0, halfLength);
  const rightColumnPokemon = pokemonList.slice(halfLength);
  
  const maxRows = Math.max(leftColumnPokemon.length, rightColumnPokemon.length);
  
  for (let i = 0; i < maxRows; i++) {
    // Nouvelle page si nécessaire
    if (rowCount >= maxRowsPerPage) {
      pdf.addPage();
      pageNumber++;
      currentY = margin + 35; // Espace pour le logo
      
      // Redessiner le logo sur la nouvelle page
      try {
        const logoHeight = 15;
        const logoWidth = 40;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = margin + 5;
        
        const response = await fetch(pokemonLogo);
        const blob = await response.blob();
        const reader = new FileReader();
        
        await new Promise((resolve) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            pdf.addImage(base64, 'PNG', logoX, logoY, logoWidth, logoHeight);
            resolve(true);
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.log('Logo non disponible sur nouvelle page');
      }
      
      drawColumnHeader(leftColumnStart, currentY);
      drawColumnHeader(rightColumnStart, currentY);
      currentY += headerHeight;
      rowCount = 0;
      leftColumnIndex = 0;
      rightColumnIndex = 0;
    }
    
    // Pokémon de la colonne de gauche
    const leftPokemon = leftColumnPokemon[i];
    if (leftPokemon) {
      drawPokemonRow(leftPokemon, leftColumnStart, currentY, leftColumnIndex);
      leftColumnIndex++;
    }
    
    // Pokémon de la colonne de droite
    const rightPokemon = rightColumnPokemon[i];
    if (rightPokemon) {
      drawPokemonRow(rightPokemon, rightColumnStart, currentY, rightColumnIndex);
      rightColumnIndex++;
    }
    
    currentY += rowHeight;
    rowCount++;
    
    // Progression
    if (onProgress) {
      const progress = ((i + 1) / maxRows) * 100;
      onProgress(Math.min(progress, 100));
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