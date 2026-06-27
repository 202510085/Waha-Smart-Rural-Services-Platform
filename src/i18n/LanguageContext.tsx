import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { getTranslations, type Lang, type Translations } from './translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ar',
  setLang: () => {},
  t: getTranslations('ar'),
  isRtl: true,
});

interface Props {
  children: ReactNode;
  language: string;
  onLanguageChange: (l: string) => void;
}

export function LanguageProvider({ children, language, onLanguageChange }: Props) {
  const lang: Lang = language === 'en' ? 'en' : 'ar';
  const isRtl = lang === 'ar';
  const t = getTranslations(lang);

  useEffect(() => {
    const root = document.documentElement;
    root.dir = isRtl ? 'rtl' : 'ltr';
    root.lang = lang;
  }, [lang, isRtl]);

  const setLang = (l: Lang) => {
    onLanguageChange(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
