
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../services/translations';

export const useTranslation = () => {
  const lang = useLanguage();
  
  // Helper to get text. Fallback to English if key missing in current lang.
  const t = (key: string) => {
    // If language is some dialect not in list (e.g. 'bs', 'hr'), fallback to 'sr' or 'en'
    let effectiveLang = lang;
    if (!translations[effectiveLang]) {
        if (effectiveLang === 'hr' || effectiveLang === 'bs' || effectiveLang === 'me') effectiveLang = 'sr';
        else effectiveLang = 'en';
    }

    return translations[effectiveLang]?.[key] || translations['en']?.[key] || key;
  };

  return { t, lang };
};
