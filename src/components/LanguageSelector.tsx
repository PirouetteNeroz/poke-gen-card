import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
];

export const LanguageSelector = ({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) => {
  return (
    <div className="w-full max-w-sm">
      <Select value={selectedLanguage} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue placeholder="Sélectionner une langue" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};