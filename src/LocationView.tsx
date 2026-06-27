import { useState, useEffect } from 'react';
import {
  MapPin, Phone, MessageCircle, Navigation, Loader2, HeartPulse, Building2,
  Fuel, Shield, ShoppingBasket, GraduationCap, Banknote,
  MapPinned, Clock, AlertCircle, Search, LocateFixed, CheckCircle, XCircle,
} from 'lucide-react';
import { fetchServices } from './lib/data';
import {
  getCurrentLocation, calculateDistanceKm, sortByDistance,
  openDirections, openCall, openWhatsApp, formatDistance, getOpenStatus,
  type UserLocation,
} from './utils/location';
import type { Profile } from './utils/auth';
import { useTranslation } from './i18n/LanguageContext';

interface ServiceRow {
  id?: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  whatsapp_enabled: boolean | null;
  whatsapp_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  working_hours: string | null;
  description: string | null;
}

interface ServiceWithDistance extends ServiceRow {
  distance: number;
}

interface Props {
  user: Profile | null;
  onRequireLogin: () => void;
  onGoToAccount: () => void;
}

const CATEGORY_FILTERS = [
  { label: 'الكل', value: '' },
  { label: 'صحة', value: 'صحة' },
  { label: 'زراعة', value: 'زراعة' },
  { label: 'نقل', value: 'نقل' },
  { label: 'حكومي', value: 'حكومي' },
  { label: 'طوارئ', value: 'طوارئ' },
  { label: 'سوق', value: 'سوق' },
  { label: 'مجتمع', value: 'مجتمع' },
];

const TYPE_ICONS: Record<string, typeof MapPin> = {
  'صحة': HeartPulse, 'health': HeartPulse, 'مركز صحي': HeartPulse, 'مستشفى': HeartPulse,
  'ديني': MapPin,
  'تعليم': GraduationCap,
  'تجاري': ShoppingBasket, 'سوق': ShoppingBasket,
  'حكومي': Building2,
  'خدمات': Fuel,
  'مالي': Banknote,
  'أمن': Shield, 'طوارئ': Shield,
};

const TYPE_COLORS: Record<string, string> = {
  'صحة': 'bg-rose-100 dark:bg-[#2a0f15] text-rose-600 dark:text-[#f06080]',
  'health': 'bg-rose-100 dark:bg-[#2a0f15] text-rose-600 dark:text-[#f06080]',
  'مركز صحي': 'bg-rose-100 dark:bg-[#2a0f15] text-rose-600 dark:text-[#f06080]',
  'ديني': 'bg-emerald-100 dark:bg-[#0e2a1a] text-emerald-600 dark:text-[#40b080]',
  'تعليم': 'bg-blue-100 dark:bg-[#14304a] text-blue-600 dark:text-[#60b0f8]',
  'تجاري': 'bg-amber-100 dark:bg-[#3a280a] text-amber-600 dark:text-[#d09e40]',
  'سوق': 'bg-amber-100 dark:bg-[#3a280a] text-amber-600 dark:text-[#d09e40]',
  'حكومي': 'bg-stone-100 dark:bg-[#1e3327] text-stone-600 dark:text-[#b0bdb3]',
  'خدمات': 'bg-cyan-100 dark:bg-[#092028] text-cyan-600 dark:text-[#40c0e0]',
  'مالي': 'bg-purple-100 dark:bg-[#180e28] text-purple-600 dark:text-[#c080f0]',
  'أمن': 'bg-red-100 dark:bg-[#200808] text-red-600 dark:text-[#e05050]',
  'طوارئ': 'bg-red-100 dark:bg-[#200808] text-red-600 dark:text-[#e05050]',
};

