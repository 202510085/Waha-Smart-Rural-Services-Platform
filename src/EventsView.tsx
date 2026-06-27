import { useState, useEffect, useRef } from 'react';
import {
  Calendar, Plus, X, MapPin, Clock, Phone, MessageCircle, Lock,
  Loader2, Share2, Flag, BookOpen, GraduationCap, Heart, Sprout,
  ShoppingBasket, Star, ImagePlus, Filter, CheckCircle2, Trash2, Edit, Camera,
  Search, Navigation, Users, TicketCheck, UserPlus, ChevronLeft, ChevronRight,
  Globe2, Leaf,
} from 'lucide-react';
import type { Profile } from './utils/auth';
import {
  fetchEvents, insertEvent, updateEvent, deleteEvent,
  uploadOptionalImage, handleSupabaseError,
  insertEventRegistration, getEventRegistrationCount,
} from './lib/data';
import { openCall, openWhatsApp, getCurrentLocation } from './utils/location';
import VerificationGate, { canPerformAction } from './VerificationGate';
import { useTranslation } from './i18n/LanguageContext';

interface EventRow {
  id: string;
  user_id: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp_enabled: boolean | null;
  title: string;
  category: string | null;
  event_date: string | null;
  event_time: string | null;
  period: string | null;
  location: string | null;
  description: string | null;
  image_url: string | null;
  registration_enabled: boolean | null;
  expected_attendees: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
  onRequireLogin: () => void;
  onGoToAccount: () => void;
  assistantPrefill?: { action: string; prefill: Record<string, any>; nonce: number } | null;
}

