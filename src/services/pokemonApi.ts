import axios from 'axios';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

interface PokemonApiResponse {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
  species: {
    url: string;
  };
}

interface PokemonSpeciesResponse {
  names: Array<{
    language: {
      name: string;
    };
    name: string;
  }>;
}

export const getGenerationRange = (generation: string): { start: number; end: number } => {
  const ranges: Record<string, { start: number; end: number }> = {
    "1": { start: 1, end: 151 },
    "2": { start: 152, end: 251 },
    "3": { start: 252, end: 386 },
    "4": { start: 387, end: 493 },
    "5": { start: 494, end: 649 },
    "6": { start: 650, end: 721 },
    "7": { start: 722, end: 809 },
    "8": { start: 810, end: 905 },
    "9": { start: 906, end: 1025 },
    "all": { start: 1, end: 1025 },
  };
  
  return ranges[generation] || ranges["1"];
};

export const fetchPokemon = async (id: number): Promise<Pokemon> => {
  try {
    const response = await axios.get<PokemonApiResponse>(`${POKEAPI_BASE_URL}/pokemon/${id}`);
    const data = response.data;
    
    return {
      id: data.id,
      name: data.name,
      sprite: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
      types: data.types.map(type => type.type.name),
    };
  } catch (error) {
    console.error(`Error fetching Pokemon ${id}:`, error);
    throw error;
  }
};

export const fetchPokemonName = async (id: number, language: string): Promise<string> => {
  try {
    const pokemonResponse = await axios.get<PokemonApiResponse>(`${POKEAPI_BASE_URL}/pokemon/${id}`);
    const speciesResponse = await axios.get<PokemonSpeciesResponse>(pokemonResponse.data.species.url);
    
    const nameEntry = speciesResponse.data.names.find(
      name => name.language.name === language
    );
    
    return nameEntry ? nameEntry.name : pokemonResponse.data.name;
  } catch (error) {
    console.error(`Error fetching Pokemon name for ${id}:`, error);
    return `Pokemon ${id}`;
  }
};

export const fetchPokemonBatch = async (
  generation: string,
  language: string,
  onProgress?: (progress: number) => void
): Promise<Pokemon[]> => {
  const { start, end } = getGenerationRange(generation);
  const pokemonList: Pokemon[] = [];
  const batchSize = 20; // Process in batches to avoid overwhelming the API
  
  for (let i = start; i <= end; i += batchSize) {
    const batchEnd = Math.min(i + batchSize - 1, end);
    const batchPromises: Promise<Pokemon>[] = [];
    
    for (let j = i; j <= batchEnd; j++) {
      batchPromises.push(fetchPokemon(j));
    }
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const pokemon = result.value;
          // Get localized name if needed
          if (language !== 'en') {
            try {
              pokemon.name = await fetchPokemonName(pokemon.id, language);
            } catch (error) {
              console.warn(`Failed to get localized name for Pokemon ${pokemon.id}`);
            }
          }
          pokemonList.push(pokemon);
        }
      }
      
      if (onProgress) {
        const progress = ((batchEnd - start + 1) / (end - start + 1)) * 100;
        onProgress(progress);
      }
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching batch ${i}-${batchEnd}:`, error);
    }
  }
  
  return pokemonList.sort((a, b) => a.id - b.id);
};