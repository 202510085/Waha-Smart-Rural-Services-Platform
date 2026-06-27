import { useState, useEffect } from 'react';
import {
  HeartPulse, Phone, MessageCircle, Navigation, Clock, MapPinned,
  Plus, X, Loader2, Stethoscope, CheckCircle2, LocateFixed,
  CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import {
  getCurrentLocation, calculateDistanceKm, sortByDistance,
  openDirections, openCall, openWhatsApp, formatDistance, getOpenStatus,
  type UserLocation,
} from './utils/location';
import { fetchServices, fetchHealthRequests, insertHealthRequest } from './lib/data';
import type { Profile } from './utils/auth';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
}

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

interface HealthRequestRow {
  id: string;
  age: number | null;
  symptoms: string;
  urgency: string;
  location: string;
  owner_name: string;
  owner_phone: string;
  owner_whatsapp_enabled: boolean;
  status: string;
  created_at: string;
}

const HEALTH_TYPES = ['مركز صحي', 'مستوصف', 'طوارئ', 'صيدلية', 'صحة', 'health', 'clinic', 'hospital', 'مستشفى', 'عيادة'];

export default function HealthView({ user, onToast }: Props) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<HealthRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [allCenters, setAllCenters] = useState<ServiceWithDistance[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    symptoms: '',
    gender: 'ذكر' as 'ذكر' | 'أنثى' | 'امتنع',
    phone: '',
    hasWhatsApp: false,
    urgency: 'متوسط',
    location: 'القوع',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Load services without GPS first
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingServices(true);
      try {
        const allServices = await fetchServices();
        if (!active) return;
        const healthServices = (allServices as ServiceRow[]).filter((s) =>
          HEALTH_TYPES.some((t) => (s.type || '').toLowerCase().includes(t.toLowerCase()))
        );
        const withDistance = healthServices.map((s) => ({
          ...s,
          distance: 9999,
        }));
        setAllCenters(withDistance);
      } catch (err) {
        console.error('[HealthView] Health services fetch failed:', err);
        if (active) setServicesError('تعذر تحميل الخدمات الصحية. يرجى المحاولة مجدداً.');
      } finally {
        if (active) setLoadingServices(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Load requests
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchHealthRequests();
        if (active) setRequests(data as HealthRequestRow[]);
      } catch (err) {
        console.error('[HealthView] Health requests fetch failed:', err);
      } finally {
        if (active) setLoadingRequests(false);
      }
    })();
    return () => { active = false; };
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
        setAllCenters((prev) =>
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
      console.error('[HealthView] GPS location failed:', err);
      setLocDenied(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleFormLocate = async () => {
    setGpsLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc.isDefault) {
        setForm((f) => ({
          ...f,
          location: `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));
      } else {
        onToast('تعذر تحديد موقعك، يمكنك إدخاله يدوياً');
      }
    } catch (err) {
      console.error('[HealthView] GPS location failed:', err);
      onToast('تعذر تحديد موقعك');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onToast('يجب تسجيل الدخول لإرسال طلب استشارة');
      return;
    }
    if (!form.symptoms.trim()) {
      onToast('يرجى وصف الحالة الصحية');
      return;
    }
    setSubmitting(true);
    try {
      const newRow = await insertHealthRequest(user, {
        age: form.age ? Number(form.age) : undefined,
        symptoms: form.symptoms,
        urgency: form.urgency,
        location: form.location,
      });
      if (newRow) setRequests((prev) => [newRow as HealthRequestRow, ...prev]);
      setForm({ name: '', age: '', symptoms: '', gender: 'ذكر', phone: '', hasWhatsApp: false, urgency: 'متوسط', location: 'القوع', latitude: null, longitude: null });
      setShowForm(false);
      onToast('تم إرسال طلب الاستشارة الصحية بنجاح');
    } catch (err) {
      console.error('[HealthView] Health consultation submit failed:', err);
      onToast('تعذر إرسال الطلب، يرجى المحاولة مجدداً');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    } catch { return 'الآن'; }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-rose-50 dark:bg-[#240f13] border border-rose-200 dark:border-[#4a1a25] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <HeartPulse size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">خدمات الصحة</h2>
          <p className="text-sm text-stone-600 dark:text-[#b0bdb3] mt-0.5">أقرب المراكز الصحية وطلب استشارة غير طارئة</p>
        </div>
      </div>

      {/* Quick emergency numbers */}
      <div className="grid grid-cols-3 gap-3">
        {[{ n: 'الطوارئ', d: '999' }, { n: 'الإسعاف', d: '998' }, { n: 'السموم', d: '937' }].map((x) => (
          <a key={x.n} href={`tel:${x.d}`}
            className="bg-white dark:bg-[#1a2e21] border border-rose-200 dark:border-[#4a1a1a] rounded-2xl p-3 text-center card-hover">
            <p className="text-xs text-stone-500 dark:text-[#8a9a8e]">{x.n}</p>
            <p className="font-bold text-rose-600 dark:text-[#f06060] text-lg">{x.d}</p>
          </a>
        ))}
      </div>

      {/* GPS button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleLocate}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#1a5c38] hover:bg-[#2d7a4f] disabled:opacity-60 text-white font-semibold py-3 rounded-2xl transition">
          {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          تحديد موقعي الحالي لترتيب المراكز حسب القرب
        </button>
        {userLoc && !userLoc.isDefault && (
          <div className="bg-emerald-50 dark:bg-[#0a1f14] border border-emerald-200 dark:border-[#183828] rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-[#50c088]">
            <CheckCircle size={16} className="flex-shrink-0" /> تم تحديد موقعك — تم ترتيب المراكز حسب القرب
          </div>
        )}
        {locDenied && (
          <div className="bg-amber-50 dark:bg-[#231c0e] border border-amber-200 dark:border-[#4a3a18] rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-[#e0ae50]">
            <AlertCircle size={16} className="flex-shrink-0" />
            لم يتم السماح بتحديد الموقع. يمكنك عرض الخدمات بدون ترتيب حسب المسافة.
          </div>
        )}
      </div>

      {/* Request consultation button */}
      <button
        onClick={() => {
          if (user) setForm((f) => ({ ...f, name: user.fullName, phone: user.phone, hasWhatsApp: user.whatsappEnabled, location: user.location || 'القوع' }));
          setShowForm(true);
        }}
        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition text-lg">
        <Stethoscope size={20} /> طلب استشارة صحية غير طارئة
      </button>

      {/* Health centers */}
      <div>
        <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3">أقرب المراكز الصحية</h3>
        {loadingServices ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 animate-pulse h-20" />)}
          </div>
        ) : servicesError ? (
          <div className="bg-red-50 dark:bg-[#200a0a] border border-red-200 dark:border-[#4a1818] rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700 dark:text-[#f06060]">
            <AlertCircle size={18} className="flex-shrink-0" /> {servicesError}
          </div>
        ) : allCenters.length === 0 ? (
          <div className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-8 text-center">
            <HeartPulse size={32} className="text-stone-300 dark:text-[#3d5a45] mx-auto mb-3" />
            <p className="text-stone-500 dark:text-[#8a9a8e] text-sm">لا توجد خدمات صحية مضافة حالياً</p>
            <p className="text-stone-400 dark:text-[#6a7a6e] text-xs mt-2">أضف بيانات الخدمات الصحية في جدول services لعرضها هنا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allCenters.map((c, i) => {
              const openStatus = getOpenStatus(c.working_hours);
              return (
                <div key={`${c.name}-${i}`} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl p-4 card-hover">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-[#2a0f15] flex items-center justify-center flex-shrink-0">
                        <HeartPulse size={20} className="text-rose-600 dark:text-[#f06080]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] truncate">{c.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-[#8a9a8e] mt-1">
                          {c.address && (
                            <span className="flex items-center gap-1"><MapPinned size={11} /> {c.address}</span>
                          )}
                          {!c.address && <span className="text-stone-400 dark:text-[#6a7a6e]">الموقع غير محدد</span>}
                          {c.working_hours && (
                            <span className="flex items-center gap-1"><Clock size={11} /> {c.working_hours}</span>
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
                      </div>
                    </div>
                    {userLoc && !userLoc.isDefault && c.distance < 9000 && (
                      <span className="bg-[#1a5c38] text-white text-xs font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
                        {formatDistance(c.distance)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.phone && (
                      <button onClick={() => openCall(c.phone!)}
                        className="bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                        <Phone size={14} /> اتصال
                      </button>
                    )}
                    {c.whatsapp_enabled && c.whatsapp_phone ? (
                      <button onClick={() => openWhatsApp(c.whatsapp_phone!, `السلام عليكم، أحتاج استشارة من ${c.name}`)}
                        className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                        <MessageCircle size={14} /> واتساب
                      </button>
                    ) : (
                      <span className="bg-stone-100 dark:bg-[#1e3327] text-stone-400 dark:text-[#6a7a6e] text-sm px-4 py-2 rounded-full flex items-center gap-1.5 cursor-not-allowed">
                        <MessageCircle size={14} /> واتساب غير متوفر
                      </span>
                    )}
                    {c.latitude && c.longitude && (
                      <button onClick={() => openDirections(c.latitude!, c.longitude!)}
                        className="bg-rose-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-rose-600 transition">
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

      {/* Sent consultation requests */}
      <div>
        <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3">طلبات الاستشارة المرسلة</h3>
        {loadingRequests ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="bg-white dark:bg-[#1a2e21] border border-rose-200 dark:border-[#4a1a1a] rounded-2xl p-3 animate-pulse h-14" />)}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-white dark:bg-[#1a2e21] border border-rose-100 dark:border-[#2a0f15] rounded-2xl p-3 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 dark:text-[#e8ede9] truncate">
                    {r.owner_name}{r.age ? ` · ${r.age} سنة` : ''} · {r.urgency}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-[#8a9a8e] truncate">{r.symptoms}</p>
                </div>
                <span className="text-xs text-stone-400 dark:text-[#6a7a6e] whitespace-nowrap">{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 dark:text-[#8a9a8e] text-center py-4">لا توجد طلبات استشارة بعد</p>
        )}
      </div>

      {/* Consultation form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="bg-rose-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Stethoscope size={20} /> طلب استشارة صحية</h3>
              <button onClick={() => setShowForm(false)} disabled={submitting} className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-50"><X size={20} /></button>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-[#231c0e] border-b border-amber-200 dark:border-[#4a3a18]">
              <p className="text-xs text-amber-800 dark:text-[#e0ae50] flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                هذه الخدمة لتنظيم طلب الاستشارة ولا تقدم تشخيصاً طبياً.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">الاسم</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="الاسم الكامل" required
                    className="w-full bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">العمر</label>
                  <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="مثال: 45" min={1} max={120}
                    className="w-full bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">الجنس</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ذكر', 'أنثى', 'امتنع'] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })}
                      className={`py-2 rounded-xl text-sm font-medium transition ${form.gender === g ? 'bg-rose-500 text-white' : 'bg-stone-100 dark:bg-[#1e3327] text-stone-600 dark:text-[#b0bdb3] hover:bg-stone-200 dark:hover:bg-[#253d2c]'}`}>
                      {g === 'امتنع' ? 'امتنع عن الإجابة' : g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">وصف الحالة الصحية</label>
                <textarea value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  placeholder="اشرح حالتك الصحية بالتفصيل..." rows={3} required
                  className="w-full bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">مستوى الألم / الحالة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ val: 'بسيط', color: 'bg-emerald-500' }, { val: 'متوسط', color: 'bg-amber-500' }, { val: 'شديد', color: 'bg-red-500' }].map(({ val, color }) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, urgency: val })}
                      className={`py-2 rounded-xl text-sm font-medium transition ${form.urgency === val ? `${color} text-white` : 'bg-stone-100 dark:bg-[#1e3327] text-stone-600 dark:text-[#b0bdb3] hover:bg-stone-200 dark:hover:bg-[#253d2c]'}`}>
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">الموقع</label>
                <div className="flex gap-2">
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="مثال: القوع - العين"
                    className="flex-1 bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                  <button type="button" disabled={gpsLoading} onClick={handleFormLocate}
                    className="bg-rose-100 dark:bg-[#2a0f15] text-rose-700 dark:text-[#f06080] px-3 rounded-xl hover:bg-rose-200 dark:hover:bg-[#3a1520] transition flex items-center gap-1 text-sm font-medium disabled:opacity-60 whitespace-nowrap">
                    {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                    موقعي
                  </button>
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {submitting ? <><Loader2 size={18} className="animate-spin" /> جاري الإرسال...</> : <><Plus size={18} /> إرسال الطلب</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
