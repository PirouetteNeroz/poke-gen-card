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
  
  // Liste exhaustive des Pokémon Mega
  const megaPokemonIds = [
    3, 6, 9, 15, 18, 65, 80, 94, 115, 127, 130, 142, 150, 181, 208, 212, 214, 229, 
    248, 254, 257, 260, 282, 302, 303, 306, 308, 310, 319, 323, 334, 354, 359, 
    362, 373, 376, 380, 381, 384, 428, 445, 448, 460
  ];

  // Liste des formes régionales par région
  const regionalForms = {
    alola: [19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105],
    galar: [52, 77, 78, 79, 80, 83, 110, 122, 144, 145, 146, 199, 222, 263, 264, 554, 555, 562, 618],
    hisui: [58, 59, 100, 101, 157, 211, 215, 503, 549, 550, 570, 571, 628, 705, 706, 713, 724]
  };

  try {
    let processedCount = 0;
    let totalToProcess = megaPokemonIds.length;
    
    // Ajouter les formes régionales au total
    Object.values(regionalForms).forEach(ids => totalToProcess += ids.length);
    
    // Récupérer les Pokémon Mega
    const megaBatch = 5;
    for (let i = 0; i < megaPokemonIds.length; i += megaBatch) {
      const batch = megaPokemonIds.slice(i, i + megaBatch);
      const megaPromises = batch.map(async (id) => {
        const megaForms = [];
        try {
          // Récupérer le Pokémon de base
          const pokemonResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${id}`);
          const basePokemon = pokemonResponse.data;
          
          // Récupérer les informations d'espèce
          const speciesResponse = await axios.get(basePokemon.species.url);
          const speciesData = speciesResponse.data;
          
          // Obtenir le nom localisé
          let baseName = basePokemon.name;
          const nameEntry = speciesData.names?.find((n: any) => n.language.name === language);
          if (nameEntry) {
            baseName = nameEntry.name;
          }
          
          // Chercher les formes Mega possibles
          const megaVariants = ['mega', 'mega-x', 'mega-y'];
          
          for (const variant of megaVariants) {
            try {
              const megaName = `${basePokemon.name}-${variant}`;
              const megaResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${megaName}`);
              const megaData = megaResponse.data;
              
              let displayName = baseName;
              if (variant === 'mega-x') {
                displayName += ' (Mega X)';
              } else if (variant === 'mega-y') {
                displayName += ' (Mega Y)';
              } else {
                displayName += ' (Mega)';
              }
              
              megaForms.push({
                id: megaData.id,
                name: displayName,
                sprite: megaData.sprites?.other?.['official-artwork']?.front_default || megaData.sprites?.front_default,
                types: megaData.types.map((type: any) => type.type.name),
              });
            } catch (error) {
              // Cette forme Mega n'existe pas, continuer
            }
          }
        } catch (error) {
          console.warn(`Erreur lors du chargement des formes Mega pour ${id}:`, error);
        }
        return megaForms;
      });
      
      try {
        const results = await Promise.allSettled(megaPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            specialForms.push(...result.value);
          }
        });
        
        processedCount += batch.length;
        if (onProgress) {
          onProgress((processedCount / totalToProcess) * 100);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erreur batch Mega ${i}:`, error);
      }
    }
    
    // Récupérer les formes régionales
    for (const [region, ids] of Object.entries(regionalForms)) {
      const regionBatch = 5;
      for (let i = 0; i < ids.length; i += regionBatch) {
        const batch = ids.slice(i, i + regionBatch);
        const regionalPromises = batch.map(async (id) => {
          try {
            const regionalName = `${id}-${region}`;
            const regionalResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${regionalName}`);
            const regionalData = regionalResponse.data;
            
            // Obtenir le nom localisé
            const speciesResponse = await axios.get(regionalData.species.url);
            const speciesData = speciesResponse.data;
            
            let displayName = regionalData.name;
            const nameEntry = speciesData.names?.find((n: any) => n.language.name === language);
            if (nameEntry) {
              displayName = nameEntry.name;
            }
            
            // Ajouter le suffixe régional
            const regionSuffix = region.charAt(0).toUpperCase() + region.slice(1);
            displayName += ` (${regionSuffix})`;
            
            return {
              id: regionalData.id,
              name: displayName,
              sprite: regionalData.sprites?.other?.['official-artwork']?.front_default || regionalData.sprites?.front_default,
              types: regionalData.types.map((type: any) => type.type.name),
            };
          } catch (error) {
            console.warn(`Erreur forme régionale ${region} ${id}:`, error);
            return null;
          }
        });
        
        try {
          const results = await Promise.allSettled(regionalPromises);
          results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              specialForms.push(result.value);
            }
          });
          
          processedCount += batch.length;
          if (onProgress) {
            onProgress((processedCount / totalToProcess) * 100);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erreur batch régional ${region} ${i}:`, error);
        }
      }
    }

    // Récupérer aussi les formes Gmax via l'API des formes
    const formsResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon-form?limit=2000`);
    const allForms = formsResponse.data.results;
    
    const gmaxForms = allForms.filter((form: any) => {
      const name = form.name.toLowerCase();
      return name.includes('gmax') || name.includes('gigantamax');
    });

    const gmaxBatch = 5;
    for (let i = 0; i < gmaxForms.length; i += gmaxBatch) {
      const batch = gmaxForms.slice(i, i + gmaxBatch);
      const gmaxPromises = batch.map(async (form: any) => {
        try {
          const formResponse = await axios.get(form.url);
          const formData = formResponse.data;
          
          const pokemonResponse = await axios.get(formData.pokemon.url);
          const pokemonData = pokemonResponse.data;
          
          // Obtenir le nom localisé
          const speciesResponse = await axios.get(pokemonData.species.url);
          const speciesData = speciesResponse.data;
          
          let displayName = pokemonData.name;
          const nameEntry = speciesData.names?.find((n: any) => n.language.name === language);
          if (nameEntry) {
            displayName = nameEntry.name;
          }
          
          displayName += ' (Gmax)';
          
          return {
            id: pokemonData.id,
            name: displayName,
            sprite: formData.sprites?.front_default || pokemonData.sprites?.other?.['official-artwork']?.front_default || pokemonData.sprites?.front_default,
            types: pokemonData.types.map((type: any) => type.type.name),
          };
        } catch (error) {
          console.warn(`Erreur forme Gmax ${form.name}:`, error);
          return null;
        }
      });
      
      try {
        const results = await Promise.allSettled(gmaxPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            specialForms.push(result.value);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erreur batch Gmax ${i}:`, error);
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
        // Toujours récupérer le nom localisé depuis l'espèce
        try {
          const localizedSpeciesResponse = await axios.get<PokemonSpeciesResponse>(formData.species.url);
          const nameEntry = localizedSpeciesResponse.data.names.find(n => n.language.name === language);
          if (nameEntry) formName = nameEntry.name;
        } catch (e) {
          console.warn(`Pas de nom localisé pour ${formData.name}`);
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