export default function LocationView({ user, onRequireLogin }: Props) {
  const { t } = useTranslation();
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceWithDistance[]>([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchServices();
        if (cancelled) return;
        const withDistance = (rows as ServiceRow[]).map((s) => ({ ...s, distance: 9999 }));
        setServices(withDistance);
      } catch (err) {
        console.error('[LocationView] Location services fetch failed:', err);
        if (!cancelled) setError('تعذر تحميل الخدمات. يرجى المحاولة مرة أخرى لاحقاً.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLocate = async () => {
    setGpsLoading(true);
    setLocDenied(false);
    try {
      const loc = await getCurrentLocation();
      setUserLoc(loc);
      if (loc.isDefault) {
        setLocDenied(true);
      } else {
        setServices((prev) =>
          sortByDistance(
            prev.map((s) => ({
              ...s,
              distance: s.latitude != null && s.longitude != null
                ? calculateDistanceKm(loc.latitude, loc.longitude, s.latitude!, s.longitude!)
                : 9999,
            }))
          )
        );
      }
    } catch (err) {
      console.error('[LocationView] GPS location failed:', err);
      setLocDenied(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const filtered = services.filter((s) => {
    const matchesCategory = !activeFilter ||
      (s.type || '').toLowerCase().includes(activeFilter.toLowerCase());
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.type || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-cyan-50 dark:bg-[#0a1e24] border border-cyan-200 dark:border-[#14404a] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <MapPin size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">الموقع والخدمات</h2>
          <p className="text-sm text-stone-600 dark:text-[#b0bdb3] mt-0.5">أقرب الخدمات إليك مع المسافة بالكيلومتر</p>
        </div>
      </div>

      {/* GPS button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleLocate}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#1a5c38] hover:bg-[#2d7a4f] disabled:opacity-60 text-white font-semibold py-3 rounded-2xl transition">
          {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          تحديد موقعي الحالي لترتيب الخدمات حسب القرب
        </button>
        {userLoc && !userLoc.isDefault && (
          <div className="bg-emerald-50 dark:bg-[#0a1f14] border border-emerald-200 dark:border-[#183828] rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-[#50c088]">
            <CheckCircle size={16} className="flex-shrink-0" />
            تم تحديد موقعك — الخدمات مرتبة حسب القرب
          </div>
        )}
        {locDenied && (
          <div className="bg-amber-50 dark:bg-[#231c0e] border border-amber-200 dark:border-[#4a3a18] rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-[#e0ae50]">
            <AlertCircle size={16} className="flex-shrink-0" />
            لم يتم السماح بتحديد الموقع. يمكنك تصفح الخدمات بدون ترتيب حسب المسافة.
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-[#6a7a6e]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن خدمة بالاسم أو النوع أو الموقع..."
          className="w-full bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]" />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              activeFilter === f.value
                ? 'bg-[#1a5c38] text-white'
                : 'bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] text-stone-600 dark:text-[#b0bdb3] hover:bg-stone-50 dark:hover:bg-[#1e3327]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && !loading && (
        <div className="bg-red-50 dark:bg-[#200a0a] border border-red-200 dark:border-[#4a1818] rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700 dark:text-[#f06060]">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-10 text-center">
          <MapPin size={32} className="text-stone-300 dark:text-[#3d5a45] mx-auto mb-3" />
          <p className="text-stone-500 dark:text-[#8a9a8e] text-sm">
            {services.length === 0 ? 'لا توجد خدمات متاحة حالياً' : 'لا توجد نتائج لهذا البحث'}
          </p>
          {services.length === 0 && (
            <p className="text-stone-400 dark:text-[#6a7a6e] text-xs mt-2">أضف بيانات الخدمات في جدول services لعرضها هنا.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 dark:text-[#8a9a8e]">{filtered.length} خدمة</p>
          {filtered.map((s, i) => {
            const Icon = TYPE_ICONS[s.type] ?? MapPin;
            const colorClass = TYPE_COLORS[s.type] ?? 'bg-stone-100 dark:bg-[#1e3327] text-stone-600 dark:text-[#b0bdb3]';
            const openStatus = getOpenStatus(s.working_hours);
            return (
              <div key={`${s.name}-${i}`} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 card-hover">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h4 className="font-bold text-stone-800 dark:text-[#e8ede9]">{s.name}</h4>
                        <span className="text-xs bg-stone-100 dark:bg-[#1e3327] text-stone-500 dark:text-[#8a9a8e] px-2 py-0.5 rounded-full">{s.type}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-[#8a9a8e] mt-1">
                        {s.address ? (
                          <span className="flex items-center gap-1"><MapPinned size={11} /> {s.address}</span>
                        ) : (
                          <span className="text-stone-400 dark:text-[#6a7a6e]">الموقع غير محدد</span>
                        )}
                        {s.working_hours && (
                          <span className="flex items-center gap-1"><Clock size={11} /> {s.working_hours}</span>
                        )}
                        {openStatus === 'open' && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-[#50c088] font-semibold">
                            <CheckCircle size={11} /> مفتوح الآن
                          </span>
                        )}
                        {openStatus === 'closed' && (
                          <span className="flex items-center gap-1 text-red-500 dark:text-[#f06060] font-semibold">
                            <XCircle size={11} /> مغلق
                          </span>
                        )}
                        {openStatus === 'unknown' && (
                          <span className="text-stone-400 dark:text-[#6a7a6e]">غير معروف</span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-stone-500 dark:text-[#8a9a8e] mt-1.5 leading-relaxed line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  </div>
                  {userLoc && !userLoc.isDefault && s.distance < 9000 && (
                    <span className="bg-[#1a5c38] text-white text-xs font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {formatDistance(s.distance)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {s.phone && s.phone !== '—' && (
                    <button onClick={() => user ? openCall(s.phone!) : onRequireLogin()}
                      className="bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                      <Phone size={14} /> اتصال
                    </button>
                  )}
                  {s.whatsapp_enabled && s.whatsapp_phone ? (
                    <button onClick={() => user ? openWhatsApp(s.whatsapp_phone!, `السلام عليكم، أحتاج الاستفسار عن ${s.name}`) : onRequireLogin()}
                      className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                      <MessageCircle size={14} /> واتساب
                    </button>
                  ) : (
                    <span className="bg-stone-100 dark:bg-[#1e3327] text-stone-400 dark:text-[#6a7a6e] text-sm px-4 py-2 rounded-full flex items-center gap-1.5 cursor-not-allowed">
                      <MessageCircle size={14} /> واتساب غير متوفر
                    </span>
                  )}
                  {s.latitude && s.longitude && (
                    <button onClick={() => openDirections(s.latitude!, s.longitude!)}
                      className="bg-cyan-600 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-cyan-700 transition">
                      <Navigation size={14} /> الاتجاهات
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
