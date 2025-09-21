interface TCGdxSeries {
  id: string;
  name: string;
  sets: TCGdxSet[];
}

interface TCGdxSet {
  id: string;
  name: string;
  serie: {
    id: string;
    name: string;
  };
  cardCount: {
    official: number;
    total: number;
  };
  releaseDate: string;
  logo: string;
  symbol: string;
  cards?: TCGdxCard[];
}

interface TCGdxCard {
  id: string;
  name: string;
  localId: string;
  rarity: string;
  category: string;
  variants?: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
  };
}

class TCGdxAPI {
  private baseURL = 'https://api.tcgdex.net/v2';
  
  private async makeRequest<T>(endpoint: string, language: string = 'en'): Promise<T> {
    const url = `${this.baseURL}/${language}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TCGdx API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSeries(language: string = 'en'): Promise<TCGdxSeries[]> {
    try {
      const series = await this.makeRequest<TCGdxSeries[]>('/series', language);
      return Array.isArray(series) ? series : [];
    } catch (error) {
      console.error('Error fetching series from TCGdx:', error);
      throw error;
    }
  }

  async getSeriesSets(seriesId: string, language: string = 'en'): Promise<TCGdxSet[]> {
    try {
      const seriesData = await this.makeRequest<TCGdxSeries>(`/series/${seriesId}`, language);
      return seriesData.sets || [];
    } catch (error) {
      console.error('Error fetching series sets from TCGdx:', error);
      throw error;
    }
  }

  async getCards(setId: string, language: string = 'en'): Promise<TCGdxCard[]> {
    try {
      const setData = await this.makeRequest<TCGdxSet>(`/sets/${setId}`, language);
      
      if (!setData.cards) {
        return [];
      }
      
      // Sort cards by localId handling complex formats
      const sortedCards = setData.cards.sort((a, b) => {
        const extractNumber = (cardNumber: string) => {
          const match = cardNumber.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        
        const extractPrefix = (cardNumber: string) => {
          const match = cardNumber.match(/([A-Za-z]+)/);
          return match ? match[1] : '';
        };
        
        const prefixA = extractPrefix(a.localId);
        const prefixB = extractPrefix(b.localId);
        const numA = extractNumber(a.localId);
        const numB = extractNumber(b.localId);
        
        // First sort by prefix, then by number
        if (prefixA !== prefixB) {
          return prefixA.localeCompare(prefixB);
        }
        
        return numA - numB;
      });
      
      return sortedCards;
    } catch (error) {
      console.error('Error fetching cards from TCGdx:', error);
      throw error;
    }
  }

  getCardImageUrl(card: TCGdxCard, setData: TCGdxSet, language: string = 'en'): string {
    return `https://assets.tcgdx.net/${language}/${setData.serie.id}/${setData.id}/${card.localId}/high.png`;
  }
}

export const tcgdxAPI = new TCGdxAPI();
export type { TCGdxSeries, TCGdxSet, TCGdxCard };
