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
  
  const margin = 12;
  const columnGap = 10;
  const availableWidth = pageWidth - (margin * 2) - columnGap;
  const columnWidth = availableWidth / 2;
  const rowHeight = 7;
  const headerHeight = 12;
  
  // Colonnes du tableau pour chaque colonne de Pokémon
  const colWidths = [20, columnWidth - 35, 15]; // Numéro, Nom, Case
  const leftColumnStart = margin;
  const rightColumnStart = margin + columnWidth + columnGap;
  
  let currentY = margin + 20; // Espace pour le titre
  let pageNumber = 1;
  
  // Traductions pour la checklist
  const translations = {
    fr: {
      title: generation === 'all' ? 'Checklist Pokédex - Toutes générations' : `Checklist Pokédex - Génération ${generation}`,
      numberCol: 'N°',
      nameCol: 'Nom du Pokémon',
      checkCol: '✓',
      total: 'Total'
    },
    en: {
      title: generation === 'all' ? 'Pokédex Checklist - All generations' : `Pokédex Checklist - Generation ${generation}`,
      numberCol: 'No.',
      nameCol: 'Pokémon Name',
      checkCol: '✓',
      total: 'Total'
    },
    ja: {
      title: generation === 'all' ? 'ポケモン図鑑チェックリスト - 全世代' : `ポケモン図鑑チェックリスト - 第${generation}世代`,
      numberCol: '番号',
      nameCol: 'ポケモン名',
      checkCol: '✓',
      total: '合計'
    },
    de: {
      title: generation === 'all' ? 'Pokédex-Checkliste - Alle Generationen' : `Pokédex-Checkliste - Generation ${generation}`,
      numberCol: 'Nr.',
      nameCol: 'Pokémon-Name',
      checkCol: '✓',
      total: 'Gesamt'
    },
    es: {
      title: generation === 'all' ? 'Lista Pokédex - Todas las generaciones' : `Lista Pokédex - Generación ${generation}`,
      numberCol: 'N°',
      nameCol: 'Nombre del Pokémon',
      checkCol: '✓',
      total: 'Total'
    },
    it: {
      title: generation === 'all' ? 'Checklist Pokédex - Tutte le generazioni' : `Checklist Pokédex - Generazione ${generation}`,
      numberCol: 'N°',
      nameCol: 'Nome del Pokémon',
      checkCol: '✓',
      total: 'Totale'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.fr;
  
  // Titre avec style amélioré
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(30, 58, 138); // Bleu foncé élégant
  pdf.text(t.title, pageWidth / 2, margin + 15, { align: 'center' });
  
  // Ligne décorative sous le titre
  pdf.setDrawColor(59, 130, 246); // Bleu
  pdf.setLineWidth(0.8);
  pdf.line(pageWidth / 4, margin + 18, (pageWidth * 3) / 4, margin + 18);
  
  // Fonction pour dessiner l'en-tête d'une colonne
  const drawColumnHeader = (x: number, y: number) => {
    const colPositions = [x, x + colWidths[0], x + colWidths[0] + colWidths[1]];
    
    // Fond dégradé pour l'en-tête
    pdf.setFillColor(230, 238, 250); // Bleu très clair
    pdf.rect(x, y, columnWidth, headerHeight, 'F');
    
    // Bordure plus épaisse et colorée
    pdf.setDrawColor(59, 130, 246); // Bleu
    pdf.setLineWidth(0.6);
    pdf.rect(x, y, columnWidth, headerHeight);
    
    // Lignes verticales
    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.3);
    pdf.line(colPositions[1], y, colPositions[1], y + headerHeight);
    pdf.line(colPositions[2], y, colPositions[2], y + headerHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 58, 138); // Bleu foncé
    
    pdf.text(t.numberCol, colPositions[0] + colWidths[0] / 2, y + 7.5, { align: 'center' });
    pdf.text(t.nameCol, colPositions[1] + colWidths[1] / 2, y + 7.5, { align: 'center' });
    pdf.text(t.checkCol, colPositions[2] + colWidths[2] / 2, y + 7.5, { align: 'center' });
  };
  
  // Fonction pour dessiner une ligne de Pokémon dans une colonne
  const drawPokemonRow = (pokemon: Pokemon, x: number, y: number, index: number) => {
    const colPositions = [x, x + colWidths[0], x + colWidths[0] + colWidths[1]];
    
    // Fond de ligne alternée avec couleurs plus subtiles
    if (index % 2 === 1) {
      pdf.setFillColor(248, 250, 252); // Gris très clair avec nuance bleue
      pdf.rect(x, y, columnWidth, rowHeight, 'F');
    }
    
    // Bordures de ligne plus subtiles
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, columnWidth, rowHeight);
    
    // Lignes verticales
    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.2);
    pdf.line(colPositions[1], y, colPositions[1], y + rowHeight);
    pdf.line(colPositions[2], y, colPositions[2], y + rowHeight);
    
    // Contenu des cellules
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81); // Gris foncé moderne
    
    // Numéro avec style amélioré
    const pokemonNumber = `#${pokemon.id.toString().padStart(4, '0')}`;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(99, 102, 241); // Violet/indigo
    pdf.text(pokemonNumber, colPositions[0] + colWidths[0] / 2, y + 4.5, { align: 'center' });
    
    // Nom (tronqué si trop long)
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const maxNameLength = 12;
    const truncatedName = displayName.length > maxNameLength 
      ? displayName.substring(0, maxNameLength - 1) + '.' 
      : displayName;
    pdf.text(truncatedName, colPositions[1] + 2, y + 4.5);
    
    // Case à cocher améliorée
    const checkboxSize = 3.5;
    const checkboxX = colPositions[2] + (colWidths[2] - checkboxSize) / 2;
    const checkboxY = y + (rowHeight - checkboxSize) / 2;
    
    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.4);
    pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
    
    // Petit point au centre pour améliorer la visibilité
    pdf.setFillColor(229, 231, 235);
    const dotSize = 0.5;
    pdf.circle(checkboxX + checkboxSize/2, checkboxY + checkboxSize/2, dotSize, 'F');
  };
  
  // Dessiner les en-têtes des deux colonnes
  drawColumnHeader(leftColumnStart, currentY);
  drawColumnHeader(rightColumnStart, currentY);
  currentY += headerHeight;
  
  const maxRowsPerPage = Math.floor((pageHeight - currentY - margin - 10) / rowHeight);
  const pokemonPerPage = maxRowsPerPage * 2; // 2 colonnes par page
  
  let pokemonIndex = 0;
  
  while (pokemonIndex < pokemonList.length) {
    // Si ce n'est pas la première page, créer une nouvelle page
    if (pokemonIndex > 0) {
      pdf.addPage();
      pageNumber++;
      currentY = margin + 20; // Espace pour le titre
      
      drawColumnHeader(leftColumnStart, currentY);
      drawColumnHeader(rightColumnStart, currentY);
      currentY += headerHeight;
    }
    
    // Prendre les Pokémon pour cette page
    const currentPagePokemon = pokemonList.slice(pokemonIndex, pokemonIndex + pokemonPerPage);
    
    // Séparer en deux colonnes pour cette page
    const halfLength = Math.ceil(currentPagePokemon.length / 2);
    const leftColumnPokemon = currentPagePokemon.slice(0, halfLength);
    const rightColumnPokemon = currentPagePokemon.slice(halfLength);
    
    const maxRows = Math.max(leftColumnPokemon.length, rightColumnPokemon.length);
    
    // Dessiner les Pokémon de cette page
    for (let i = 0; i < maxRows; i++) {
      // Pokémon de la colonne de gauche
      const leftPokemon = leftColumnPokemon[i];
      if (leftPokemon) {
        drawPokemonRow(leftPokemon, leftColumnStart, currentY, i);
      }
      
      // Pokémon de la colonne de droite
      const rightPokemon = rightColumnPokemon[i];
      if (rightPokemon) {
        drawPokemonRow(rightPokemon, rightColumnStart, currentY, i);
      }
      
      currentY += rowHeight;
    }
    
    pokemonIndex += pokemonPerPage;
    
    // Progression
    if (onProgress) {
      const progress = (pokemonIndex / pokemonList.length) * 100;
      onProgress(Math.min(progress, 100));
    }
  }
  
  // Pied de page avec numéros de page
  const totalPages = pageNumber;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${p} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Statistiques
    const stats = `${t.total}: ${pokemonList.length} Pokémon`;
    pdf.text(stats, margin, pageHeight - 10);
  }
  
  // Nom du fichier
  const generationText = generation === 'all' ? 'toutes-generations' : `generation-${generation}`;
  const filename = `checklist-pokedex-${generationText}-${language}.pdf`;
  
  pdf.save(filename);
};