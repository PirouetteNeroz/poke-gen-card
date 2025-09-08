import { Card } from "@/components/ui/card";

interface PokemonCardProps {
  pokemon: {
    id: number;
    name: string;
    sprite: string;
    types: string[];
  };
  language: string;
}

export const PokemonCard = ({ pokemon, language }: PokemonCardProps) => {
  // Extraire le type de forme spéciale du nom
  const getSpecialFormType = (name: string): string | null => {
    const match = name.match(/\((Mega|Alola|Galar|Hisui|Paldea|Gmax)\)/);
    return match ? match[1] : null;
  };

  // Nettoyer le nom en retirant le suffixe de forme
  const getCleanName = (name: string): string => {
    return name.replace(/\s*\((Mega|Alola|Galar|Hisui|Paldea|Gmax)\)/, '');
  };

  const specialForm = getSpecialFormType(pokemon.name);
  const cleanName = getCleanName(pokemon.name);
  return (
    <Card className="w-full h-48 bg-gradient-card shadow-card border-border/50 relative overflow-hidden group hover:shadow-pokemon transition-all duration-300 hover:scale-105">
      {/* Card background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-background/80" />
      
      {/* Pokemon content */}
      <div className="relative h-full p-4 flex flex-col">
        {/* Card number */}
        <div className="absolute top-2 right-2 bg-pokemon-red text-white text-xs font-bold px-2 py-1 rounded-full">
          #{pokemon.id.toString().padStart(3, '0')}
        </div>
        
        {/* Special form badge */}
        {specialForm && (
          <div className="absolute top-2 left-2 bg-pokemon-blue text-white text-xs font-bold px-2 py-1 rounded-full">
            {specialForm}
          </div>
        )}
        
        {/* Pokemon image */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>
        
        {/* Pokemon name */}
        <div className="text-center">
          <h3 className="font-bold text-foreground capitalize text-sm mb-1">
            {cleanName}
          </h3>
          
          {/* Types */}
          <div className="flex gap-1 justify-center">
            {pokemon.types.slice(0, 2).map((type, index) => (
              <span
                key={index}
                className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};