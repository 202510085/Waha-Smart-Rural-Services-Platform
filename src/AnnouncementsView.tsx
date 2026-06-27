import { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Plus, X, Calendar, Clock, Phone, MessageCircle, Lock,
  Loader2, Camera, ImagePlus, Sun, Moon, Search, MapPin, Navigation, User,
} from 'lucide-react';
import { openCall, openWhatsApp, getCurrentLocation } from './utils/location';
import { fetchAnnouncements, insertAnnouncement, uploadOptionalImage, handleSupabaseError } from './lib/data';
import type { Profile } from './utils/auth';
import VerificationGate, { canPerformAction } from './VerificationGate';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
  onRequireLogin: () => void;
  onGoToAccount: () => void;
  assistantPrefill?: { action: string; prefill: Record<string, any>; nonce: number } | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  category: string;
  event_date: string | null;
  event_time: string | null;
  period: string | null;
  description: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp_enabled: boolean | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

const ANNOUNCEMENT_FILTERS = ['الكل', 'تنويه', 'خدمة', 'وظيفة', 'مناسبة', 'زراعي', 'صحي', 'سوق', 'أخرى'];
const ANNOUNCEMENT_CATEGORIES = ['تنويه', 'خدمة', 'وظيفة', 'مناسبة', 'زراعي', 'صحي', 'سوق', 'أخرى'];

