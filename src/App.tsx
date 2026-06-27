import { useState, useEffect } from 'react';
import {
  HeartPulse, Sprout, Siren, ShoppingBasket, Megaphone, MapPin, Flag,
  Sparkles, Bot, Menu, X, ChevronLeft, Truck, Users,
  ShieldCheck, MapPinned, User as UserIcon, Car, Loader2, MailWarning,
  Settings, Calendar,
} from 'lucide-react';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';

function PalmTreeIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 22V11" />
      <path d="M9.58 9.4C9.2 8.46 8.44 7.74 7.5 7.4 6 6.87 4.4 7.33 3.3 8.43c1.64-.44 3.3-.15 4.7.73" />
      <path d="M10.15 8.05C9.44 6.89 8.26 6.09 6.88 5.95 5.17 5.78 3.63 6.69 2.8 8.1c1.67-.71 3.51-.72 5.18-.02" />
      <path d="M14.42 9.4c.38-.94 1.14-1.66 2.08-2 1.5-.53 3.1-.07 4.2 1.03-1.64-.44-3.3-.15-4.7.73" />
      <path d="M13.85 8.05c.71-1.16 1.89-1.96 3.27-2.1 1.71-.17 3.25.74 4.08 2.15-1.67-.71-3.51-.72-5.18-.02" />
      <path d="M13 11c0-2.5-2-5-5-5" />
      <path d="M13 11c0-2.5 2-5 5-5" />
      <path d="M11 22h4" />
    </svg>
  );
}
import EventsView from './EventsView';
import AssistantPanel from './AssistantPanel';
import CaravanView from './CaravanView';
import ReportsView from './ReportsView';
import MarketView from './MarketView';
import AnnouncementsView from './AnnouncementsView';
import EmergencyView from './EmergencyView';
import HealthView from './HealthView';
import AgricultureView from './AgricultureView';
import LocationView from './LocationView';
import TransportView from './TransportView';
import AuthView from './AuthView';
import AccountView from './AccountView';
import SettingsModal from './SettingsModal';
import Toast, { type ToastData } from './Toast';
import { supabase } from './lib/supabase';
import { fetchProfile, signOut, type Profile, USER_TYPE_LABELS } from './utils/auth';
import { fetchReports, fetchAnnouncements, fetchProducts, fetchEvents } from './lib/data';
import type { AssistantAction } from './assistant';

type ServiceId = 'health' | 'agriculture' | 'emergency' | 'market' | 'announcements' | 'location' | 'reports' | 'caravan' | 'account' | 'transport' | 'events' | null;

const SERVICES = [
  { id: 'health' as const, name: 'الصحة', icon: HeartPulse, color: 'rose', desc: 'مراكز صحية واستشارات' },
  { id: 'agriculture' as const, name: 'الزراعة', icon: Sprout, color: 'emerald', desc: 'فحص محاصيل بالذكاء الاصطناعي' },
  { id: 'emergency' as const, name: 'الطوارئ', icon: Siren, color: 'red', desc: 'SOS مع تحديد الموقع' },
  { id: 'market' as const, name: 'السوق المحلي', icon: ShoppingBasket, color: 'amber', desc: 'بيع مباشر ومزاد' },
  { id: 'announcements' as const, name: 'الإعلانات', icon: Megaphone, color: 'blue', desc: 'مناسبات وإعلانات' },
  { id: 'location' as const, name: 'الموقع والخدمات', icon: MapPin, color: 'cyan', desc: 'أقرب الخدمات بالكيلومتر' },
  { id: 'reports' as const, name: 'بلاغات المجتمع', icon: Flag, color: 'orange', desc: 'رفع بلاغات مباشرة' },
  { id: 'transport' as const, name: 'النقل الذكي', icon: Car, color: 'purple', desc: 'رحلات تشاركية آمنة' },
  { id: 'events' as const, name: 'الفعاليات', icon: Calendar, color: 'violet', desc: 'فعاليات المنطقة والمجتمع' },
  { id: 'caravan' as const, name: 'القافلة الذكية', icon: Truck, color: 'green', desc: 'تحليل الاحتياج وتوصيات' },
];

