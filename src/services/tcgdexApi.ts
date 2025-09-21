interface TCGdexSeries {
  id: string;
  name: string;
  sets: TCGdexSet[];
}

interface TCGdexSet {
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
  cards?: TCGdexCard[];
}

interface TCGdexCard {
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

class TCGdexAPI {
  private baseURL = 'https://api.tcgdex.net/v2';
  
  private async makeRequest<T>(endpoint: string, language: string = 'en'): Promise<T> {
    const url = `${this.baseURL}/${language}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TCGdex API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSeries(language: string = 'en'): Promise<TCGdexSeries[]> {
    try {
      const series = await this.makeRequest<TCGdexSeries[]>('/series', language);
      return Array.isArray(series) ? series : [];
    } catch (error) {
      console.error('Error fetching series from TCGdex:', error);
      throw error;
    }
  }

  async getSeriesSets(seriesId: string, language: string = 'en'): Promise<TCGdexSet[]> {
    try {
      const seriesData = await this.makeRequest<TCGdexSeries>(`/series/${seriesId}`, language);
      return seriesData.sets || [];
    } catch (error) {
      console.error('Error fetching series sets from TCGdex:', error);
      throw error;
    }
  }

  async getCards(setId: string, language: string = 'en'): Promise<TCGdexCard[]> {
    try {
      const setData = await this.makeRequest<TCGdexSet>(`/sets/${setId}`, language);
      
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
      console.error('Error fetching cards from TCGdex:', error);
      throw error;
    }
  }

  getCardImageUrl(card: TCGdexCard, setData: TCGdexSet, language: string = 'en'): string {
    return `https://assets.tcgdex.net/${language}/${setData.serie.id}/${setData.id}/${card.localId}/high.png`;
  }
}

export const tcgdexAPI = new TCGdexAPI();
export type { TCGdexSeries, TCGdexSet, TCGdexCard };
