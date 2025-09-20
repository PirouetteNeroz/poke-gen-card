interface PokemonSet {
  id: string;
  name: string;
  series: string;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  images?: {
    small: string;
    large: string;
  };
}

interface PokemonApiResponse<T> {
  data: T[];
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
}

class PokemonTCGAPI {
  private baseURL = 'https://api.pokemontcg.io/v2';
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string): Promise<PokemonApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur API Pokémon TCG: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSets(): Promise<PokemonSet[]> {
    try {
      const response = await this.makeRequest<PokemonSet>('/sets?orderBy=releaseDate');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des sets:', error);
      throw error;
    }
  }

  async getCards(setId: string): Promise<PokemonCard[]> {
    try {
      const response = await this.makeRequest<PokemonCard>(`/cards?q=set.id:${setId}&orderBy=number`);
      // Sort cards by number handling complex formats (TG01, etc.)
      const sortedCards = response.data.sort((a, b) => {
        const extractNumber = (cardNumber: string) => {
          // Extract numeric part from card number
          const match = cardNumber.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        
        const extractPrefix = (cardNumber: string) => {
          // Extract non-numeric prefix (like "TG", "SWSH", etc.)
          const match = cardNumber.match(/([A-Za-z]+)/);
          return match ? match[1] : '';
        };
        
        const prefixA = extractPrefix(a.number);
        const prefixB = extractPrefix(b.number);
        const numA = extractNumber(a.number);
        const numB = extractNumber(b.number);
        
        // First sort by prefix, then by number
        if (prefixA !== prefixB) {
          return prefixA.localeCompare(prefixB);
        }
        
        return numA - numB;
      });
      return sortedCards;
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes:', error);
      throw error;
    }
  }

  async searchCards(query: string): Promise<PokemonCard[]> {
    try {
      const response = await this.makeRequest<PokemonCard>(`/cards?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la recherche des cartes:', error);
      throw error;
    }
  }
}

export const pokemonTCGAPI = new PokemonTCGAPI();
export type { PokemonSet, PokemonCard, PokemonApiResponse };