const CATEGORY_COLORS: Record<string, string> = {
  'تنويه': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  'خدمة': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'وظيفة': 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  'مناسبة': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  'زراعي': 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400',
  'صحي': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  'سوق': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'أخرى': 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
  'ديني': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'اجتماعي': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m < 1 ? 'الآن' : `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export default function AnnouncementsView({ user, onToast, onRequireLogin, onGoToAccount, assistantPrefill }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRequirement, setGateRequirement] = useState<'email' | 'phone' | 'email_or_phone'>('email');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [detailItem, setDetailItem] = useState<AnnouncementRow | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '', category: 'تنويه', eventDate: '', eventTime: '', period: 'صباحاً',
    description: '', location: '', latitude: null as number | null, longitude: null as number | null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAnnouncements();
        if (active) setItems(data as AnnouncementRow[]);
      } catch (err) {
        console.error('Announcements fetch failed:', err);
        if (active) onToast('تعذر تحميل الإعلانات');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!assistantPrefill || !assistantPrefill.nonce) return;
    const { action, prefill } = assistantPrefill;
    if (action === 'open_add_announcement') {
      if (!user) { setShowLoginPrompt(true); return; }
      const { allowed, requirement } = canPerformAction(user, 'add_announcement');
      if (!allowed) { setGateRequirement(requirement ?? 'email'); setGateOpen(true); return; }
      setForm({
        title: prefill.title || '',
        category: prefill.category || 'تنويه',
        eventDate: prefill.date || '',
        eventTime: prefill.time || '',
        period: 'صباحاً',
        description: prefill.description || '',
        location: user.location || '',
        latitude: null, longitude: null,
      });
      setImageFile(null);
      setImagePreview(null);
      setShowForm(true);
    }
  }, [assistantPrefill?.nonce]);

  const handleAddClick = () => {
    if (!user) { setShowLoginPrompt(true); return; }
    const { allowed, requirement } = canPerformAction(user, 'add_announcement');
    if (!allowed) { setGateRequirement(requirement ?? 'email'); setGateOpen(true); return; }
    setForm({ title: '', category: 'تنويه', eventDate: '', eventTime: '', period: 'صباحاً', description: '', location: user.location || '', latitude: null, longitude: null });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const handleGps = async () => {
    setGpsLoading(true);
    const loc = await getCurrentLocation();
    setGpsLoading(false);
    if (loc.isDefault) {
      onToast('لم يتم السماح بتحديد الموقع، يمكنك كتابة الموقع يدوياً.');
    } else {
      setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude, location: f.location || 'موقعي الحالي' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onToast('يرجى تسجيل الدخول أولاً'); return; }
    if (!form.title.trim()) { onToast('يرجى تعبئة عنوان الإعلان'); return; }
    if (!form.description.trim()) { onToast('يرجى كتابة وصف الإعلان'); return; }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const url = await uploadOptionalImage('announcement-images', imageFile, user.id);
        if (url) { imageUrl = url; }
        else { onToast('تم نشر الإعلان بدون صورة بسبب تعذر رفع الصورة'); }
      }
      const created = await insertAnnouncement(user, {
        title: form.title.trim(),
        category: form.category,
        eventDate: form.eventDate || undefined,
        eventTime: form.eventTime || undefined,
        period: form.eventTime ? form.period : undefined,
        description: form.description.trim(),
        imageUrl,
        location: form.location || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
      });
      if (created) setItems((prev) => [created as AnnouncementRow, ...prev]);
      setShowForm(false);
      setImageFile(null);
      setImagePreview(null);
      onToast('تم نشر الإعلان بنجاح');
    } catch (err) {
      console.error('Announcement publish failed:', err);
      onToast('تعذر نشر الإعلان: ' + handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((a) => {
    if (activeFilter !== 'الكل' && a.category !== activeFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      a.title?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.owner_name?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-blue-50 dark:bg-[#1a2e21] border border-blue-200 dark:border-[#2d4a35] rounded-2xl p-4 flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Megaphone size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9]">الإعلانات</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">مناسبات وخدمات وإعلانات أهالي الواحة</p>
        </div>
        <button onClick={handleAddClick}
          className="mr-auto flex-shrink-0 bg-blue-600 text-white font-bold px-3.5 py-2 rounded-xl text-sm flex items-center gap-1.5 hover:bg-blue-700 active:scale-95 transition">
          <Plus size={15} /> إعلان جديد
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في الإعلانات..."
          className="w-full bg-stone-100 dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-stone-800 dark:text-[#e8ede9] placeholder-stone-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {ANNOUNCEMENT_FILTERS.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full transition ${activeFilter === f
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-stone-100 dark:bg-[#1a2e21] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2d4a35] hover:bg-stone-200'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-blue-500">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <Megaphone size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">لا توجد إعلانات حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl overflow-hidden card-hover">
              {a.image_url && (
                <img src={a.image_url} alt={a.title} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[a.category] || 'bg-stone-100 text-stone-600'}`}>
                        {a.category}
                      </span>
                      <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm">{a.title}</h4>
                    </div>
                    {a.description && a.description !== a.title && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">{a.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400 dark:text-stone-500 mt-2">
                      {a.event_date && <span className="flex items-center gap-1"><Calendar size={10} /> {a.event_date}</span>}
                      {a.event_time && <span className="flex items-center gap-1"><Clock size={10} /> {a.event_time}{a.period ? ' ' + a.period : ''}</span>}
                      {a.location && <span className="flex items-center gap-1"><MapPin size={10} /> {a.location}</span>}
                      {a.owner_name && <span className="flex items-center gap-1"><User size={10} /> {a.owner_name}</span>}
                      <span className="text-stone-300 dark:text-stone-600">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <button onClick={() => setDetailItem(a)}
                    className="text-xs font-semibold bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 px-3 py-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                    عرض التفاصيل
                  </button>
                  {a.owner_phone && (
                    user ? (
                      <>
                        <button onClick={() => openCall(a.owner_phone!)}
                          className="text-xs font-semibold bg-[#1a5c38] text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-[#2d7a4f] transition">
                          <Phone size={11} /> اتصال
                        </button>
                        {a.owner_whatsapp_enabled && (
                          <button onClick={() => openWhatsApp(a.owner_phone!, `السلام عليكم، شفت إعلانك في واحة.`)}
                            className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-600 transition">
                            <MessageCircle size={11} /> واتساب
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => setShowLoginPrompt(true)}
                        className="text-xs font-semibold bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-stone-200 transition">
                        <Lock size={11} /> سجّل للتواصل
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-[#2d4a35] bg-white dark:bg-[#1a2e21] rounded-t-3xl">
              <h3 className="font-bold text-stone-800 dark:text-[#e8ede9]">{detailItem.title}</h3>
              <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#2d4a35]"><X size={20} className="text-stone-500" /></button>
            </div>
            {detailItem.image_url && (
              <img src={detailItem.image_url} alt={detailItem.title} className="w-full h-52 object-cover" />
            )}
            <div className="p-5 space-y-3">
              <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[detailItem.category] || 'bg-stone-100 text-stone-600'}`}>
                {detailItem.category}
              </span>
              {detailItem.description && (
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{detailItem.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-stone-500 dark:text-stone-400">
                {detailItem.event_date && <span className="flex items-center gap-1.5"><Calendar size={13} /> {detailItem.event_date}</span>}
                {detailItem.event_time && <span className="flex items-center gap-1.5"><Clock size={13} /> {detailItem.event_time}{detailItem.period ? ' ' + detailItem.period : ''}</span>}
                {detailItem.location && <span className="flex items-center gap-1.5"><MapPin size={13} /> {detailItem.location}</span>}
                {detailItem.owner_name && <span className="flex items-center gap-1.5"><User size={13} /> {detailItem.owner_name}</span>}
              </div>
              {detailItem.owner_phone && user && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => openCall(detailItem.owner_phone!)}
                    className="flex-1 bg-[#1a5c38] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#2d7a4f] transition">
                    <Phone size={14} /> اتصال
                  </button>
                  {detailItem.owner_whatsapp_enabled && (
                    <button onClick={() => openWhatsApp(detailItem.owner_phone!, `السلام عليكم، شفت إعلانك: ${detailItem.title}`)}
                      className="flex-1 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition">
                      <MessageCircle size={14} /> واتساب
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 mx-auto flex items-center justify-center mb-4"><Lock size={28} className="text-blue-600" /></div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-[#e8ede9] mb-2">يرجى تسجيل الدخول أولاً</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-5">سجّل دخولك للتواصل مع الناشرين ولنشر إعلاناتك</p>
            <button onClick={() => { setShowLoginPrompt(false); onRequireLogin(); }}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2">تسجيل الدخول / إنشاء حساب</button>
            <button onClick={() => setShowLoginPrompt(false)} className="w-full text-stone-500 text-sm py-2">إلغاء</button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-lg max-h-[93vh] overflow-y-auto">
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Megaphone size={20} /> نشر إعلان جديد</h3>
              <button onClick={() => !submitting && setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">عنوان الإعلان <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: انقطاع ماء مؤقت في حي النخيل" required
                  className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent dark:border-[#2d4a35]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">نوع الإعلان</label>
                <div className="flex flex-wrap gap-1.5">
                  {ANNOUNCEMENT_CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${form.category === c ? 'bg-blue-600 text-white' : 'bg-stone-100 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2d4a35]'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">التاريخ</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent dark:border-[#2d4a35]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">الوقت</label>
                  <input type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent dark:border-[#2d4a35]" />
                </div>
              </div>
              {form.eventTime && (
                <div className="flex gap-2">
                  {(['صباحاً', 'مساءً'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setForm({ ...form, period: p })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition ${form.period === p ? (p === 'صباحاً' ? 'bg-amber-400 text-white' : 'bg-[#1a5c38] text-white') : 'bg-stone-100 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2d4a35]'}`}>
                      {p === 'صباحاً' ? <Sun size={14} /> : <Moon size={14} />} {p}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">الوصف <span className="text-red-500">*</span></label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="تفاصيل الإعلان..." rows={3} required
                  className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none border border-transparent dark:border-[#2d4a35]" />
              </div>
              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">الموقع (اختياري)</label>
                <div className="flex gap-2">
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="مثال: حي النخيل - القوع"
                    className="flex-1 bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-transparent dark:border-[#2d4a35]" />
                  <button type="button" onClick={handleGps} disabled={gpsLoading}
                    className="flex-shrink-0 bg-[#1a5c38] text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-[#2d7a4f] disabled:opacity-60 transition">
                    {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />} GPS
                  </button>
                </div>
                {form.latitude && (
                  <p className="text-xs text-[#1a5c38] dark:text-[#5dc993] mt-1 flex items-center gap-1"><Navigation size={11} /> تم تحديد الموقع</p>
                )}
              </div>
              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">إضافة صورة (اختياري)</label>
                {imagePreview && (
                  <div className="relative mb-2">
                    <img src={imagePreview} alt="" className="w-full h-36 object-cover rounded-xl border border-stone-200 dark:border-[#2d4a35]" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1"><X size={13} /></button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 transition">
                    <Camera size={15} /> أنقط الصورة
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 transition">
                    <ImagePlus size={15} /> من المعرض
                  </button>
                </div>
                <input ref={galleryRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } e.target.value = ''; }} className="hidden" />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } e.target.value = ''; }} className="hidden" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-700 transition flex items-center justify-center gap-2 text-base disabled:opacity-60">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />}
                {submitting ? 'جاري النشر...' : 'نشر الإعلان'}
              </button>
            </form>
          </div>
        </div>
      )}

      <VerificationGate open={gateOpen} onClose={() => setGateOpen(false)} requirement={gateRequirement} profile={user} onGoToAccount={onGoToAccount} />
    </div>
  );
}
