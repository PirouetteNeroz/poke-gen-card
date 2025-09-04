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
  varieties: Array<{
    is_default: boolean;
    pokemon: {
      name: string;
      url: string;
    };
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
    "special": { start: 1, end: 1025 }, // Formes spéciales
  };
  
  return ranges[generation] || ranges["1"];
};

export const fetchSpecialForms = async (language: string, onProgress?: (progress: number) => void): Promise<Pokemon[]> => {
  const specialForms: Pokemon[] = [];
  
  try {
    // Récupérer la liste de toutes les formes Pokémon depuis l'API
    const formsResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon-form?limit=2000`);
    const allForms = formsResponse.data.results;
    
    // Filtrer uniquement les formes spéciales demandées
    const specialFormUrls = allForms.filter((form: any) => {
      const name = form.name.toLowerCase();
      return name.includes('mega') || 
             name.includes('alola') || 
             name.includes('galar') || 
             name.includes('hisui') || 
             name.includes('paldea') ||
             name.includes('gmax') ||
             name.includes('gigantamax');
    });

    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < specialFormUrls.length; i += batchSize) {
      const batch = specialFormUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(async (form: any) => {
        try {
          const formResponse = await axios.get(form.url);
          const formData = formResponse.data;
          
          // Récupérer les données du Pokémon associé
          const pokemonResponse = await axios.get(formData.pokemon.url);
          const pokemonData = pokemonResponse.data;
          
          let formName = formData.form_name || pokemonData.name;
          
          // Localisation du nom si nécessaire
          if (language !== 'en') {
            try {
              const speciesResponse = await axios.get(pokemonData.species.url);
              const nameEntry = speciesResponse.data.names.find((n: any) => n.language.name === language);
              if (nameEntry) {
                formName = nameEntry.name;
                // Ajouter le suffixe de forme si disponible
                if (formData.form_name && formData.form_name !== pokemonData.name) {
                  const formSuffix = formData.form_name.replace(pokemonData.name + '-', '');
                  formName += ` (${formSuffix})`;
                }
              }
            } catch (e) {
              console.warn(`Pas de nom localisé pour ${formData.form_name}`);
            }
          }

          return {
            id: pokemonData.id,
            name: formName,
            sprite: formData.sprites?.front_default || pokemonData.sprites?.other?.['official-artwork']?.front_default || pokemonData.sprites?.front_default,
            types: pokemonData.types.map((type: any) => type.type.name),
          };
        } catch (error) {
          console.warn(`Erreur lors du chargement de la forme ${form.name}:`, error);
          return null;
        }
      });
      
      try {
        const results = await Promise.allSettled(batchPromises);
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            specialForms.push(result.value);
          }
        }
        
        processed += batch.length;
        if (onProgress) {
          onProgress((processed / specialFormUrls.length) * 100);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erreur batch formes spéciales ${i}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération des formes spéciales:', error);
  }
  
  return specialForms.sort((a, b) => a.id - b.id);
};

export const fetchPokemon = async (id: number, language: string): Promise<Pokemon[]> => {
  try {
    // On récupère le Pokémon principal
    const response = await axios.get<PokemonApiResponse>(`${POKEAPI_BASE_URL}/pokemon/${id}`);
    const data = response.data;

    // On va chercher les variétés (formes régionales, etc.)
    const speciesResponse = await axios.get<PokemonSpeciesResponse>(data.species.url);
    const varieties = speciesResponse.data.varieties || [];

    // On prépare une liste pour toutes les formes
    const forms: Pokemon[] = [];

    // On boucle sur chaque variété
    for (const variety of varieties) {
      try {
        const formResponse = await axios.get<PokemonApiResponse>(variety.pokemon.url);
        const formData = formResponse.data;

        let formName = formData.name;
        if (language !== 'en') {
          try {
            const localizedSpeciesResponse = await axios.get<PokemonSpeciesResponse>(formData.species.url);
            const nameEntry = localizedSpeciesResponse.data.names.find(n => n.language.name === language);
            if (nameEntry) formName = nameEntry.name;
          } catch (e) {
            console.warn(`Pas de nom localisé pour ${formData.name}`);
          }
        }

        forms.push({
          id: formData.id,
          name: formName,
          sprite: formData.sprites.other['official-artwork'].front_default || formData.sprites.front_default,
          types: formData.types.map(type => type.type.name),
        });
      } catch (err) {
        console.warn(`Erreur lors du chargement de la forme ${variety.pokemon.name}`);
      }
    }

    return forms;
  } catch (error) {
    console.error(`Erreur fetchPokemon pour ${id}:`, error);
    throw error;
  }
};

export const fetchPokemonBatch = async (
  generation: string,
  language: string,
  onProgress?: (progress: number) => void
): Promise<Pokemon[]> => {
  // Si c'est les formes spéciales, utiliser la fonction dédiée
  if (generation === 'special') {
    return fetchSpecialForms(language, onProgress);
  }

  const { start, end } = getGenerationRange(generation);
  const pokemonList: Pokemon[] = [];
  const batchSize = 10; // batch réduit pour limiter la charge sur l'API

  for (let i = start; i <= end; i += batchSize) {
    const batchEnd = Math.min(i + batchSize - 1, end);
    const batchPromises: Promise<Pokemon[]>[] = [];

    for (let j = i; j <= batchEnd; j++) {
      batchPromises.push(fetchPokemon(j, language));
    }

    try {
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          // Pour les générations normales, ne garder que la forme par défaut
          const defaultForms = result.value.filter(pokemon => {
            const name = pokemon.name.toLowerCase();
            return !name.includes('mega') && 
                   !name.includes('alola') && 
                   !name.includes('galar') && 
                   !name.includes('hisui') && 
                   !name.includes('paldea') &&
                   !name.includes('gmax') &&
                   !name.includes('gigantamax') &&
                   (!name.includes('-') || name.includes('nidoran') || name.includes('mr-mime') || name.includes('mime-jr'));
          });
          pokemonList.push(...defaultForms);
        }
      }

      if (onProgress) {
        const progress = ((batchEnd - start + 1) / (end - start + 1)) * 100;
        onProgress(progress);
      }

      // petit délai pour éviter de spammer l'API
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`Erreur batch ${i}-${batchEnd}:`, error);
    }
  }

  // Tri par ID pour éviter le désordre
  return pokemonList.sort((a, b) => a.id - b.id);
};