// Light-mode card colors; dark-mode overrides handled in index.css
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; gradient: string; iconBg: string }> = {
  rose:    { bg: 'bg-white', text: 'text-rose-700',    border: 'border-rose-100',    gradient: 'from-rose-500 to-rose-600',       iconBg: 'bg-rose-50' },
  emerald: { bg: 'bg-white', text: 'text-emerald-700', border: 'border-emerald-100', gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-50' },
  red:     { bg: 'bg-white', text: 'text-red-700',     border: 'border-red-100',     gradient: 'from-red-500 to-red-600',         iconBg: 'bg-red-50' },
  amber:   { bg: 'bg-white', text: 'text-amber-700',   border: 'border-amber-100',   gradient: 'from-amber-500 to-amber-600',     iconBg: 'bg-amber-50' },
  blue:    { bg: 'bg-white', text: 'text-blue-700',    border: 'border-blue-100',    gradient: 'from-blue-500 to-blue-600',       iconBg: 'bg-blue-50' },
  cyan:    { bg: 'bg-white', text: 'text-cyan-700',    border: 'border-cyan-100',    gradient: 'from-cyan-500 to-cyan-600',       iconBg: 'bg-cyan-50' },
  orange:  { bg: 'bg-white', text: 'text-orange-700',  border: 'border-orange-100',  gradient: 'from-orange-500 to-orange-600',   iconBg: 'bg-orange-50' },
  purple:  { bg: 'bg-white', text: 'text-purple-700',  border: 'border-purple-100',  gradient: 'from-purple-500 to-purple-600',   iconBg: 'bg-purple-50' },
  violet:  { bg: 'bg-white', text: 'text-violet-700',  border: 'border-violet-100',  gradient: 'from-violet-500 to-violet-600',   iconBg: 'bg-violet-50' },
  green:   { bg: 'bg-white', text: 'text-emerald-800', border: 'border-emerald-100', gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-50' },
};

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('waaha-lang') || 'ar');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('waaha-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('waaha-theme', theme);
  }, [theme]);

  return (
    <LanguageProvider language={language} onLanguageChange={setLanguage}>
      <AppContent theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
    </LanguageProvider>
  );
}

