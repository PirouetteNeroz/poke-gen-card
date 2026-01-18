import axios from 'axios';
import { SpriteStyle } from '@/types';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

// Helper function to get sprite based on style preference
const getSprite = (sprites: any, spriteStyle: SpriteStyle = 'hd'): string => {
  if (spriteStyle === 'pixel') {
    // Use pixel sprite (front_default) or fallback to HD
    return sprites?.front_default || sprites?.other?.['official-artwork']?.front_default || '';
  }
  // HD style: use official artwork or fallback to pixel
  return sprites?.other?.['official-artwork']?.front_default || sprites?.front_default || '';
};

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

export const fetchSpecialForms = async (language: string, spriteStyle: SpriteStyle = 'hd', onProgress?: (progress: number) => void): Promise<Pokemon[]> => {
  const specialForms: Pokemon[] = [];
  
  // Liste exhaustive et mise à jour des Pokémon Mega
  const megaPokemonIds = [
    // Génération 1
    3,    // Venusaur
    6,    // Charizard (X et Y)
    9,    // Blastoise
    15,   // Beedrill
    18,   // Pidgeot
    36,   // Clefable
    65,   // Alakazam
    71,   // Victreebel
    80,   // Slowbro
    94,   // Gengar
    115,  // Kangaskhan
    121,  // Starmie
    127,  // Pinsir
    130,  // Gyarados
    142,  // Aerodactyl
    149,  // Dragonite
    150,  // Mewtwo (X et Y)
    // Génération 2
    154,  // Meganium
    160,  // Feraligatr
    181,  // Ampharos
    208,  // Steelix
    212,  // Scizor
    214,  // Heracross
    227,  // Skarmory
    229,  // Houndoom
    248,  // Tyranitar
    // Génération 3
    254,  // Sceptile
    257,  // Blaziken
    260,  // Swampert
    282,  // Gardevoir
    302,  // Sableye
    303,  // Mawile
    306,  // Aggron
    308,  // Medicham
    310,  // Manectric
    319,  // Sharpedo
    323,  // Camerupt
    334,  // Altaria
    354,  // Banette
    359,  // Absol
    362,  // Glalie
    373,  // Salamence
    376,  // Metagross
    380,  // Latias
    381,  // Latios
    384,  // Rayquaza
    // Génération 4
    428,  // Lopunny
    445,  // Garchomp
    448,  // Lucario
    460,  // Abomasnow
    475,  //gallade
    478,  // Froslass
    // Génération 5
    500,  // Emboar
    530,  // Excadrill
    531,  // Audino
    545,  // Scolipede
    560,  // Scrafty
    604,  // Eelektross
    609,  // Chandelure
    // Génération 6
    652,  // Chesnaught
    655,  // Delphox
    658,  // Greninja
    668,  // Pyroar
    670,  // Floette
    687,  // Malamar
    689,  // Barbaracle
    691,  // Dragalge
    701,  // Hawlucha
    718,  // Zygarde
    719,  // Diancie
    // Génération 7
    780,  // Drampa
    // Génération 8
    870,  // Falinks
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
                sprite: getSprite(megaData.sprites, spriteStyle),
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
              sprite: getSprite(regionalData.sprites, spriteStyle),
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

    // Récupérer aussi les formes régionales et Gmax via l'API des formes (comme avant)
    const formsResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon-form?limit=2000`);
    const allForms = formsResponse.data.results;
    
    // Filtrer les formes spéciales via l'API (comme l'ancienne méthode)
    const apiSpecialForms = allForms.filter((form: any) => {
      const name = form.name.toLowerCase();
      
      // Exclure les faux positifs (mais garder meganium-mega)
      if ((name.includes('meganium') && !name.includes('mega')) || 
          name.includes('yanmega') || 
          name.includes('totem-alola') || 
          name.includes('alola-cap')) {
        return false;
      }
      
      return (name.includes('alola') && !name.includes('totem-alola') && !name.includes('alola-cap')) || 
             name.includes('galar') || 
             name.includes('hisui') || 
             name.includes('paldea') ||
             name.includes('gmax') ||
             name.includes('gigantamax');
    });

    const apiBatch = 10;
    for (let i = 0; i < apiSpecialForms.length; i += apiBatch) {
      const batch = apiSpecialForms.slice(i, i + apiBatch);
      const batchPromises = batch.map(async (form: any) => {
        try {
          const formResponse = await axios.get(form.url);
          const formData = formResponse.data;
          
          // Récupérer les données du Pokémon associé
          const pokemonResponse = await axios.get(formData.pokemon.url);
          const pokemonData = pokemonResponse.data;
          
          let formName = formData.form_name || pokemonData.name;
          
          // Déterminer le type de forme pour l'affichage
          const formType = form.name.toLowerCase();
          let formSuffix = '';
          
          if (formType.includes('alola')) {
            formSuffix = 'Alola';
          } else if (formType.includes('galar')) {
            formSuffix = 'Galar';
          } else if (formType.includes('hisui')) {
            formSuffix = 'Hisui';
          } else if (formType.includes('paldea')) {
            formSuffix = 'Paldea';
          } else if (formType.includes('gmax') || formType.includes('gigantamax')) {
            formSuffix = 'Gmax';
          }
          
          // Toujours récupérer le nom localisé depuis l'espèce
          try {
            const speciesResponse = await axios.get(pokemonData.species.url);
            const nameEntry = speciesResponse.data.names.find((n: any) => n.language.name === language);
            if (nameEntry) {
              formName = nameEntry.name;
            }
          } catch (e) {
            console.warn(`Pas de nom localisé pour ${formData.form_name}`);
          }
          
          // Ajouter le suffixe de forme
          if (formSuffix) {
            formName += ` (${formSuffix})`;
          }

          return {
            id: pokemonData.id,
            name: formName,
            sprite: spriteStyle === 'pixel' 
              ? (formData.sprites?.front_default || pokemonData.sprites?.front_default || '')
              : getSprite(pokemonData.sprites, spriteStyle),
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
            // Vérifier qu'on n'a pas déjà cette forme (pour éviter les doublons avec les Mega)
            const existingForm = specialForms.find(f => f.id === result.value.id && f.name === result.value.name);
            if (!existingForm) {
              specialForms.push(result.value);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erreur batch formes API ${i}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération des formes spéciales:', error);
  }
  
  return specialForms.sort((a, b) => a.id - b.id);
};

export const fetchPokemon = async (id: number, language: string, spriteStyle: SpriteStyle = 'hd'): Promise<Pokemon[]> => {
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
          sprite: getSprite(formData.sprites, spriteStyle),
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
  spriteStyle: SpriteStyle = 'hd',
  onProgress?: (progress: number) => void
): Promise<Pokemon[]> => {
  // Si c'est les formes spéciales, utiliser la fonction dédiée
  if (generation === 'special') {
    return fetchSpecialForms(language, spriteStyle, onProgress);
  }

  const { start, end } = getGenerationRange(generation);
  const pokemonList: Pokemon[] = [];
  const batchSize = 10; // batch réduit pour limiter la charge sur l'API

  for (let i = start; i <= end; i += batchSize) {
    const batchEnd = Math.min(i + batchSize - 1, end);
    const batchPromises: Promise<Pokemon[]>[] = [];

    for (let j = i; j <= batchEnd; j++) {
      batchPromises.push(fetchPokemon(j, language, spriteStyle));
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
