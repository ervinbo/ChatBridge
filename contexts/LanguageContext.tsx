
import React, { createContext, useContext } from 'react';

export const LanguageContext = createContext<string>('sr');

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