function AppContent({
  theme,
  setTheme,
  language,
  setLanguage,
}: {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  language: string;
  setLanguage: (l: string) => void;
}) {
  const { t } = useTranslation();
  const [activeService, setActiveService] = useState<ServiceId>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [transportRequestMode, setTransportRequestMode] = useState(false);
  const [reportPrefillType, setReportPrefillType] = useState<string | undefined>(undefined);
  const [assistantPrefill, setAssistantPrefill] = useState<{
    target: ServiceId; action: string; prefill: Record<string, any>; nonce: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('waaha-lang', language);
  }, [language]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          if (active) {
            setUser(profile);
            setAuthLoading(false);
          }
        });
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setActiveService(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (active) setUser(profile);
        }
      })();
    });

    fetchReports().then((data) => { if (active) setReports(data); });

    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as ServiceId;
      setActiveService(detail);
    };
    window.addEventListener('waaha:navigate', handleNavigate);

    return () => { active = false; subscription.unsubscribe(); window.removeEventListener('waaha:navigate', handleNavigate); };
  }, []);

  const showToast = (message: string) => setToast({ id: `t-${Date.now()}`, message, type: 'success' });

  useEffect(() => {
    if (activeService !== 'transport') setTransportRequestMode(false);
    if (activeService !== 'reports') setReportPrefillType(undefined);
    if (assistantPrefill && activeService !== assistantPrefill.target) setAssistantPrefill(null);
  }, [activeService]);

  const handleAuth = (profile: Profile) => { setUser(profile); setShowAuth(false); };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setActiveService(null);
    showToast(t.signOutSuccess);
  };

  const handleRequireLogin = () => { setShowAuth(true); };
  const handleGoToAccount = () => { setActiveService('account'); };
  const handleProfileUpdate = (profile: Profile) => { setUser(profile); };

  const handleAssistantAction = (action: AssistantAction) => {
    setAssistantOpen(false);

    const setPrefill = (target: ServiceId, actionType: string, prefill: Record<string, any>) => {
      setAssistantPrefill({ target, action: actionType, prefill: prefill ?? {}, nonce: Date.now() });
    };

    switch (action.type) {
      case 'none':
        break;
      case 'open_home':
        setActiveService(null);
        break;
      case 'open_service':
      case 'open_health':
      case 'open_health_services':
      case 'open_health_consultation':
        setActiveService('health');
        break;
      case 'open_location':
      case 'open_services':
      case 'open_location_search':
        setActiveService('location');
        break;
      case 'open_agriculture_scan':
      case 'open_agriculture':
      case 'open_crop_scan':
      case 'open_agri_advice_request':
        setActiveService('agriculture');
        break;
      case 'sos':
      case 'open_sos':
        setActiveService('emergency');
        break;
      case 'open_market':
        setActiveService('market');
        break;
      case 'open_market_search':
        setActiveService('market');
        if (action.prefill && Object.keys(action.prefill).length > 0) {
          setPrefill('market', 'open_market_search', action.prefill);
        }
        break;
      case 'open_add_product':
      case 'new_market_item_form':
      case 'new_market_item':
        setActiveService('market');
        setPrefill('market', 'open_add_product', action.prefill ?? {});
        break;
      case 'open_announcements':
      case 'new_announcement':
        setActiveService('announcements');
        break;
      case 'open_add_announcement':
        setActiveService('announcements');
        setPrefill('announcements', 'open_add_announcement', action.prefill ?? {});
        break;
      case 'open_reports':
        setActiveService('reports');
        break;
      case 'open_reports_search':
        setActiveService('reports');
        if (action.prefill && Object.keys(action.prefill).length > 0) {
          setPrefill('reports', 'open_reports_search', action.prefill);
        }
        break;
      case 'open_new_report':
      case 'new_report':
        setActiveService('reports');
        if (action.prefill?.report_type) {
          setReportPrefillType(action.prefill.report_type);
          setPrefill('reports', 'open_new_report', action.prefill);
        } else {
          setPrefill('reports', 'open_new_report', action.prefill ?? {});
        }
        break;
      case 'new_report_lighting':
        setActiveService('reports');
        setReportPrefillType(action.prefillType || 'إنارة');
        setPrefill('reports', 'open_new_report', { report_type: action.prefillType || 'إنارة', ...(action.prefill ?? {}) });
        break;
      case 'open_caravan':
        setActiveService('caravan');
        break;
      case 'open_transport':
        setActiveService('transport');
        break;
      case 'open_ride_request':
      case 'new_transport_request':
        setActiveService('transport');
        setTransportRequestMode(true);
        if (action.prefill && Object.keys(action.prefill).length > 0) {
          setPrefill('transport', 'open_ride_request', action.prefill);
        }
        break;
      case 'open_events':
        setActiveService('events');
        break;
      case 'open_events_search':
        setActiveService('events');
        if (action.prefill && Object.keys(action.prefill).length > 0) {
          setPrefill('events', 'open_events_search', action.prefill);
        }
        break;
      case 'open_add_event':
      case 'open_event_registration':
        setActiveService('events');
        setPrefill('events', action.type, action.prefill ?? {});
        break;
      case 'open_account':
        if (user) setActiveService('account');
        else setShowAuth(true);
        break;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#0f1b14] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#1a5c38]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#0f1b14] text-stone-800 dark:text-[#e8ede9]">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#1a5c38] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-1.5 rounded-lg hover:bg-white/10">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <button
              onClick={() => { setActiveService(null); setMenuOpen(false); }}
              className="flex items-center gap-3 hover:opacity-90 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-[#c8b97a] flex items-center justify-center group-hover:bg-[#d4c789] transition">
                <PalmTreeIcon size={22} className="text-[#1a5c38]" />
              </div>
              <div className="text-right">
                <h1 className="font-bold text-xl">{t.appName}</h1>
                <p className="text-xs text-white/70">{t.appSubtitle}</p>
              </div>
            </button>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            <button onClick={() => setActiveService(null)}
              className={`px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition ${!activeService ? 'bg-white/15' : ''}`}>
              {t.home}
            </button>
            {SERVICES.map((s) => (
              <button key={s.id} onClick={() => setActiveService(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition ${activeService === s.id ? 'bg-white/15' : ''}`}>
                {(t as any)[s.id] || s.id}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white/15 transition text-white"
              title={t.settings}>
              <Settings size={20} />
            </button>

            {/* User button — avatar + name when logged in */}
            <button
              onClick={() => user ? setActiveService('account') : setShowAuth(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition rounded-full pr-3 pl-1.5 py-1.5"
            >
              {user ? (
                <>
                  <div className="flex flex-col items-end leading-tight hidden sm:flex">
                    <span className="text-sm font-semibold text-white truncate max-w-[120px]">{user.fullName || t.myAccount}</span>
                    <span className="text-[10px] text-white/65">{USER_TYPE_LABELS[user.userType] || t.myAccount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#c8b97a] flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#c8b97a] flex items-center justify-center">
                        <UserIcon size={16} className="text-[#1a5c38]" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline text-sm font-semibold text-white">{t.login}</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <UserIcon size={16} className="text-white" />
                  </div>
                </>
              )}
            </button>

            <button onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-1.5 bg-[#c8b97a] text-[#1a5c38] font-semibold px-3 py-2 rounded-full text-sm hover:bg-[#d4c789] transition flex-shrink-0">
              <Bot size={18} />
              <span className="hidden sm:inline">{t.assistant}</span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="sm:hidden border-t border-white/10 px-4 py-2 flex flex-col gap-1">
            <button onClick={() => { setActiveService(null); setMenuOpen(false); }}
              className="text-right px-3 py-2 rounded-lg text-sm hover:bg-white/10">{t.home}</button>
            {SERVICES.map((s) => (
              <button key={s.id} onClick={() => { setActiveService(s.id); setMenuOpen(false); }}
                className="text-right px-3 py-2 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2">
                <s.icon size={16} /> {(t as any)[s.id] || s.id}
              </button>
            ))}
            <div className="flex items-center gap-2 border-t border-white/10 mt-1 pt-3">
              <button onClick={() => { setMenuOpen(false); user ? setActiveService('account') : setShowAuth(true); }}
                className="flex-1 text-right px-3 py-2 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-[#c8b97a] flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#c8b97a] flex items-center justify-center flex-shrink-0">
                    <UserIcon size={14} className="text-[#1a5c38]" />
                  </div>
                )}
                <div className="flex flex-col items-start leading-tight">
                  <span>{user ? (user.fullName || t.myAccount) : t.login}</span>
                  {user && <span className="text-[10px] text-white/60">{USER_TYPE_LABELS[user.userType]}</span>}
                </div>
              </button>
              <button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2">
                <Settings size={16} /> {t.settings}
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {user && !user.emailVerified && activeService !== 'account' && (
          <div className="bg-amber-50 dark:bg-[#231c0e] border border-amber-300 dark:border-[#4a3a18] rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MailWarning size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">{t.emailNotVerified}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">{t.verifyEmailPrompt}</p>
              </div>
            </div>
            <button onClick={handleGoToAccount}
              className="bg-amber-500 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-amber-600 transition whitespace-nowrap">
              {t.completeVerification}
            </button>
          </div>
        )}
        {!activeService ? <HomeView onSelect={setActiveService} onAssistant={() => setAssistantOpen(true)} reports={reports} user={user} onRequireLogin={handleRequireLogin} /> :
         activeService === 'health' ? <HealthView user={user} onToast={showToast} /> :
         activeService === 'agriculture' ? <AgricultureView user={user} onToast={showToast} /> :
         activeService === 'emergency' ? <EmergencyView user={user} /> :
         activeService === 'market' ? <MarketView user={user} onToast={showToast} onRequireLogin={handleRequireLogin} onGoToAccount={handleGoToAccount} assistantPrefill={assistantPrefill?.target === 'market' ? assistantPrefill : null} /> :
         activeService === 'announcements' ? <AnnouncementsView user={user} onToast={showToast} onRequireLogin={handleRequireLogin} onGoToAccount={handleGoToAccount} assistantPrefill={assistantPrefill?.target === 'announcements' ? assistantPrefill : null} /> :
         activeService === 'location' ? <LocationView user={user} onRequireLogin={handleRequireLogin} onGoToAccount={handleGoToAccount} /> :
         activeService === 'transport' ? <TransportView user={user} onToast={showToast} onRequireLogin={handleRequireLogin} openRequestForm={transportRequestMode} onGoToAccount={handleGoToAccount} assistantPrefill={assistantPrefill?.target === 'transport' ? assistantPrefill : null} /> :
         activeService === 'events' ? <EventsView user={user} onToast={showToast} onRequireLogin={handleRequireLogin} onGoToAccount={handleGoToAccount} assistantPrefill={assistantPrefill?.target === 'events' ? assistantPrefill : null} /> :
         activeService === 'reports' ? <ReportsView user={user} onToast={showToast} prefillType={reportPrefillType} assistantPrefill={assistantPrefill?.target === 'reports' ? assistantPrefill : null} /> :
         activeService === 'account' && user ? <AccountView user={user} onLogout={handleLogout} onToast={showToast} onProfileUpdate={handleProfileUpdate} /> :
         <CaravanView reports={reports} onNavigate={(s) => setActiveService(s as ServiceId)} />}
      </main>

      {/* ── Floating Buttons (SOS + AI) ── */}
      {!assistantOpen && (
        <div className="fixed bottom-6 left-4 z-40 flex flex-col gap-3 items-start">
          {/* SOS */}
          <div className="group flex items-center gap-2">
            <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow whitespace-nowrap">
              {t.emergency}
            </span>
            <button
              onClick={() => setActiveService('emergency')}
              aria-label="SOS"
              title="SOS"
              className="w-14 h-14 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center relative border-2 border-red-400">
              <Siren size={24} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-300 rounded-full animate-pulse border border-red-600" />
            </button>
          </div>
          {/* AI Assistant */}
          <div className="group flex items-center gap-2">
            <span className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a5c38] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow whitespace-nowrap">
              {t.assistant}
            </span>
            <button
              onClick={() => setAssistantOpen(true)}
              aria-label={t.assistant}
              title={t.assistant}
              className="w-14 h-14 rounded-full bg-[#1a5c38] text-white shadow-xl hover:bg-[#2d7a4f] active:scale-95 transition-all flex items-center justify-center relative border-2 border-[#2d7a4f]">
              <Bot size={26} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c8b97a] rounded-full animate-pulse border border-[#1a5c38]" />
            </button>
          </div>
        </div>
      )}

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} onAction={handleAssistantAction} />
      {showAuth && <AuthView onAuth={handleAuth} onClose={() => setShowAuth(false)} onToast={showToast} />}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        language={language}
        onLanguageChange={setLanguage}
      />

      <footer className="bg-[#1a5c38] text-white/70 text-center py-4 text-sm mt-8">
        <p>{t.appName} | {t.appSubtitle}</p>
      </footer>
    </div>
  );
}

// ── HomeView ─────────────────────────────────────────────────────────────────

function HomeView({ onSelect, onAssistant, reports, user, onRequireLogin }: {
  onSelect: (s: ServiceId) => void; onAssistant: () => void; reports: any[];
  user: Profile | null; onRequireLogin: () => void;
}) {
  const { t } = useTranslation();
  const recentReports = reports.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* 1. Hero */}
      <HeroSection onSelect={onSelect} onAssistant={onAssistant} />

      {/* 2. Live ticker */}
      <LiveTicker />

      {/* Login prompt */}
      {!user && (
        <div className="bg-[#c8b97a]/20 dark:bg-[#c8b97a]/8 border border-[#c8b97a]/40 dark:border-[#c8b97a]/20 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c8b97a] flex items-center justify-center flex-shrink-0">
              <UserIcon size={20} className="text-[#1a5c38]" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 dark:text-[#e8ede9]">{t.loginPromptTitle}</p>
              <p className="text-xs text-stone-600 dark:text-[#b0bdb3]">{t.loginPromptDesc}</p>
            </div>
          </div>
          <button onClick={onRequireLogin}
            className="bg-[#1a5c38] text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-[#2d7a4f] transition whitespace-nowrap">
            {t.loginRegister}
          </button>
        </div>
      )}

      {/* 3. Quick action shortcuts */}
      <QuickActions onSelect={onSelect} />

      {/* 4. Main service cards */}
      <ServiceCards onSelect={onSelect} onAssistant={onAssistant} />

      {/* 5. Why Waaha */}
      <section>
        <h3 className="text-xl font-bold mb-4 text-stone-800 dark:text-[#e8ede9]">{t.whyWaha}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-5 card-hover">
            <div className="w-12 h-12 rounded-xl bg-[#1a5c38] flex items-center justify-center mb-3">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-1">{t.whyWaha1Title}</h4>
            <p className="text-sm text-stone-600 dark:text-[#b0bdb3]">{t.whyWaha1Desc}</p>
          </div>
          <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-5 card-hover">
            <div className="w-12 h-12 rounded-xl bg-[#c8b97a] flex items-center justify-center mb-3">
              <Users size={24} className="text-[#1a5c38]" />
            </div>
            <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-1">{t.whyWaha2Title}</h4>
            <p className="text-sm text-stone-600 dark:text-[#b0bdb3]">{t.whyWaha2Desc}</p>
          </div>
          <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-5 card-hover">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
              <Truck size={24} className="text-white" />
            </div>
            <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-1">{t.whyWaha3Title}</h4>
            <p className="text-sm text-stone-600 dark:text-[#b0bdb3]">{t.whyWaha3Desc}</p>
          </div>
        </div>
      </section>

      {/* 6. Smart assistant promotional CTA */}
      <section className="bg-gradient-to-l from-[#1a5c38] to-[#2d7a4f] rounded-3xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Bot size={40} className="text-[#c8b97a]" />
          </div>
          <div className="text-center sm:text-right flex-1">
            <h3 className="text-xl font-bold mb-2">{t.assistantPromoTitle}</h3>
            <p className="text-white/85 text-sm leading-relaxed mb-4">{t.assistantPromoDesc}</p>
            <button onClick={onAssistant}
              className="inline-flex items-center gap-2 bg-[#c8b97a] text-[#1a5c38] font-bold px-5 py-2.5 rounded-full text-sm hover:bg-[#d4c789] transition shadow-lg">
              <Sparkles size={16} /> {t.startChat}
            </button>
          </div>
        </div>
      </section>

      {/* 7. Real Stats */}
      <WahaStats onSelect={onSelect} />

      {/* 8. Latest Updates */}
      <LatestUpdates onSelect={onSelect} />

      {/* Recent Reports */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9]">{t.latestReports}</h3>
          <button onClick={() => onSelect('reports')} className="text-sm text-[#1a5c38] dark:text-[#50c090] font-semibold flex items-center gap-1">
            {t.viewAll} <ChevronLeft size={16} />
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {recentReports.length > 0 ? recentReports.map((r) => (
            <div key={r.id} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 card-hover">
              <span className="inline-block text-xs bg-orange-100 dark:bg-[#2a1808] text-orange-700 dark:text-[#f0a060] px-2 py-0.5 rounded-full mb-2">{r.report_type}</span>
              <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm line-clamp-2">{r.description}</h4>
              <p className="text-xs text-stone-500 dark:text-[#8a9a8e] mt-2 flex items-center gap-1">
                <MapPinned size={12} /> {r.location}
              </p>
            </div>
          )) : (
            <p className="text-sm text-stone-500 dark:text-[#8a9a8e] col-span-3 text-center py-8">{t.noReportsYet}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function QuickActions({ onSelect }: { onSelect: (s: ServiceId) => void }) {
  const { t } = useTranslation();
  const QUICK_ACTIONS = [
    { id: 'agriculture' as ServiceId, label: t.cropScan, icon: Sprout, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'health' as ServiceId, label: t.healthServices, icon: HeartPulse, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'market' as ServiceId, label: t.localMarket, icon: ShoppingBasket, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'transport' as ServiceId, label: t.requestTransport, icon: Car, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'events' as ServiceId, label: t.events, icon: Calendar, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { id: 'announcements' as ServiceId, label: t.announcements, icon: Megaphone, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'reports' as ServiceId, label: t.sendReport, icon: Flag, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { id: 'emergency' as ServiceId, label: t.emergency, icon: Siren, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];
  return (
    <section>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {QUICK_ACTIONS.map((qa) => (
          <button key={qa.id} onClick={() => onSelect(qa.id)}
            className="flex flex-col items-center gap-2 group">
            <div className={`w-14 h-14 rounded-2xl ${qa.bg} border border-stone-100 dark:border-[#2d4a35] flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm`}>
              <qa.icon size={24} className={qa.color} />
            </div>
            <span className="text-xs text-stone-600 dark:text-[#b0bdb3] text-center leading-tight font-medium">{qa.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────

function HeroSection({ onSelect, onAssistant }: { onSelect: (s: ServiceId) => void; onAssistant: () => void }) {
  const { t, isRtl } = useTranslation();
  return (
    <>
      {/* Desktop */}
      <section
        className="hidden sm:block"
        style={{
          position: 'relative', borderRadius: 28, overflow: 'hidden',
          height: 380, border: '1px solid rgba(200,185,122,0.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}>
        <img
          src="/file_00000000f38c71f8b703df4160d13fce(1) copy.png"
          alt="واحة - المجتمع الريفي"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center' }}
        />
        <div className="hero-overlay-desktop" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.30) 40%, rgba(255,255,255,0.88) 60%, rgba(255,255,255,0.97) 100%)',
        }} />
        <div className="dark-hero-overlay" style={{
          position: 'absolute', inset: 0, opacity: 0,
          background: 'linear-gradient(90deg, rgba(15,27,20,0.04) 0%, rgba(15,27,20,0.30) 40%, rgba(15,27,20,0.88) 60%, rgba(15,27,20,0.97) 100%)',
        }} />
        <div style={{
          position: 'absolute', right: 72, top: '50%', transform: 'translateY(-50%)',
          width: 520, textAlign: isRtl ? 'right' : 'left', direction: isRtl ? 'rtl' : 'ltr', zIndex: 5,
        }}>
          <h2 className="hero-title-main" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2, color: '#10251f', margin: 0 }}>
            {t.heroTitle}
          </h2>
          <h3 className="hero-title-sub" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2, color: '#006b46', margin: '4px 0 0' }}>
            {t.heroSubtitle}
          </h3>
          <p className="hero-desc" style={{ fontSize: 20, color: '#5f6763', lineHeight: 1.8, marginTop: 20, marginBottom: 32, whiteSpace: 'pre-line' }}>
            {t.heroDesc}
          </p>
          <div style={{ display: 'flex', gap: 24, justifyContent: isRtl ? 'flex-end' : 'flex-start' }}>
            <button onClick={() => onSelect('location')}
              style={{ height: 64, padding: '0 34px', borderRadius: 18, fontSize: 18, fontWeight: 700, background: '#006b46', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,107,70,0.3)' }}>
              {t.exploreServices}
            </button>
            <button onClick={onAssistant}
              style={{ height: 64, padding: '0 34px', borderRadius: 18, fontSize: 18, fontWeight: 700, background: '#e9c766', color: '#10251f', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(233,199,102,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} /> {t.smartAssistant}
            </button>
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section
        className="block sm:hidden"
        style={{
          position: 'relative', borderRadius: 28, overflow: 'hidden',
          minHeight: 480, border: '1px solid rgba(200,185,122,0.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}>
        <img
          src="/file_00000000f38c71f8b703df4160d13fce(1) copy.png"
          alt="واحة - المجتمع الريفي"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.80) 38%, rgba(255,255,255,0.97) 60%)',
        }} />
        <div className="dark-hero-mobile-overlay" style={{
          position: 'absolute', inset: 0, opacity: 0,
          background: 'linear-gradient(180deg, rgba(15,27,20,0.10) 0%, rgba(15,27,20,0.80) 38%, rgba(15,27,20,0.97) 60%)',
        }} />
        <div style={{
          position: 'absolute', right: 20, left: 20, bottom: 36,
          textAlign: isRtl ? 'right' : 'left', direction: isRtl ? 'rtl' : 'ltr', zIndex: 5,
        }}>
          <h2 className="hero-title-main" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, color: '#10251f', margin: 0 }}>
            {t.heroTitle}
          </h2>
          <h3 className="hero-title-sub" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, color: '#006b46', margin: '4px 0 0' }}>
            {t.heroSubtitle}
          </h3>
          <p className="hero-desc" style={{ fontSize: 16, color: '#5f6763', lineHeight: 1.8, marginTop: 16, marginBottom: 24, whiteSpace: 'pre-line' }}>
            {t.heroDesc}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => onSelect('location')}
              style={{ height: 56, borderRadius: 18, fontSize: 17, fontWeight: 700, background: '#006b46', color: '#fff', border: 'none', cursor: 'pointer' }}>
              {t.exploreServices}
            </button>
            <button onClick={onAssistant}
              style={{ height: 56, borderRadius: 18, fontSize: 17, fontWeight: 700, background: '#e9c766', color: '#10251f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Sparkles size={18} /> {t.smartAssistant}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Waaha Stats (Real Supabase data) ─────────────────────────────────────────

type StatsData = {
  announcementsCount: number;
  eventsCount: number;
  productsCount: number;
  reportsCount: number;
};

function WahaStats({ onSelect }: { onSelect: (s: ServiceId) => void }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [announcements, events, products, reports] = await Promise.all([
          fetchAnnouncements(),
          fetchEvents(),
          fetchProducts(),
          fetchReports(),
        ]);
        if (cancelled) return;
        const today = new Date().toISOString().split('T')[0];
        const upcomingEvents = (events as any[]).filter((e) => !e.event_date || e.event_date >= today);
        setStats({
          announcementsCount: (announcements as any[]).length,
          eventsCount: upcomingEvents.length,
          productsCount: (products as any[]).length,
          reportsCount: (reports as any[]).length,
        });
      } catch (err) {
        console.error('[WahaStats] failed to load stats:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statItems = stats ? [
    { label: t.announcementsCount, value: stats.announcementsCount, icon: Megaphone, color: 'text-blue-600 dark:text-[#60a0f0]', bg: 'bg-blue-50 dark:bg-[#0e1a28]', border: 'border-blue-100 dark:border-[#162438]', service: 'announcements' as ServiceId },
    { label: t.upcomingEvents, value: stats.eventsCount, icon: Calendar, color: 'text-violet-600 dark:text-[#a080f0]', bg: 'bg-violet-50 dark:bg-[#160e28]', border: 'border-violet-100 dark:border-[#2a1845]', service: 'events' as ServiceId },
    { label: t.activeProducts, value: stats.productsCount, icon: ShoppingBasket, color: 'text-amber-600 dark:text-[#d09e40]', bg: 'bg-amber-50 dark:bg-[#231c0e]', border: 'border-amber-100 dark:border-[#4a3a18]', service: 'market' as ServiceId },
    { label: t.communityReports, value: stats.reportsCount, icon: Flag, color: 'text-orange-600 dark:text-[#f0a060]', bg: 'bg-orange-50 dark:bg-[#231508]', border: 'border-orange-100 dark:border-[#4a2a14]', service: 'reports' as ServiceId },
  ] : [];

  return (
    <section>
      <h3 className="text-xl font-bold mb-4 text-stone-800 dark:text-[#e8ede9]">{t.wahaStats}</h3>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 animate-pulse">
              <div className="w-8 h-8 bg-stone-200 dark:bg-[#253d2c] rounded-lg mb-3" />
              <div className="h-6 bg-stone-200 dark:bg-[#253d2c] rounded w-12 mb-2" />
              <div className="h-3 bg-stone-100 dark:bg-[#1e3327] rounded w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-[#200a0a] border border-red-200 dark:border-[#4a1818] rounded-2xl p-4 text-center text-sm text-red-600 dark:text-[#f06060]">
          حدث خطأ أثناء تحميل البيانات
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <button key={item.label} onClick={() => onSelect(item.service)}
              className={`${item.bg} ${item.border} border rounded-2xl p-4 text-right card-hover group`}>
              <div className={`w-10 h-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center mb-3`}>
                <item.icon size={20} className={item.color} />
              </div>
              <p className={`text-2xl font-extrabold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-stone-600 dark:text-[#b0bdb3] mt-0.5">{item.label}</p>
              <p className={`text-xs ${item.color} mt-2 font-semibold opacity-0 group-hover:opacity-100 transition-opacity`}>{t.viewAll} ←</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Latest Updates ────────────────────────────────────────────────────────────

type UpdateItem = {
  id: string;
  type: 'announcement' | 'event' | 'product' | 'report';
  title: string;
  category?: string;
  date?: string;
  description?: string;
  service: ServiceId;
  label: string;
  badgeColor: string;
  actionLabel: string;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function LatestUpdates({ onSelect }: { onSelect: (s: ServiceId) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [announcements, events, products, reports] = await Promise.all([
          fetchAnnouncements(),
          fetchEvents(),
          fetchProducts(),
          fetchReports(),
        ]);
        if (cancelled) return;

        const result: UpdateItem[] = [];

        const ann = (announcements as any[])[0];
        if (ann) result.push({ id: ann.id, type: 'announcement', title: ann.title, category: ann.category, date: ann.created_at, description: ann.description, service: 'announcements', label: 'إعلان', badgeColor: 'bg-blue-500', actionLabel: 'عرض الإعلان' });

        const upcomingEvent = (events as any[]).find((e) => !e.event_date || e.event_date >= today);
        if (upcomingEvent) result.push({ id: upcomingEvent.id, type: 'event', title: upcomingEvent.title, category: upcomingEvent.event_type, date: upcomingEvent.event_date, description: upcomingEvent.description, service: 'events', label: 'فعالية', badgeColor: 'bg-violet-500', actionLabel: 'عرض الفعالية' });

        const prod = (products as any[])[0];
        if (prod) result.push({ id: prod.id, type: 'product', title: prod.title, category: prod.category, date: prod.created_at, description: prod.description, service: 'market', label: 'سوق', badgeColor: 'bg-amber-500', actionLabel: 'عرض السوق' });

        const rep = (reports as any[])[0];
        if (rep) result.push({ id: rep.id, type: 'report', title: rep.description?.slice(0, 60) || 'بلاغ جديد', category: rep.report_type, date: rep.created_at, service: 'reports', label: 'بلاغ', badgeColor: 'bg-orange-500', actionLabel: 'عرض البلاغات' });

        setItems(result);
      } catch (err) {
        console.error('[LatestUpdates] failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9]">{t.latestUpdates}</h3>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 animate-pulse h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-8 text-center text-sm text-stone-500 dark:text-[#8a9a8e]">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl overflow-hidden card-hover flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`${item.badgeColor} text-white text-xs font-bold px-2.5 py-0.5 rounded-full`}>{item.label}</span>
                  {item.category && (
                    <span className="text-xs text-stone-500 dark:text-[#8a9a8e] truncate">{item.category}</span>
                  )}
                </div>
                <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm line-clamp-2 mb-2">{item.title}</h4>
                {item.description && item.type !== 'report' && (
                  <p className="text-xs text-stone-500 dark:text-[#8a9a8e] line-clamp-2 mb-2">{item.description}</p>
                )}
                {item.date && (
                  <p className="text-xs text-stone-400 dark:text-[#6a7a6e] flex items-center gap-1 mt-auto">
                    <Calendar size={11} />
                    {item.type === 'event'
                      ? new Date(item.date).toLocaleDateString('ar-AE', { day: 'numeric', month: 'long', year: 'numeric' })
                      : timeAgo(item.date)}
                  </p>
                )}
              </div>
              <div className="border-t border-stone-100 dark:border-[#2d4a35] px-4 py-3">
                <button onClick={() => onSelect(item.service)}
                  className="text-[#1a5c38] dark:text-[#50c090] text-xs font-bold hover:underline">
                  {item.actionLabel} ←
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Service Cards ─────────────────────────────────────────────────────────────

function ServiceCards({ onSelect, onAssistant }: { onSelect: (s: ServiceId) => void; onAssistant: () => void }) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9]">{t.mainServices}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SERVICES.map((s) => {
          const c = COLOR_MAP[s.color];
          return (
            <button key={s.id} onClick={() => onSelect(s.id)}
              className={`service-card card-hover ${c.bg} ${c.border} dark:bg-[#1a2e21] dark:border-[#2d4a35] border rounded-2xl p-5 text-right flex flex-col gap-3 hover:shadow-md`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-sm`}>
                <s.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-stone-800 dark:text-[#e8ede9]">{(t as any)[s.id] || s.id}</h4>
                <p className="text-xs text-stone-500 dark:text-[#8a9a8e] mt-1">{(t as any)[s.id + 'Desc'] || ''}</p>
              </div>
            </button>
          );
        })}
        {/* AI Assistant card */}
        <button onClick={onAssistant}
          className="service-card card-hover bg-gradient-to-br from-[#1a5c38] to-[#2d7a4f] text-white rounded-2xl p-5 text-right flex flex-col gap-3 border border-[#2d7a4f] hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h4 className="font-bold">{t.smartAssistant}</h4>
            <p className="text-xs text-white/80 mt-1">{t.assistantPromoDesc.slice(0, 40)}...</p>
          </div>
        </button>
      </div>
    </section>
  );
}

// ── Live Ticker ───────────────────────────────────────────────────────────────

function LiveTicker() {
  const { t } = useTranslation();
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [announcements, products] = await Promise.all([fetchAnnouncements(), fetchProducts()]);
        if (cancelled) return;
        const tickerItems: string[] = [];
        (announcements as any[]).slice(0, 8).forEach((a) => {
          tickerItems.push(`📢 ${a.title}${a.category ? ' · ' + a.category : ''}${a.event_date ? ' · ' + a.event_date : ''}`);
        });
        (products as any[]).slice(0, 6).forEach((p) => {
          tickerItems.push(`🛒 ${p.title}${p.price ? ' · ' + p.price + (p.unit ? ' ' + p.unit : '') : ''}`);
        });
        if (tickerItems.length > 0) setItems(tickerItems);
      } catch (err) {
        console.error('[LiveTicker] failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="live-ticker-bg live-ticker-border border rounded-2xl overflow-hidden py-2.5" style={{backgroundColor: 'rgba(26,92,56,0.08)', borderColor: 'rgba(26,92,56,0.15)'}}>
      <div className="flex items-center gap-0">
        <div className="flex-shrink-0 bg-[#1a5c38] text-white text-xs font-bold px-3 py-1 rounded-lg mx-3 whitespace-nowrap">
          {t.liveNews}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track flex gap-10 whitespace-nowrap" style={{ direction: 'ltr' }}>
            {doubled.map((item, i) => (
              <span key={i} className="text-sm text-stone-700 dark:text-[#c8d4ca] font-medium flex-shrink-0">
                {item}
                <span className="mx-5 text-[#c8b97a]">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
