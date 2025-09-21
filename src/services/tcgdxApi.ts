interface tcgdexSeries {
  id: string;
  name: string;
  sets: tcgdexSet[];
}

interface tcgdexSet {
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
  cards?: tcgdexCard[];
}

interface tcgdexCard {
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

class tcgdexAPI {
  private baseURL = 'https://api.tcgdex.net/v2';
  
  private async makeRequest<T>(endpoint: string, language: string = 'en'): Promise<T> {
    const url = `${this.baseURL}/${language}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`tcgdex API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSeries(language: string = 'en'): Promise<tcgdexSeries[]> {
    try {
      const series = await this.makeRequest<tcgdexSeries[]>('/series', language);
      return Array.isArray(series) ? series : [];
    } catch (error) {
      console.error('Error fetching series from tcgdex:', error);
      throw error;
    }
  }

  async getSeriesSets(seriesId: string, language: string = 'en'): Promise<tcgdexSet[]> {
    try {
      const seriesData = await this.makeRequest<any>(`/series/${seriesId}`, language);
      return seriesData.sets || [];
    } catch (error) {
      console.error('Error fetching series sets from tcgdex:', error);
      throw error;
    }
  }

  async getCards(setId: string, language: string = 'en'): Promise<tcgdexCard[]> {
    try {
      const setData = await this.makeRequest<any>(`/sets/${setId}`, language);
      
      if (!setData.cards) {
        return [];
      }
      
      // Sort cards by localId handling complex formats
      const sortedCards = setData.cards.sort((a: tcgdexCard, b: tcgdexCard) => {
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
      console.error('Error fetching cards from tcgdex:', error);
      throw error;
    }
  }

  getCardImageUrl(card: tcgdexCard, setData: tcgdexSet, language: string = 'en'): string {
    return `https://assets.tcgdex.net/${language}/${setData.serie.id}/${setData.id}/${card.localId}/high.png`;
  }
}

export const tcgdexAPI = new tcgdexAPI();
export type { tcgdexSeries, tcgdexSet, tcgdexCard };
