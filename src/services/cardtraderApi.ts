interface CardTraderGame {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

interface CardTraderExpansion {
  id: number;
  name: string;
  code?: string;
  game_id: number;
  total_cards?: number;
  release_date?: string;
  image_url?: string;
}

interface CardTraderBlueprint {
  id: number;
  name: string;
  expansion_id: number;
  collector_number?: string;
  rarity?: string;
  image_url?: string;
}

class CardTraderAPI {
  private baseURL = 'https://api.cardtrader.com/api/v2';
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Clé API CardTrader non configurée. Veuillez ajouter votre clé API.');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Clé API invalide. Vérifiez votre token CardTrader.');
      }
      throw new Error(`Erreur API CardTrader: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getGames(): Promise<CardTraderGame[]> {
    try {
      return await this.makeRequest<CardTraderGame[]>('/games');
    } catch (error) {
      console.error('Erreur lors de la récupération des jeux:', error);
      throw error;
    }
  }

  async getExpansions(gameId: number): Promise<CardTraderExpansion[]> {
    try {
      return await this.makeRequest<CardTraderExpansion[]>(`/games/${gameId}/expansions`);
    } catch (error) {
      console.error('Erreur lors de la récupération des extensions:', error);
      throw error;
    }
  }

  async getBlueprints(expansionId: number): Promise<CardTraderBlueprint[]> {
    try {
      return await this.makeRequest<CardTraderBlueprint[]>(`/expansions/${expansionId}/blueprints`);
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes:', error);
      throw error;
    }
  }
}

export const cardtraderAPI = new CardTraderAPI();
export type { CardTraderGame, CardTraderExpansion, CardTraderBlueprint };