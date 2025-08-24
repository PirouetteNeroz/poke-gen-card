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
  pdfType: "sprites" | "complete" | "master" | "graded" = "complete",
  onProgress?: (progress: number) => void
): Promise<void> => {
  const cardWidth = 56.1;
  const cardHeight = 77.35;
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const cardsPerRow = Math.floor(pageWidth / cardWidth);
  const cardsPerCol = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = cardsPerRow * cardsPerCol;
  
  // Limite de 8 pages par PDF pour éviter les erreurs de mémoire
  const MAX_PAGES_PER_PDF = 8;
  const maxCardsPerPdf = MAX_PAGES_PER_PDF * cardsPerPage;
  
  // Diviser les cartes en chunks de 8 pages maximum
  const totalPdfs = Math.ceil(cardsList.length / maxCardsPerPdf);
  
  for (let pdfIndex = 0; pdfIndex < totalPdfs; pdfIndex++) {
    const startIndex = pdfIndex * maxCardsPerPdf;
    const endIndex = Math.min(startIndex + maxCardsPerPdf, cardsList.length);
    const currentCards = cardsList.slice(startIndex, endIndex);
    
    await generateSinglePDF(
      currentCards, 
      setName, 
      pdfType, 
      pdfIndex + 1, 
      totalPdfs,
      startIndex,
      cardsList.length,
      onProgress
    );
    
    // Délai entre les PDF pour éviter la surcharge
    if (pdfIndex < totalPdfs - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const generateSinglePDF = async (
  cardsList: TCGCard[],
  setName: string,
  pdfType: "sprites" | "complete" | "master" | "graded",
  pdfNumber: number,
  totalPdfs: number,
  globalStartIndex: number,
  totalCards: number,
  onProgress?: (progress: number) => void
): Promise<void> => {
  // Batch très petit pour les master sets de plus de 100 cartes
  const BATCH_SIZE = pdfType === "master" ? (totalCards > 100 ? 8 : 15) : 25;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const cardWidth = 56.1;
  const cardHeight = 77.35;
  const cardsPerRow = Math.floor(pageWidth / cardWidth);
  const cardsPerCol = Math.floor(pageHeight / cardHeight);
  const cardsPerPage = cardsPerRow * cardsPerCol;
  
  const marginX = (pageWidth - (cardsPerRow * cardWidth)) / 2;
  const marginY = (pageHeight - (cardsPerCol * cardHeight)) / 2;
  
  let currentPage = 0;
  let cardCount = 0;
  
  // Page de titre sobre pour impression comme le Pokédex (seulement pour le premier PDF)
  const addTitlePage = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Collection TCG', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    const title = totalPdfs > 1 ? `${setName} (Partie ${pdfNumber}/${totalPdfs})` : setName;
    pdf.text(title, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16);
    pdf.setTextColor(60, 60, 60);
    pdf.text('Cartes de collection à découper', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    const cardInfo = totalPdfs > 1 ? 
      `${cardsList.length} cartes (${globalStartIndex + 1}-${globalStartIndex + cardsList.length} sur ${totalCards})` :
      `${cardsList.length} cartes incluses`;
    pdf.text(cardInfo, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    const decorLength = 50;
    pdf.line(pageWidth / 2 - decorLength, pageHeight / 2 + 40, pageWidth / 2 + decorLength, pageHeight / 2 + 40);
    
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    const currentDate = new Date().toLocaleDateString('fr-FR');
    pdf.text(`Généré le ${currentDate}`, pageWidth / 2, pageHeight - 25, { align: 'center' });
  };
  
  // Ajouter la page de titre seulement pour le premier PDF
  if (pdfNumber === 1) {
    addTitlePage();
  }
  
  // Fonction pour nettoyer la mémoire
  const cleanupMemory = () => {
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  };
  
  // Traitement par batch optimisé pour master sets
  for (let batchStart = 0; batchStart < cardsList.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, cardsList.length);
    
    console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(cardsList.length / BATCH_SIZE)} (${batchEnd - batchStart} cards)`);
    
    // Traiter chaque carte du batch
    for (let i = batchStart; i < batchEnd; i++) {
      try {
        const card = cardsList[i];
        const row = Math.floor(cardCount / cardsPerRow);
        const col = cardCount % cardsPerRow;
        
        // Gestion des images selon le type de PDF avec timeouts plus courts
        let cardImage = null;
        
        const loadImageWithTimeout = async (url: string, timeout = 5000): Promise<string | null> => {
          return Promise.race([
            getImageAsBase64(url),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]).catch((error) => {
            console.log(`Failed to load image: ${error.message}`);
            return null;
          });
        };
        
        if (pdfType === "sprites") {
          try {
            const spriteUrl = await getPokemonSprite(card.name);
            if (spriteUrl) {
              cardImage = await loadImageWithTimeout(spriteUrl);
            }
          } catch (error) {
            console.log(`Could not load sprite for ${card.name}:`, error);
          }
        } else {
          // Options TCG avec images de cartes - désactiver pour les gros master sets
          if (pdfType !== "master" || cardsList.length <= 100) {
            if (card.images?.large) {
              cardImage = await loadImageWithTimeout(card.images.large);
            }
            if (!cardImage && card.images?.small) {
              cardImage = await loadImageWithTimeout(card.images.small);
            }
          }
        }
        
        if (cardCount === 0) {
          pdf.addPage();
          currentPage++;
        }
        
        const x = marginX + col * cardWidth;
        const y = marginY + row * cardHeight;
        
        // Lignes de découpe pour toutes les options
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
        
        const cardPadding = 2.5;
        const contentX = x + cardPadding;
        const contentY = y + cardPadding;
        const contentWidth = cardWidth - (cardPadding * 2);
        const contentHeight = cardHeight - (cardPadding * 2);
        
        if (pdfType === "sprites") {
          // Affichage avec encadré pour les sprites (comme avant)
          
          pdf.setFillColor(250, 252, 255);
          pdf.rect(contentX, contentY, contentWidth, contentHeight, 'F');
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(1.5);
          pdf.rect(contentX, contentY, contentWidth, contentHeight);
        
          const numberBadgeWidth = 18;
          const numberBadgeHeight = 8;
          pdf.setFillColor(0, 0, 0);
          pdf.roundedRect(contentX + 2, contentY + 3, numberBadgeWidth, numberBadgeHeight, 2, 2, 'F');
          
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`#${card.number}`, contentX + 2 + numberBadgeWidth / 2, contentY + 8.5, { align: 'center' });
          
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          const maxNameWidth = contentWidth - 4;
          let displayName = card.name;
          
          while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          if (displayName !== card.name) displayName += '...';
          
          const nameY = contentY + 20;
          pdf.text(displayName, contentX + contentWidth / 2, nameY, { align: 'center' });
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.8);
          const lineWidth = Math.min(displayName.length * 4, contentWidth * 0.7);
          pdf.line(
            contentX + (contentWidth - lineWidth) / 2, 
            nameY + 2, 
            contentX + (contentWidth + lineWidth) / 2, 
            nameY + 2
          );
          
          const imageSize = Math.min(contentWidth * 0.7, contentHeight * 0.45);
          const imageX = contentX + (contentWidth / 2) - (imageSize / 2);
          const imageY = nameY + 8;
        
          if (cardImage) {
            try {
              pdf.addImage(cardImage, 'PNG', imageX, imageY, imageSize, imageSize);
            } catch (error) {
              console.log(`Could not add image for ${card.name}`);
              pdf.setFillColor(248, 250, 252);
              pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
              pdf.setDrawColor(0, 0, 0);
              pdf.setLineWidth(1);
              pdf.rect(imageX, imageY, imageSize, imageSize);
              
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(10);
              pdf.setTextColor(120, 120, 120);
              pdf.text('Pokémon', imageX + imageSize / 2, imageY + imageSize / 2, { align: 'center' });
            }
          } else {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(1);
            pdf.rect(imageX, imageY, imageSize, imageSize);
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(120, 120, 120);
            pdf.text('Pokémon', imageX + imageSize / 2, imageY + imageSize / 2, { align: 'center' });
          }
          
          const cardNumber = `${card.number}/${cardsList.length}`;
          const numberY = imageY + imageSize + 8;
          
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
        } else {
          // Affichage pour les cartes TCG sans cadre
          if (cardImage) {
            try {
              const isReverse = (card as any).isReverse;
              const isGraded = pdfType === "graded";
              
              const imageX = contentX;
              const imageY = contentY;
              const imageWidth = contentWidth;
              const imageHeight = contentHeight;
              
              pdf.addImage(cardImage, 'PNG', imageX, imageY, imageWidth, imageHeight);
              
              if (isReverse) {
                // Badge "REVERSE" avec image en bas à gauche
                try {
                  // URL de l'image du badge reverse
                  const reverseBadgeUrl = 'https://i.postimg.cc/0QhhJRCN/Carte-avec-banni-re-REVERSE.png';
                  const reverseBadgeImage = await loadImageWithTimeout(reverseBadgeUrl);
                  
                  if (reverseBadgeImage) {
                    const badgeSize = 20; // Taille du badge
                    const badgeX = imageX + imageWidth - badgeSize - 10; // Position en bas à gauche
                    const badgeY = imageY + imageHeight - badgeSize - 10;
                    
                    pdf.addImage(reverseBadgeImage, 'PNG', badgeX, badgeY, badgeSize, badgeSize);
                  } else {
                    // Fallback si l'image ne se charge pas
                    pdf.setFillColor(138, 43, 226, 0.9);
                    pdf.roundedRect(imageX + 3, imageY + imageHeight - 10, 20, 7, 2, 2, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(6);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text('REVERSE', imageX + 13, imageY + imageHeight - 5, { align: 'center' });
                  }
                } catch (error) {
                  console.log('Could not load reverse badge image, using fallback');
                  // Fallback si erreur
                  pdf.setFillColor(138, 43, 226, 0.9);
                  pdf.roundedRect(imageX + 3, imageY + imageHeight - 10, 20, 7, 2, 2, 'F');
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(6);
                  pdf.setTextColor(255, 255, 255);
                  pdf.text('REVERSE', imageX + 13, imageY + imageHeight - 5, { align: 'center' });
                }
              }

             

              if (isGraded) {
                // Badge "REVERSE" avec image en bas à gauche
                try {
                  // URL de l'image du badge reverse
                  const gradedBadgeUrl = 'https://i.postimg.cc/qq3q5p9n/Sans-titre.png';
                  const gradedBadgeImage = await loadImageWithTimeout(gradedBadgeUrl);
                  
                  if (gradedBadgeImage) {
                    const badgeSize = 30; // Taille du badge
                    const badgeX = imageX; // Position en bas à gauche
                    const badgeY = imageY;
                    
                    pdf.addImage(gradedBadgeImage, 'PNG', badgeX, badgeY, badgeSize, badgeSize);
                  } else {
                    // Fallback si l'image ne se charge pas
                    pdf.setFillColor(138, 43, 226, 0.9);
                    pdf.roundedRect(imageX + 3, imageY + imageHeight - 10, 20, 7, 2, 2, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(6);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text('GRADED', imageX + 13, imageY + imageHeight - 5, { align: 'center' });
                  }
                } catch (error) {
                  console.log('Could not load graded badge image, using fallback');
                  // Fallback si erreur
                  pdf.setFillColor(138, 43, 226, 0.9);
                  pdf.roundedRect(imageX + 3, imageY + imageHeight - 10, 20, 7, 2, 2, 'F');
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(6);
                  pdf.setTextColor(255, 255, 255);
                  pdf.text('Graded', imageX + 13, imageY + imageHeight - 5, { align: 'center' });
                }
              }


            } catch (error) {
              console.log(`Could not add TCG image for ${card.name}:`, error);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(10);
              pdf.setTextColor(120, 120, 120);
              pdf.text('TCG Card', contentX + contentWidth / 2, contentY + contentHeight / 2, { align: 'center' });
            }
          } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(120, 120, 120);
            pdf.text('TCG Card', contentX + contentWidth / 2, contentY + contentHeight / 2, { align: 'center' });
          }
        }
        
        cardCount++;
        
        if (cardCount >= cardsPerPage) {
          cardCount = 0;
        }
        
        if (onProgress) {
          const globalProgress = ((globalStartIndex + i + 1) / totalCards) * 100;
          onProgress(globalProgress);
        }
      } catch (error) {
        console.error(`Error processing card ${cardsList[i]?.name || i}:`, error);
        cardCount++;
        if (cardCount >= cardsPerPage) {
          cardCount = 0;
        }
      }
    }
    
    // Nettoyer la mémoire entre les batches pour les master sets
    if (pdfType === "master") {
      cleanupMemory();
      // Délai plus long pour les master sets
      if (batchEnd < cardsList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      if (batchEnd < cardsList.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
  
  try {
    const filename = `tcg-placeholders-${setName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error('Erreur lors de la sauvegarde du PDF. Le fichier est peut-être trop volumineux.');
  }
};
