
import { dbFirestore } from './firebase';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';

interface LanguageData {
  name: string;
  nativeName: string;
  code: string;
  direction: 'ltr' | 'rtl';
  isoCode: string;
  regions: string[];
  enabled: boolean;
}

const LANGUAGES: LanguageData[] = [
  // --- Balkan & Ex-Yu ---
  {
    name: "Srpski",
    nativeName: "Српски",
    code: "sr",
    direction: "ltr",
    isoCode: "sr-RS",
    regions: ["Serbia", "Bosnia and Herzegovina", "Montenegro", "Croatia"],
    enabled: true
  },
  {
    name: "Hrvatski",
    nativeName: "Hrvatski",
    code: "hr",
    direction: "ltr",
    isoCode: "hr-HR",
    regions: ["Croatia", "Bosnia and Herzegovina"],
    enabled: true
  },
  {
    name: "Bosanski",
    nativeName: "Bosanski",
    code: "bs",
    direction: "ltr",
    isoCode: "bs-BA",
    regions: ["Bosnia and Herzegovina"],
    enabled: true
  },
  {
    name: "Slovenački",
    nativeName: "Slovenščina",
    code: "sl",
    direction: "ltr",
    isoCode: "sl-SI",
    regions: ["Slovenia", "Italy", "Austria"],
    enabled: true
  },
  {
    name: "Makedonski",
    nativeName: "Македонски",
    code: "mk",
    direction: "ltr",
    isoCode: "mk-MK",
    regions: ["North Macedonia"],
    enabled: true
  },
  {
    name: "Crnogorski",
    nativeName: "Crnogorski",
    code: "me",
    direction: "ltr",
    isoCode: "sr-ME", // Often shares ISO with Serbian or generic
    regions: ["Montenegro"],
    enabled: true
  },
  {
    name: "Albanski",
    nativeName: "Shqip",
    code: "sq",
    direction: "ltr",
    isoCode: "sq-AL",
    regions: ["Albania", "Kosovo", "North Macedonia"],
    enabled: true
  },

  // --- Major World Languages ---
  {
    name: "Engleski",
    nativeName: "English",
    code: "en",
    direction: "ltr",
    isoCode: "en-US",
    regions: ["USA", "UK", "Canada", "Australia", "New Zealand", "Global"],
    enabled: true
  },
  {
    name: "Kineski (Pojednostavljeni)",
    nativeName: "简体中文",
    code: "zh",
    direction: "ltr",
    isoCode: "zh-CN",
    regions: ["China", "Singapore", "Malaysia"],
    enabled: true
  },
  {
    name: "Španski",
    nativeName: "Español",
    code: "es",
    direction: "ltr",
    isoCode: "es-ES",
    regions: ["Spain", "Mexico", "South America", "USA"],
    enabled: true
  },
  {
    name: "Arapski",
    nativeName: "العربية",
    code: "ar",
    direction: "rtl",
    isoCode: "ar-SA",
    regions: ["Saudi Arabia", "Egypt", "UAE", "Iraq", "North Africa"],
    enabled: true
  },
  {
    name: "Hindi",
    nativeName: "हिन्दी",
    code: "hi",
    direction: "ltr",
    isoCode: "hi-IN",
    regions: ["India", "Fiji"],
    enabled: true
  },
  {
    name: "Portugalski",
    nativeName: "Português",
    code: "pt",
    direction: "ltr",
    isoCode: "pt-PT",
    regions: ["Portugal", "Brazil", "Angola", "Mozambique"],
    enabled: true
  },
  {
    name: "Ruski",
    nativeName: "Русский",
    code: "ru",
    direction: "ltr",
    isoCode: "ru-RU",
    regions: ["Russia", "Belarus", "Kazakhstan", "Kyrgyzstan"],
    enabled: true
  },
  {
    name: "Japanski",
    nativeName: "日本語",
    code: "ja",
    direction: "ltr",
    isoCode: "ja-JP",
    regions: ["Japan"],
    enabled: true
  },
  {
    name: "Nemački",
    nativeName: "Deutsch",
    code: "de",
    direction: "ltr",
    isoCode: "de-DE",
    regions: ["Germany", "Austria", "Switzerland", "Belgium"],
    enabled: true
  },
  {
    name: "Francuski",
    nativeName: "Français",
    code: "fr",
    direction: "ltr",
    isoCode: "fr-FR",
    regions: ["France", "Canada", "Belgium", "Switzerland", "Africa"],
    enabled: true
  },

  // --- Europe & Eurasia ---
  {
    name: "Turski",
    nativeName: "Türkçe",
    code: "tr",
    direction: "ltr",
    isoCode: "tr-TR",
    regions: ["Turkey", "Cyprus", "Germany"],
    enabled: true
  },
  {
    name: "Italijanski",
    nativeName: "Italiano",
    code: "it",
    direction: "ltr",
    isoCode: "it-IT",
    regions: ["Italy", "Switzerland", "San Marino"],
    enabled: true
  },
  {
    name: "Holandski",
    nativeName: "Nederlands",
    code: "nl",
    direction: "ltr",
    isoCode: "nl-NL",
    regions: ["Netherlands", "Belgium", "Suriname"],
    enabled: true
  },
  {
    name: "Grčki",
    nativeName: "Ελληνικά",
    code: "el",
    direction: "ltr",
    isoCode: "el-GR",
    regions: ["Greece", "Cyprus"],
    enabled: true
  },
  {
    name: "Poljski",
    nativeName: "Polski",
    code: "pl",
    direction: "ltr",
    isoCode: "pl-PL",
    regions: ["Poland"],
    enabled: true
  },
  {
    name: "Ukrajinski",
    nativeName: "Українська",
    code: "uk",
    direction: "ltr",
    isoCode: "uk-UA",
    regions: ["Ukraine"],
    enabled: true
  },
  {
    name: "Rumunski",
    nativeName: "Română",
    code: "ro",
    direction: "ltr",
    isoCode: "ro-RO",
    regions: ["Romania", "Moldova"],
    enabled: true
  },
  {
    name: "Mađarski",
    nativeName: "Magyar",
    code: "hu",
    direction: "ltr",
    isoCode: "hu-HU",
    regions: ["Hungary", "Romania", "Slovakia", "Serbia"],
    enabled: true
  },
  {
    name: "Češki",
    nativeName: "Čeština",
    code: "cs",
    direction: "ltr",
    isoCode: "cs-CZ",
    regions: ["Czech Republic"],
    enabled: true
  },
  {
    name: "Slovački",
    nativeName: "Slovenčina",
    code: "sk",
    direction: "ltr",
    isoCode: "sk-SK",
    regions: ["Slovakia"],
    enabled: true
  },
  {
    name: "Bugarski",
    nativeName: "Български",
    code: "bg",
    direction: "ltr",
    isoCode: "bg-BG",
    regions: ["Bulgaria"],
    enabled: true
  },

  // --- Nordic & Baltic ---
  {
    name: "Švedski",
    nativeName: "Svenska",
    code: "sv",
    direction: "ltr",
    isoCode: "sv-SE",
    regions: ["Sweden", "Finland"],
    enabled: true
  },
  {
    name: "Norveški",
    nativeName: "Norsk",
    code: "no",
    direction: "ltr",
    isoCode: "no-NO",
    regions: ["Norway"],
    enabled: true
  },
  {
    name: "Danski",
    nativeName: "Dansk",
    code: "da",
    direction: "ltr",
    isoCode: "da-DK",
    regions: ["Denmark"],
    enabled: true
  },
  {
    name: "Finski",
    nativeName: "Suomi",
    code: "fi",
    direction: "ltr",
    isoCode: "fi-FI",
    regions: ["Finland"],
    enabled: true
  },
  {
    name: "Islandski",
    nativeName: "Íslenska",
    code: "is",
    direction: "ltr",
    isoCode: "is-IS",
    regions: ["Iceland"],
    enabled: true
  },
  {
    name: "Estonski",
    nativeName: "Eesti",
    code: "et",
    direction: "ltr",
    isoCode: "et-EE",
    regions: ["Estonia"],
    enabled: true
  },
  {
    name: "Letonski",
    nativeName: "Latviešu",
    code: "lv",
    direction: "ltr",
    isoCode: "lv-LV",
    regions: ["Latvia"],
    enabled: true
  },
  {
    name: "Litvanski",
    nativeName: "Lietuvių",
    code: "lt",
    direction: "ltr",
    isoCode: "lt-LT",
    regions: ["Lithuania"],
    enabled: true
  },

  // --- Asia & Pacific ---
  {
    name: "Korejski",
    nativeName: "한국어",
    code: "ko",
    direction: "ltr",
    isoCode: "ko-KR",
    regions: ["South Korea", "North Korea"],
    enabled: true
  },
  {
    name: "Indonežanski",
    nativeName: "Bahasa Indonesia",
    code: "id",
    direction: "ltr",
    isoCode: "id-ID",
    regions: ["Indonesia"],
    enabled: true
  },
  {
    name: "Vijetnamski",
    nativeName: "Tiếng Việt",
    code: "vi",
    direction: "ltr",
    isoCode: "vi-VN",
    regions: ["Vietnam"],
    enabled: true
  },
  {
    name: "Tajlandski",
    nativeName: "ไทย",
    code: "th",
    direction: "ltr",
    isoCode: "th-TH",
    regions: ["Thailand"],
    enabled: true
  },
  {
    name: "Malajski",
    nativeName: "Bahasa Melayu",
    code: "ms",
    direction: "ltr",
    isoCode: "ms-MY",
    regions: ["Malaysia", "Brunei", "Singapore"],
    enabled: true
  },
  {
    name: "Filipinski (Tagalog)",
    nativeName: "Filipino",
    code: "tl",
    direction: "ltr",
    isoCode: "tl-PH",
    regions: ["Philippines"],
    enabled: true
  },
  {
    name: "Bengalski",
    nativeName: "বাংলা",
    code: "bn",
    direction: "ltr",
    isoCode: "bn-IN",
    regions: ["Bangladesh", "India"],
    enabled: true
  },

  // --- Middle East & Africa ---
  {
    name: "Hebrejski",
    nativeName: "עברית",
    code: "he",
    direction: "rtl",
    isoCode: "he-IL",
    regions: ["Israel"],
    enabled: true
  },
  {
    name: "Persijski (Farsi)",
    nativeName: "فارسی",
    code: "fa",
    direction: "rtl",
    isoCode: "fa-IR",
    regions: ["Iran", "Afghanistan"],
    enabled: true
  },
  {
    name: "Urdu",
    nativeName: "اردو",
    code: "ur",
    direction: "rtl",
    isoCode: "ur-PK",
    regions: ["Pakistan", "India"],
    enabled: true
  },
  {
    name: "Svahili",
    nativeName: "Kiswahili",
    code: "sw",
    direction: "ltr",
    isoCode: "sw-KE",
    regions: ["Kenya", "Tanzania", "Uganda"],
    enabled: true
  },
  {
    name: "Afrikans",
    nativeName: "Afrikaans",
    code: "af",
    direction: "ltr",
    isoCode: "af-ZA",
    regions: ["South Africa", "Namibia"],
    enabled: true
  },
  
  // --- Others ---
  {
    name: "Irski",
    nativeName: "Gaeilge",
    code: "ga",
    direction: "ltr",
    isoCode: "ga-IE",
    regions: ["Ireland"],
    enabled: true
  },
  {
    name: "Velški",
    nativeName: "Cymraeg",
    code: "cy",
    direction: "ltr",
    isoCode: "cy-GB",
    regions: ["Wales"],
    enabled: true
  },
  {
    name: "Malteški",
    nativeName: "Malti",
    code: "mt",
    direction: "ltr",
    isoCode: "mt-MT",
    regions: ["Malta"],
    enabled: true
  }
];

export const seedLanguages = async () => {
  const batch = writeBatch(dbFirestore);
  let count = 0;

  LANGUAGES.forEach((lang) => {
    // We use the language code as the Document ID for easy retrieval
    const docRef = doc(dbFirestore, "languages", lang.code);
    
    batch.set(docRef, {
      ...lang,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    count++;
  });

  try {
    await batch.commit();
    console.log(`Successfully seeded ${count} languages to Firestore!`);
    return true;
  } catch (error) {
    console.error("Error seeding languages:", error);
    return false;
  }
};