const EVENT_CATEGORIES = [
  { id: 'وطني', label: 'وطني', icon: Flag, color: 'bg-red-100 text-red-700 border-red-200', dark: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  { id: 'مجتمعي', label: 'مجتمعي', icon: Heart, color: 'bg-amber-100 text-amber-700 border-amber-200', dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  { id: 'تعليمي', label: 'تعليمي', icon: GraduationCap, color: 'bg-sky-100 text-sky-700 border-sky-200', dark: 'dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800' },
  { id: 'قرآني', label: 'مجالس قرآنية', icon: BookOpen, color: 'bg-teal-100 text-teal-700 border-teal-200', dark: 'dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800' },
  { id: 'زراعي', label: 'زراعي', icon: Sprout, color: 'bg-lime-100 text-lime-700 border-lime-200', dark: 'dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800' },
  { id: 'صحي', label: 'صحي', icon: Heart, color: 'bg-rose-100 text-rose-700 border-rose-200', dark: 'dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' },
  { id: 'سوق', label: 'أسواق ومناسبات', icon: ShoppingBasket, color: 'bg-orange-100 text-orange-700 border-orange-200', dark: 'dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' },
  { id: 'ديني', label: 'ديني', icon: Star, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dark: 'dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  { id: 'أخرى', label: 'أخرى', icon: Globe2, color: 'bg-stone-100 text-stone-600 border-stone-200', dark: 'dark:bg-stone-700/50 dark:text-stone-300 dark:border-stone-600' },
];

const getCategoryInfo = (cat: string | null) =>
  EVENT_CATEGORIES.find((c) => c.id === cat) ?? { color: 'bg-stone-100 text-stone-600 border-stone-200', dark: 'dark:bg-stone-700/50 dark:text-stone-300 dark:border-stone-600', icon: Calendar, label: cat || '' };

// Registration form modal
function RegistrationModal({
  event,
  user,
  onClose,
  onToast,
}: {
  event: EventRow;
  user: Profile | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: '',
    attendeesCount: 1,
    whatsappAvailable: user?.whatsappEnabled || false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { onToast('يرجى إدخال الاسم الكامل'); return; }
    if (!form.phone.trim()) { onToast('يرجى إدخال رقم الهاتف'); return; }
    setSubmitting(true);
    try {
      const result = await insertEventRegistration(event.id, user?.id || null, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        attendeesCount: form.attendeesCount,
        whatsappAvailable: form.whatsappAvailable,
        notes: form.notes || undefined,
      });
      setTicketCode(result.registration_code);
      setStep('confirm');
    } catch (err) {
      console.error('Event registration failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step === 'confirm' ? onClose : undefined} />
      <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-stone-100 dark:border-[#2d4a35]">
        {step === 'form' ? (
          <>
            <div className="bg-[#1a5c38] text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus size={20} /> التسجيل في الفعالية
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-3 bg-[#f0f9f4] dark:bg-[#162a1c] border-b border-[#c6e8d6] dark:border-[#2d4a35]">
              <p className="text-sm font-semibold text-[#1a5c38] dark:text-[#6abf8a]">{event.title}</p>
              {event.event_date && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1">
                  <Calendar size={11} /> {event.event_date}{event.event_time ? ` — ${event.event_time}` : ''}
                  {event.period ? ` ${event.period}` : ''}
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">الاسم الكامل</label>
                <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="أدخل اسمك الكامل" required
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xxxxxxxx" required
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">البريد الإلكتروني (اختياري)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">عدد الحضور</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setForm({ ...form, attendeesCount: Math.max(1, form.attendeesCount - 1) })}
                    className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-[#0f1f14] text-stone-700 dark:text-stone-300 font-bold text-lg flex items-center justify-center hover:bg-stone-200 dark:hover:bg-[#162a1c] transition">
                    −
                  </button>
                  <span className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9] w-12 text-center">{form.attendeesCount}</span>
                  <button type="button" onClick={() => setForm({ ...form, attendeesCount: Math.min(20, form.attendeesCount + 1) })}
                    className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-[#0f1f14] text-stone-700 dark:text-stone-300 font-bold text-lg flex items-center justify-center hover:bg-stone-200 dark:hover:bg-[#162a1c] transition">
                    +
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm({ ...form, whatsappAvailable: !form.whatsappAvailable })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${form.whatsappAvailable ? 'bg-[#1a5c38]' : 'bg-stone-300 dark:bg-stone-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.whatsappAvailable ? 'right-1' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">واتساب متاح</span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي ملاحظات أو احتياجات خاصة..." rows={2}
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38] resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-2xl hover:bg-[#2d7a4f] transition flex items-center justify-center gap-2 text-base disabled:opacity-60">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <TicketCheck size={18} />}
                {submitting ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
              </button>
            </form>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#1a5c38]/10 dark:bg-[#1a5c38]/20 mx-auto flex items-center justify-center mb-4">
              <TicketCheck size={40} className="text-[#1a5c38] dark:text-[#6abf8a]" />
            </div>
            <h3 className="font-bold text-xl text-stone-800 dark:text-[#e8ede9] mb-1">تم التسجيل بنجاح!</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">احتفظ برقم التسجيل لتقديمه عند الحضور</p>
            <div className="bg-[#f0f9f4] dark:bg-[#0f1f14] border-2 border-dashed border-[#1a5c38]/40 dark:border-[#2d4a35] rounded-2xl p-5 mb-5">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">رقم التسجيل</p>
              <p className="text-2xl font-bold tracking-widest text-[#1a5c38] dark:text-[#6abf8a] font-mono">{ticketCode}</p>
            </div>
            <div className="text-sm text-stone-600 dark:text-stone-300 space-y-1 mb-5">
              <p><span className="font-semibold">الفعالية:</span> {event.title}</p>
              {event.event_date && <p><span className="font-semibold">التاريخ:</span> {event.event_date}{event.period ? ` — ${event.period}` : ''}</p>}
              {event.location && <p><span className="font-semibold">الموقع:</span> {event.location}</p>}
              <p><span className="font-semibold">عدد الحضور:</span> {form.attendeesCount}</p>
            </div>
            <button onClick={onClose}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition">
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Event details modal
function EventDetailsModal({
  event,
  user,
  onClose,
  onEdit,
  onDelete,
  onToast,
  onRequireLogin,
}: {
  event: EventRow;
  user: Profile | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToast: (msg: string) => void;
  onRequireLogin: () => void;
}) {
  const [showRegForm, setShowRegForm] = useState(false);
  const [regCount, setRegCount] = useState<number | null>(null);
  const catInfo = getCategoryInfo(event.category);
  const CatIcon = catInfo.icon;
  const isOwner = user?.id === event.user_id;

  useEffect(() => {
    if (event.registration_enabled) {
      getEventRegistrationCount(event.id).then(setRegCount);
    }
  }, [event.id, event.registration_enabled]);

  const handleShare = () => {
    const text = `${event.title}${event.event_date ? ' - ' + event.event_date : ''}${event.location ? ' في ' + event.location : ''}\n${event.description || ''}`;
    if (navigator.share) {
      navigator.share({ title: event.title, text }).catch(() => {});
    } else {
      onToast('تم نسخ تفاصيل الفعالية');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-[#1a2e21] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-stone-100 dark:border-[#2d4a35]">
          {event.image_url && (
            <div className="h-52 overflow-hidden rounded-t-3xl relative">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <button onClick={onClose}
                className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition">
                <X size={18} />
              </button>
              <div className={`absolute bottom-3 right-3 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${catInfo.color}`}>
                <CatIcon size={11} /> {event.category}
              </div>
            </div>
          )}
          {!event.image_url && (
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${catInfo.color} ${catInfo.dark}`}>
                <CatIcon size={11} /> {event.category}
              </span>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#2d4a35] transition">
                <X size={18} className="text-stone-500 dark:text-stone-400" />
              </button>
            </div>
          )}
          <div className="px-5 pb-5 pt-3">
            <h2 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9] mb-3">{event.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-600 dark:text-stone-300 mb-4">
              {event.event_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#1a5c38] dark:text-[#6abf8a]" />
                  {event.event_date}
                  {event.period && <span className="text-stone-400 dark:text-stone-500">{event.period}</span>}
                </span>
              )}
              {event.event_time && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#1a5c38] dark:text-[#6abf8a]" />
                  {event.event_time}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#1a5c38] dark:text-[#6abf8a]" />
                  {event.location}
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-4 bg-stone-50 dark:bg-[#0f1f14] rounded-xl p-3">
                {event.description}
              </p>
            )}
            {event.registration_enabled && (
              <div className="bg-[#f0f9f4] dark:bg-[#0f1f14] border border-[#c6e8d6] dark:border-[#2d4a35] rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#1a5c38] dark:text-[#6abf8a] flex items-center gap-1.5">
                    <TicketCheck size={13} /> التسجيل متاح
                  </p>
                  {regCount !== null && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {regCount} مسجل{event.expected_attendees ? ` من ${event.expected_attendees}` : ''}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowRegForm(true)}
                  className="bg-[#1a5c38] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#2d7a4f] transition flex items-center gap-1">
                  <UserPlus size={12} /> سجّل الآن
                </button>
              </div>
            )}
            {event.owner_name && (
              <p className="text-xs text-stone-400 dark:text-stone-500 mb-4 flex items-center gap-1">
                <Users size={11} /> بواسطة: {event.owner_name}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {event.owner_phone && user?.phoneVerified ? (
                <>
                  <button onClick={() => openCall(event.owner_phone!)}
                    className="bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                    <Phone size={14} /> اتصال
                  </button>
                  {event.owner_whatsapp_enabled && (
                    <button onClick={() => openWhatsApp(event.owner_phone!, `السلام عليكم، استفسار عن فعالية: ${event.title}`)}
                      className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                      <MessageCircle size={14} /> واتساب
                    </button>
                  )}
                </>
              ) : event.owner_phone && !user ? (
                <button onClick={() => { onClose(); onRequireLogin(); }}
                  className="bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                  <Lock size={14} /> سجّل للتواصل
                </button>
              ) : null}
              <button onClick={handleShare}
                className="bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition border border-violet-200 dark:border-violet-800">
                <Share2 size={14} /> مشاركة
              </button>
            </div>
            {isOwner && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-[#2d4a35]">
                <button onClick={onEdit}
                  className="flex-1 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
                  <Edit size={14} /> تعديل
                </button>
                <button onClick={onDelete}
                  className="flex-1 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                  <Trash2 size={14} /> حذف
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showRegForm && (
        <RegistrationModal
          event={event}
          user={user}
          onClose={() => setShowRegForm(false)}
          onToast={onToast}
        />
      )}
    </>
  );
}

export default function EventsView({ user, onToast, onRequireLogin, onGoToAccount, assistantPrefill }: Props) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRequirement, setGateRequirement] = useState<'email' | 'phone' | 'email_or_phone'>('email');
  const [submitting, setSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null);
  const [eventDeleting, setEventDeleting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    title: '',
    category: 'مجتمعي',
    eventDate: '',
    eventTime: '',
    period: '',
    location: '',
    description: '',
    registrationEnabled: false,
    expectedAttendees: '',
    latitude: null as number | null,
    longitude: null as number | null,
    gpsSet: false,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchEvents();
        if (!cancelled) setEvents(data as EventRow[]);
      } catch (err) {
        console.error('Events fetch failed:', err);
        if (!cancelled) onToast('تعذر تحميل الفعاليات');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!assistantPrefill || !assistantPrefill.nonce) return;
    const { action, prefill } = assistantPrefill;
    if (action === 'open_add_event' || action === 'open_event_registration') {
      if (!user) { setShowLoginPrompt(true); return; }
      const { allowed, requirement } = canPerformAction(user, 'add_product');
      if (!allowed) { if (requirement) setGateRequirement(requirement); setGateOpen(true); return; }
      setEditingEvent(null);
      setForm({
        ...emptyForm,
        title: prefill.title || '',
        category: prefill.category || 'مجتمعي',
        description: prefill.description || '',
        location: user.location || '',
        registrationEnabled: prefill.registration === 'true',
      });
      setImageFile(null);
      setImagePreview(null);
      setShowForm(true);
    } else if (action === 'open_events_search' && prefill.query) {
      setSearchQuery(prefill.query);
    }
  }, [assistantPrefill?.nonce]);

  const handleAddClick = () => {
    if (!user) { setShowLoginPrompt(true); return; }
    const { allowed, requirement } = canPerformAction(user, 'add_product');
    if (!allowed) {
      if (requirement) setGateRequirement(requirement);
      setGateOpen(true);
      return;
    }
    setEditingEvent(null);
    setForm({ ...emptyForm, location: user.location || '' });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (ev: EventRow) => {
    setSelectedEvent(null);
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      category: ev.category || 'مجتمعي',
      eventDate: ev.event_date || '',
      eventTime: ev.event_time || '',
      period: ev.period || '',
      location: ev.location || '',
      description: ev.description || '',
      registrationEnabled: ev.registration_enabled || false,
      expectedAttendees: ev.expected_attendees?.toString() || '',
      latitude: ev.latitude || null,
      longitude: ev.longitude || null,
      gpsSet: !!(ev.latitude && ev.longitude),
    });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const handleGpsForForm = async () => {
    setGpsLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc.isDefault) {
        setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude, gpsSet: true }));
        onToast('تم تحديد موقعك بنجاح');
      } else {
        onToast('تعذر تحديد الموقع، تحقق من إذن الموقع في المتصفح');
      }
    } catch {
      onToast('تعذر تحديد الموقع');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onToast('يرجى تسجيل الدخول أولاً لنشر الفعالية'); return; }
    if (!form.title.trim()) { onToast('يرجى تعبئة عنوان الفعالية'); return; }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const url = await uploadOptionalImage('event-images', imageFile, user.id);
        if (url) {
          imageUrl = url;
        } else {
          onToast('تم نشر الفعالية بدون صورة بسبب تعذر رفع الصورة');
        }
      }
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, {
          title: form.title,
          category: form.category,
          eventDate: form.eventDate || null,
          eventTime: form.eventTime || null,
          location: form.location,
          description: form.description,
          ...(imageUrl !== undefined ? { imageUrl } : {}),
        });
        if (updated) {
          setEvents((prev) => prev.map((ev) => ev.id === editingEvent.id ? (updated as EventRow) : ev));
        }
        onToast('تم تحديث الفعالية بنجاح');
      } else {
        const created = await insertEvent(user, {
          title: form.title,
          category: form.category,
          eventDate: form.eventDate || undefined,
          eventTime: form.eventTime || undefined,
          period: form.period || undefined,
          location: form.location,
          description: form.description,
          imageUrl,
          latitude: form.latitude || undefined,
          longitude: form.longitude || undefined,
          registrationEnabled: form.registrationEnabled,
          expectedAttendees: form.expectedAttendees ? parseInt(form.expectedAttendees) : undefined,
        });
        if (created) setEvents((prev) => [created as EventRow, ...prev]);
        onToast('تم نشر الفعالية بنجاح');
      }
      setShowForm(false);
      setEditingEvent(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Event publish failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    setEventDeleting(true);
    try {
      await deleteEvent(deletingEvent.id);
      setEvents((prev) => prev.filter((ev) => ev.id !== deletingEvent.id));
      onToast('تم حذف الفعالية');
      setDeletingEvent(null);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Event delete failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setEventDeleting(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = events.filter((ev) => {
    if (activeFilter && ev.category !== activeFilter) return false;
    if (q) {
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.category || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q) ||
        (ev.location || '').toLowerCase().includes(q) ||
        (ev.owner_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-md">
          <Calendar size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">فعاليات المنطقة</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">الفعاليات الوطنية والمجتمعية والتعليمية ومجالس تحفيظ القرآن</p>
        </div>
      </div>

      <button onClick={handleAddClick}
        className="w-full mb-4 bg-violet-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-violet-600 transition text-base">
        <Plus size={20} /> أضف فعالية جديدة
      </button>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن فعالية..."
          className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-700"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => setActiveFilter(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
            !activeFilter
              ? 'bg-violet-500 text-white border-violet-500'
              : 'bg-white dark:bg-[#1a2e21] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#2d4a35] hover:border-violet-300'
          }`}>
          <Filter size={13} /> الكل
        </button>
        {EVENT_CATEGORIES.map((cat) => (
          <button key={cat.id}
            onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
              activeFilter === cat.id
                ? 'bg-violet-500 text-white border-violet-500'
                : `${cat.color} ${cat.dark} hover:opacity-80`
            }`}>
            <cat.icon size={13} /> {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-stone-500">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm">جاري تحميل الفعاليات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <Calendar size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {q ? `لا توجد نتائج لـ "${searchQuery}"` : activeFilter ? `لا توجد فعاليات في تصنيف "${activeFilter}"` : 'لا توجد فعاليات حالياً'}
          </p>
          {(q || activeFilter) && (
            <button onClick={() => { setSearchQuery(''); setActiveFilter(null); }}
              className="mt-3 text-violet-500 dark:text-violet-400 text-sm font-semibold hover:underline">
              عرض جميع الفعاليات
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((ev) => {
            const catInfo = getCategoryInfo(ev.category);
            const CatIcon = catInfo.icon;
            const isOwner = user?.id === ev.user_id;
            return (
              <div key={ev.id}
                className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl overflow-hidden card-hover cursor-pointer group"
                onClick={() => setSelectedEvent(ev)}>
                {ev.image_url && (
                  <div className="h-36 overflow-hidden">
                    <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${catInfo.color} ${catInfo.dark}`}>
                      <CatIcon size={11} /> {ev.category}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {ev.registration_enabled && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#f0f9f4] dark:bg-[#0f1f14] text-[#1a5c38] dark:text-[#6abf8a] border border-[#c6e8d6] dark:border-[#2d4a35] font-semibold">
                          <TicketCheck size={10} /> تسجيل
                        </span>
                      )}
                      {isOwner && (
                        <>
                          <button onClick={() => openEdit(ev)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setDeletingEvent(ev)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-1 line-clamp-1">{ev.title}</h4>
                  {ev.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 mb-3 line-clamp-2 leading-relaxed">{ev.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400 mb-3">
                    {ev.event_date && (
                      <span className="flex items-center gap-1"><Calendar size={11} /> {ev.event_date}{ev.period ? ` ${ev.period}` : ''}</span>
                    )}
                    {ev.event_time && (
                      <span className="flex items-center gap-1"><Clock size={11} /> {ev.event_time}</span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {!user ? (
                      <button onClick={onRequireLogin}
                        className="bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                        <Lock size={12} /> سجّل للتواصل
                      </button>
                    ) : !user.phoneVerified ? (
                      <button onClick={() => setGateOpen(true)}
                        className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition">
                        <Lock size={12} /> تحقق من الجوال
                      </button>
                    ) : ev.owner_phone ? (
                      <>
                        <button onClick={() => openCall(ev.owner_phone!)}
                          className="bg-[#1a5c38] text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-[#2d7a4f] transition">
                          <Phone size={12} /> اتصال
                        </button>
                        {ev.owner_whatsapp_enabled && (
                          <button onClick={() => openWhatsApp(ev.owner_phone!, `السلام عليكم، استفسار عن فعالية: ${ev.title}`)}
                            className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-600 transition">
                            <MessageCircle size={12} /> واتساب
                          </button>
                        )}
                      </>
                    ) : null}
                    {ev.registration_enabled && (
                      <button onClick={() => setSelectedEvent(ev)}
                        className="bg-[#f0f9f4] dark:bg-[#0f1f14] text-[#1a5c38] dark:text-[#6abf8a] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-[#ddf0e8] dark:hover:bg-[#162a1c] transition border border-[#c6e8d6] dark:border-[#2d4a35]">
                        <UserPlus size={12} /> سجّل
                      </button>
                    )}
                  </div>
                  {ev.owner_name && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">بواسطة: {ev.owner_name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event details modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          user={user}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEdit(selectedEvent)}
          onDelete={() => { setDeletingEvent(selectedEvent); setSelectedEvent(null); }}
          onToast={onToast}
          onRequireLogin={onRequireLogin}
        />
      )}

      {/* Login prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-stone-100 dark:border-[#2d4a35]">
            <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 mx-auto flex items-center justify-center mb-4">
              <Lock size={28} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-[#e8ede9] mb-2">يرجى تسجيل الدخول</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-5">لإضافة فعالية للمنطقة يجب تسجيل الدخول أو إنشاء حساب</p>
            <button onClick={() => { setShowLoginPrompt(false); onRequireLogin(); }}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2">
              تسجيل الدخول / إنشاء حساب
            </button>
            <button onClick={() => setShowLoginPrompt(false)}
              className="w-full text-stone-500 dark:text-stone-400 text-sm py-2 hover:text-stone-700 dark:hover:text-stone-300 transition">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Verification gate */}
      {gateOpen && (
        <VerificationGate
          user={user!}
          requirement={gateRequirement}
          onClose={() => setGateOpen(false)}
          onVerified={() => { setGateOpen(false); }}
          onGoToAccount={onGoToAccount}
        />
      )}

      {/* Add/Edit form */}
      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingEvent(null); }} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-stone-100 dark:border-[#2d4a35]">
            <div className="bg-violet-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar size={20} /> {editingEvent ? 'تعديل الفعالية' : 'إضافة فعالية جديدة'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingEvent(null); }} className="p-1.5 rounded-full hover:bg-white/15 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">عنوان الفعالية</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: حفل تكريم طلاب المدرسة" required
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">التصنيف</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_CATEGORIES.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setForm({ ...form, category: cat.id })}
                      className={`py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${
                        form.category === cat.id ? 'bg-violet-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'
                      }`}>
                      <cat.icon size={12} /> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date and time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">التاريخ</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">الوقت</label>
                  <input type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>

              {/* Period */}
              {form.eventTime && (
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">الفترة</label>
                  <div className="flex gap-2">
                    {['صباحاً', 'مساءً'].map((p) => (
                      <button key={p} type="button" onClick={() => setForm({ ...form, period: form.period === p ? '' : p })}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                          form.period === p ? 'bg-violet-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Location + GPS */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">الموقع</label>
                <div className="flex gap-2">
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="مثال: مسجد الواحة - القوع"
                    className="flex-1 bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <button type="button" onClick={handleGpsForForm} disabled={gpsLoading}
                    className={`px-3 rounded-xl text-sm flex items-center gap-1 transition border ${
                      form.gpsSet
                        ? 'bg-[#1a5c38] text-white border-[#1a5c38]'
                        : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#2d4a35] hover:bg-stone-200'
                    }`}>
                    {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  </button>
                </div>
                {form.gpsSet && (
                  <p className="text-xs text-[#1a5c38] dark:text-[#6abf8a] mt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} /> تم تحديد الموقع الجغرافي
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="تفاصيل الفعالية..." rows={3}
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>

              {/* Registration toggle */}
              <div className="bg-stone-50 dark:bg-[#0f1f14] rounded-xl p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">تفعيل التسجيل</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">السماح للجمهور بالتسجيل في الفعالية</p>
                  </div>
                  <div onClick={() => setForm({ ...form, registrationEnabled: !form.registrationEnabled })}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${form.registrationEnabled ? 'bg-[#1a5c38]' : 'bg-stone-300 dark:bg-stone-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.registrationEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </label>
                {form.registrationEnabled && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">الحضور المتوقع (اختياري)</label>
                    <input type="number" min="1" value={form.expectedAttendees}
                      onChange={(e) => setForm({ ...form, expectedAttendees: e.target.value })}
                      placeholder="عدد المقاعد المتاحة"
                      className="w-full bg-white dark:bg-[#162a1c] dark:text-[#e8ede9] dark:placeholder-stone-500 border border-stone-200 dark:border-[#2d4a35] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]" />
                  </div>
                )}
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5">صورة الفعالية (اختياري)</label>
                {(imagePreview || editingEvent?.image_url) && (
                  <div className="relative mb-2">
                    <img src={imagePreview || editingEvent?.image_url!} alt="صورة الفعالية"
                      className="w-full h-40 object-cover rounded-xl border border-stone-200 dark:border-[#2d4a35]" />
                    {imagePreview && (
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#162a1c] transition">
                    <Camera size={16} /> كاميرا
                  </button>
                  <button type="button" onClick={() => imageRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#162a1c] transition">
                    <ImagePlus size={16} /> {imageFile ? 'تغيير الصورة' : editingEvent?.image_url ? 'استبدال' : 'معرض'}
                  </button>
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-violet-500 text-white font-bold py-3.5 rounded-2xl hover:bg-violet-600 transition flex items-center justify-center gap-2 text-base disabled:opacity-60">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {submitting ? 'جاري النشر...' : editingEvent ? 'حفظ التعديلات' : 'نشر الفعالية'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingEvent(null)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-stone-100 dark:border-[#2d4a35]">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-[#e8ede9] mb-2">هل أنت متأكد؟</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-1">سيتم حذف هذه الفعالية نهائياً:</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-[#e8ede9] mb-5 bg-stone-50 dark:bg-[#0f1f14] rounded-xl px-4 py-2">"{deletingEvent.title}"</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeletingEvent(null)}
                className="py-3 rounded-2xl bg-stone-100 dark:bg-[#2d4a35] text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                إلغاء
              </button>
              <button onClick={handleConfirmDelete} disabled={eventDeleting}
                className="py-3 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {eventDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
