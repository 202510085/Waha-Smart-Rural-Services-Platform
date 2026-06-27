import { useState } from 'react';
import {
  Siren, X, Phone, MapPin, AlertTriangle, Shield, Ambulance, Flame,
  Loader2, MessageCircle, Navigation, CheckCircle2,
} from 'lucide-react';
import { getCurrentLocation, openWhatsApp } from './utils/location';
import type { UserLocation } from './utils/location';
import type { Profile } from './utils/auth';
import { insertEmergencyRequest } from './lib/data';
import { useTranslation } from './i18n/LanguageContext';

const EMERGENCY_NUMBERS = [
  { name: 'الشرطة',        number: '999', icon: Shield,   colorClass: 'bg-blue-600 hover:bg-blue-700' },
  { name: 'الإسعاف',       number: '998', icon: Ambulance, colorClass: 'bg-rose-600 hover:bg-rose-700' },
  { name: 'الدفاع المدني', number: '997', icon: Flame,    colorClass: 'bg-red-600 hover:bg-red-700' },
];

export default function EmergencyView({ user }: { user: Profile | null }) {
  const { t } = useTranslation();
  const [showSOS, setShowSOS] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const handleSOS = async () => {
    setShowSOS(true);
    setLocating(true);
    setLocation(null);
    setLocationDenied(false);
    const loc = await getCurrentLocation();
    setLocation(loc);
    setLocating(false);
    if (loc.isDefault) setLocationDenied(true);
    insertEmergencyRequest(user, { latitude: loc.latitude, longitude: loc.longitude }, 'SOS')
      .catch((err) => console.error('Failed to log emergency request:', err));
  };

  const shareViaWhatsApp = () => {
    if (!location) return;
    const message = `🚨 طوارئ - منصة واحة\nموقعي الحالي:\nخط العرض: ${location.latitude}\nخط الطول: ${location.longitude}\n${location.isDefault ? 'موقع تقريبي (القوع - العين)' : 'موقعي الحالي'}\nhttps://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    openWhatsApp('999', message);
  };

  const openInMaps = () => {
    if (!location) return;
    window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-red-50 dark:bg-[#1a0808] border border-red-200 dark:border-[#5a2020] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Siren size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">الطوارئ SOS</h2>
          <p className="text-sm text-stone-600 dark:text-[#b0bdb3] mt-0.5">زر طوارئ ذكي يحدد موقعك الجغرافي تلقائياً</p>
        </div>
      </div>

      {/* Emergency numbers — always visible first */}
      <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-5">
        <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-4 flex items-center gap-2">
          <Phone size={18} className="text-red-600" />
          أرقام الطوارئ المباشرة
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {EMERGENCY_NUMBERS.map((n) => (
            <a key={n.name} href={`tel:${n.number}`}
              className={`${n.colorClass} text-white flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition text-center shadow-sm`}>
              <n.icon size={24} className="mb-2" />
              <span className="font-bold text-2xl leading-none">{n.number}</span>
              <span className="text-xs text-white/90 mt-1.5 font-medium">{n.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* SOS button */}
      <div className="bg-red-50 dark:bg-[#1a0808] border-2 border-red-300 dark:border-[#5a2020] rounded-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-600 mx-auto flex items-center justify-center mb-3 shadow-lg">
          <Siren size={32} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-red-700 dark:text-[#f06060] mb-2">زر SOS الذكي</h3>
        <p className="text-sm text-stone-600 dark:text-[#b0bdb3] mb-5">يحدد موقعك الجغرافي بدقة لمشاركته مع فرق الطوارئ أو عبر واتساب</p>
        <button onClick={handleSOS}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-12 py-4 rounded-full text-xl transition shadow-lg border-4 border-red-400">
          SOS
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Safety tips */}
        <div className="bg-white dark:bg-[#1a2e21] border border-red-200 dark:border-[#4a1a1a] rounded-2xl p-5">
          <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 dark:text-[#f06060]" /> إرشادات طارئة
          </h3>
          <ul className="text-sm text-stone-600 dark:text-[#b0bdb3] space-y-2 list-disc pr-4">
            <li>حافظ على هدوئك واتصل بالطوارئ 999</li>
            <li>لا تحرك المصابين إلا عند وجود خطر إضافي</li>
            <li>اضغط على الجرح في حالة النزيف</li>
            <li>ابتعد عن مصادر الكهرباء في حالة التماس</li>
            <li>في حالة الحريق، أغلق الأبواب واخل المكان</li>
          </ul>
        </div>

        {/* Quick call list */}
        <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-5">
          <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3">اتصال مباشر</h3>
          <div className="space-y-2">
            {EMERGENCY_NUMBERS.map((n) => (
              <a key={n.name} href={`tel:${n.number}`}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-stone-50 dark:bg-[#162519] hover:bg-stone-100 dark:hover:bg-[#1e3327] transition border border-stone-100 dark:border-[#243a2b]">
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-[#d5ddd7]">
                  <n.icon size={18} className="text-red-600 dark:text-[#f06060]" /> {n.name}
                </span>
                <span className="font-bold text-red-600 dark:text-[#f06060] text-lg flex items-center gap-1.5">
                  <Phone size={14} /> {n.number}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* SOS modal */}
      {showSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSOS(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Siren size={20} /> طلب مساعدة طارئة
              </h3>
              <button onClick={() => setShowSOS(false)} className="p-1.5 rounded-full hover:bg-white/15 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {locating && (
                <div className="text-center py-8">
                  <Loader2 size={36} className="animate-spin text-red-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-stone-700 dark:text-[#d5ddd7]">جاري تحديد موقعك بدقة...</p>
                  <p className="text-xs text-stone-500 dark:text-[#8a9a8e] mt-1">يستخدم GPS لتحديد إحداثياتك</p>
                </div>
              )}

              {location && !locating && (
                <>
                  {/* Location box */}
                  <div className={`border rounded-2xl p-4 mb-4 msg-appear ${locationDenied ? 'bg-amber-50 dark:bg-[#231c0e] border-amber-300 dark:border-[#4a3a18]' : 'bg-emerald-50 dark:bg-[#0a1f14] border-emerald-200 dark:border-[#183828]'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {locationDenied
                        ? <AlertTriangle size={18} className="text-amber-600 dark:text-[#d09e40]" />
                        : <CheckCircle2 size={18} className="text-emerald-600 dark:text-[#50c088]" />}
                      <p className={`text-sm font-semibold ${locationDenied ? 'text-amber-800 dark:text-[#f0c060]' : 'text-emerald-800 dark:text-[#7de8b8]'}`}>
                        {locationDenied ? 'لم يتم السماح بتحديد الموقع' : 'تم تحديد موقعك بدقة'}
                      </p>
                    </div>
                    {locationDenied ? (
                      <p className="text-xs text-amber-700 dark:text-[#d09e40]">
                        لم يتم السماح بتحديد الموقع، يمكنك الاتصال بالطوارئ مباشرة.
                      </p>
                    ) : (
                      <div className="text-xs text-stone-700 dark:text-[#d5ddd7] space-y-1 font-mono">
                        <p>خط العرض: <span className="font-semibold">{location.latitude.toFixed(5)}</span></p>
                        <p>خط الطول: <span className="font-semibold">{location.longitude.toFixed(5)}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Emergency call buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {EMERGENCY_NUMBERS.map((n) => (
                      <a key={n.name} href={`tel:${n.number}`}
                        className={`${n.colorClass} text-white flex flex-col items-center py-3.5 px-1 rounded-2xl transition text-center`}>
                        <n.icon size={18} className="mb-1" />
                        <span className="font-bold text-lg leading-none">{n.number}</span>
                        <span className="text-xs text-white/85 mt-1">{n.name}</span>
                      </a>
                    ))}
                  </div>

                  {/* Share / Maps */}
                  <div className="space-y-2">
                    <button onClick={shareViaWhatsApp}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2">
                      <MessageCircle size={18} /> مشاركة موقعي عبر واتساب
                    </button>
                    <button onClick={openInMaps}
                      className="w-full bg-[#1a5c38] hover:bg-[#2d7a4f] text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2">
                      <Navigation size={18} /> فتح الاتجاهات في الخريطة
                    </button>
                  </div>

                  <p className="text-xs text-stone-400 dark:text-[#6a7a6e] text-center mt-4 flex items-center justify-center gap-1">
                    <MapPin size={12} />
                    الموقع: {location.latitude.toFixed(4)} N, {location.longitude.toFixed(4)} E
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
