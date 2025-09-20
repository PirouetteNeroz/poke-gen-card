interface TCGdxSet {
  id: string;
  name: string;
  serie: string;
  cardCount: {
    official: number;
    total: number;
  };
  releaseDate: string;
  logo: string;
  symbol: string;
}

interface TCGdxCard {
  id: string;
  name: string;
  localId: string;
  rarity: string;
  category: string;
  set: {
    id: string;
    name: string;
    serie: string;
  };
  image: string;
  variants?: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
  };
}

interface TCGdxApiResponse<T> {
  data?: T[];
  // TCGdx returns data directly for single items or arrays for lists
}

class TCGdxAPI {
  private baseURL = 'https://api.tcgdx.net/v2';
  
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

  async getSets(language: string = 'en'): Promise<TCGdxSet[]> {
    try {
      const sets = await this.makeRequest<TCGdxSet[]>('/sets', language);
      // TCGdx returns sets directly as an array
      return Array.isArray(sets) ? sets : [];
    } catch (error) {
      console.error('Error fetching sets from TCGdx:', error);
      throw error;
    }
  }

  async getCards(setId: string, language: string = 'en'): Promise<TCGdxCard[]> {
    try {
      const cards = await this.makeRequest<TCGdxCard[]>(`/sets/${setId}`, language);
      
      // Sort cards by localId handling complex formats
      const sortedCards = Array.isArray(cards) ? cards.sort((a, b) => {
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
      }) : [];
      
      return sortedCards;
    } catch (error) {
      console.error('Error fetching cards from TCGdx:', error);
      throw error;
    }
  }
}

export const tcgdxAPI = new TCGdxAPI();
export type { TCGdxSet, TCGdxCard };