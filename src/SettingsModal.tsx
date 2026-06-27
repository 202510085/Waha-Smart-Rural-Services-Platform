import { X, Sun, Moon, Globe } from 'lucide-react';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  language: string;
  onLanguageChange: (l: string) => void;
}

export default function SettingsModal({ open, onClose, theme, onThemeChange, language, onLanguageChange }: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a5c38] text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">{t.settingsTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Theme section */}
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-[#8a9a8e] uppercase tracking-wider mb-3">{t.theme}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
                  theme === 'light'
                    ? 'border-[#1a5c38] bg-[#f5f0e8]'
                    : 'border-stone-200 dark:border-[#2d4a35] hover:border-stone-300 dark:hover:border-[#3d5a45]'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'light' ? 'bg-[#1a5c38] text-white' : 'bg-stone-100 dark:bg-[#253d2c] text-stone-500 dark:text-[#8a9a8e]'
                }`}>
                  <Sun size={20} />
                </div>
                <span className={`text-sm font-semibold ${theme === 'light' ? 'text-[#1a5c38]' : 'text-stone-600 dark:text-[#b0bdb3]'}`}>
                  {t.themeLight}
                </span>
                {theme === 'light' && (
                  <span className="text-xs text-[#1a5c38] font-bold">{t.themeActive}</span>
                )}
              </button>

              <button
                onClick={() => onThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
                  theme === 'dark'
                    ? 'border-[#c8b97a] bg-[#1a2e21]'
                    : 'border-stone-200 dark:border-[#2d4a35] hover:border-stone-300 dark:hover:border-[#3d5a45]'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#c8b97a] text-[#1a2e21]' : 'bg-stone-100 dark:bg-[#253d2c] text-stone-500 dark:text-[#8a9a8e]'
                }`}>
                  <Moon size={20} />
                </div>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-[#c8b97a]' : 'text-stone-600 dark:text-[#b0bdb3]'}`}>
                  {t.themeDark}
                </span>
                {theme === 'dark' && (
                  <span className="text-xs text-[#c8b97a] font-bold">{t.themeActive}</span>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-200 dark:border-[#2d4a35]" />

          {/* Language section */}
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-[#8a9a8e] uppercase tracking-wider mb-3">{t.language}</p>
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-[#1a5c38] flex-shrink-0" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onLanguageChange('ar')}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition border-2 ${
                    language === 'ar'
                      ? 'border-[#1a5c38] bg-[#1a5c38] text-white'
                      : 'border-stone-200 dark:border-[#2d4a35] text-stone-700 dark:text-[#b0bdb3] hover:border-[#1a5c38]/40'
                  }`}
                >
                  {t.arabic}
                </button>
                <button
                  onClick={() => onLanguageChange('en')}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition border-2 ${
                    language === 'en'
                      ? 'border-[#1a5c38] bg-[#1a5c38] text-white'
                      : 'border-stone-200 dark:border-[#2d4a35] text-stone-700 dark:text-[#b0bdb3] hover:border-[#1a5c38]/40'
                  }`}
                >
                  {t.english}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
