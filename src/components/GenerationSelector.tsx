import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GenerationSelectorProps {
  selectedGeneration: string;
  onGenerationChange: (generation: string) => void;
}

const generations = [
  { value: "all", label: "Toutes les générations", range: "1-1025" },
  { value: "special", label: "Formes spéciales", range: "Mega, Régionales, Gmax" },
  { value: "1", label: "Génération I", range: "1-151" },
  { value: "2", label: "Génération II", range: "152-251" },
  { value: "3", label: "Génération III", range: "252-386" },
  { value: "4", label: "Génération IV", range: "387-493" },
  { value: "5", label: "Génération V", range: "494-649" },
  { value: "6", label: "Génération VI", range: "650-721" },
  { value: "7", label: "Génération VII", range: "722-809" },
  { value: "8", label: "Génération VIII", range: "810-905" },
  { value: "9", label: "Génération IX", range: "906-1025" },
];

export const GenerationSelector = ({ selectedGeneration, onGenerationChange }: GenerationSelectorProps) => {
  return (
    <div className="w-full max-w-sm">
      <Select value={selectedGeneration} onValueChange={onGenerationChange}>
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue placeholder="Sélectionner une génération" />
        </SelectTrigger>
        <SelectContent>
          {generations.map((gen) => (
            <SelectItem key={gen.value} value={gen.value}>
              <div className="flex flex-col">
                <span className="font-medium">{gen.label}</span>
                <span className="text-xs text-muted-foreground">#{gen.range}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};