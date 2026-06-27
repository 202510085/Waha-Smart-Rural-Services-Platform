import { useState, useEffect, useRef } from 'react';
import {
  Flag, Plus, X, Clock, MapPin, CheckCircle2, RefreshCw, Phone, MessageCircle,
  Loader2, LocateFixed, Camera, ImagePlus, Search, Filter, AlertTriangle,
  AlertCircle, Droplets, Zap, Trash2, Shield, ChevronRight, Users,
} from 'lucide-react';
import { openCall, openWhatsApp, getCurrentLocation } from './utils/location';
import type { Profile } from './utils/auth';
import { fetchReports, insertReport, updateReportStatus, uploadOptionalImage, handleSupabaseError } from './lib/data';
import { useTranslation } from './i18n/LanguageContext';

const REPORT_TYPES = ['إنارة', 'طرق', 'نظافة', 'مياه', 'أمن', 'أخرى'];
const URGENCY_LEVELS = ['منخفض', 'متوسط', 'عالي'];

const TYPE_ICONS: Record<string, React.ElementType> = {
  'إنارة': Zap,
  'طرق': ChevronRight,
  'نظافة': Trash2,
  'مياه': Droplets,
  'أمن': Shield,
  'أخرى': AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  'إنارة': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  'طرق': 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-700/50 dark:text-stone-300 dark:border-stone-600',
  'نظافة': 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800',
  'مياه': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  'أمن': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  'أخرى': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const STATUS_EN_TO_AR: Record<string, string> = {
  new: 'جديد',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الإصلاح',
};
const STATUS_CYCLE_EN = ['new', 'in_progress', 'resolved'];

const STATUS_FILTER_OPTIONS = [
  { value: null, label: 'كل الحالات' },
  { value: 'new', label: 'جديد' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'resolved', label: 'تم الإصلاح' },
];

interface SupabaseReport {
  id: string;
  report_type: string;
  description: string;
  location: string;
  urgency: string;
  elderly_related: boolean;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp_enabled: boolean | null;
  status: string;
  user_id: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
  prefillType?: string;
  assistantPrefill?: { action: string; prefill: Record<string, any>; nonce: number } | null;
}

function urgencyColor(u: string) {
  if (u === 'عالي') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  if (u === 'متوسط') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
}

function statusColor(sEn: string) {
  if (sEn === 'resolved') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  if (sEn === 'in_progress') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
}

// Report details modal
function ReportDetailsModal({
  report,
  user,
  onClose,
  onCycleStatus,
  onToast,
}: {
  report: SupabaseReport;
  user: Profile | null;
  onClose: () => void;
  onCycleStatus: (id: string, current: string) => void;
  onToast: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const TypeIcon = TYPE_ICONS[report.report_type] || AlertCircle;
  const statusAr = STATUS_EN_TO_AR[report.status] || report.status;
  const phone = report.owner_phone || undefined;
  const hasWhatsApp = !!report.owner_whatsapp_enabled && !!phone;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a2e21] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-100 dark:border-[#2d4a35]">
        {report.image_url && (
          <div className="h-48 overflow-hidden rounded-t-3xl relative">
            <img src={report.image_url} alt="صورة البلاغ" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <button onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition">
              <X size={18} />
            </button>
          </div>
        )}
        {!report.image_url && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <TypeIcon size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#2d4a35] transition">
              <X size={18} className="text-stone-500 dark:text-stone-400" />
            </button>
          </div>
        )}
        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${TYPE_COLORS[report.report_type] || TYPE_COLORS['أخرى']}`}>
              <TypeIcon size={11} /> {report.report_type}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${urgencyColor(report.urgency)}`}>
              <AlertTriangle size={10} /> استعجال: {report.urgency}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusColor(report.status)}`}>
              {report.status === 'resolved' && <CheckCircle2 size={11} />}
              {statusAr}
            </span>
            {report.elderly_related && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Users size={10} /> يخص كبير سن
              </span>
            )}
          </div>
          <p className="text-base font-bold text-stone-800 dark:text-[#e8ede9] mb-3 leading-relaxed">{report.description}</p>
          <div className="space-y-2 text-sm text-stone-600 dark:text-stone-300 mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-orange-500 flex-shrink-0" />
              <span>{report.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-orange-500 flex-shrink-0" />
              <span>{new Date(report.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            {report.owner_name && (
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-orange-500 flex-shrink-0" />
                <span>بواسطة: {report.owner_name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { onCycleStatus(report.id, report.status); onClose(); }}
              className="text-sm font-semibold bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
              <RefreshCw size={13} /> تحديث الحالة
            </button>
            {phone && (
              <button onClick={() => openCall(phone)}
                className="text-sm font-semibold bg-[#1a5c38] text-white px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                <Phone size={13} /> اتصال
              </button>
            )}
            {hasWhatsApp && (
              <button onClick={() => openWhatsApp(phone!, `السلام عليكم، بخصوص البلاغ: ${report.description}`)}
                className="text-sm font-semibold bg-emerald-500 text-white px-3 py-2 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                <MessageCircle size={13} /> واتساب
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsView({ user, onToast, prefillType, assistantPrefill }: Props) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<SupabaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSet, setGpsSet] = useState(false);
  const [reportGps, setReportGps] = useState<{ lat: number; lng: number } | null>(null);
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SupabaseReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const reportGalleryRef = useRef<HTMLInputElement>(null);
  const reportCameraRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: prefillType || 'إنارة',
    description: '',
    location: '',
    urgency: 'متوسط' as string,
    elderly: false,
    phone: '',
    hasWhatsApp: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchReports();
        if (active) setReports(data as SupabaseReport[]);
      } catch (err) {
        console.error('Reports fetch failed:', err);
        if (active) onToast('تعذر تحميل البلاغات');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleAddClick = () => {
    setForm({
      type: prefillType || 'إنارة',
      description: '',
      location: user?.location || '',
      urgency: 'متوسط',
      elderly: false,
      phone: user?.phone || '',
      hasWhatsApp: user?.whatsappEnabled || false,
    });
    setReportGps(null);
    setGpsSet(false);
    setReportImage(null);
    setReportImagePreview(null);
    setShowForm(true);
  };

  useEffect(() => {
    if (prefillType) handleAddClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillType]);

  useEffect(() => {
    if (!assistantPrefill || !assistantPrefill.nonce) return;
    const { action, prefill } = assistantPrefill;
    if (action === 'open_new_report') {
      setForm({
        type: prefill.report_type || prefillType || 'إنارة',
        description: prefill.description || '',
        location: user?.location || '',
        urgency: prefill.urgency || 'متوسط',
        elderly: false,
        phone: user?.phone || '',
        hasWhatsApp: user?.whatsappEnabled || false,
      });
      setReportGps(null);
      setGpsSet(false);
      setReportImage(null);
      setReportImagePreview(null);
      setShowForm(true);
    } else if (action === 'open_reports_search' && prefill.query) {
      setSearchQuery(prefill.query);
    }
  }, [assistantPrefill?.nonce]);

  const handleGps = async () => {
    setGpsLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc.isDefault) {
        setReportGps({ lat: loc.latitude, lng: loc.longitude });
        setForm((f) => ({ ...f, location: f.location || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` }));
        setGpsSet(true);
        onToast('تم تحديد موقعك بنجاح');
      } else {
        onToast('تعذر تحديد موقعك، أدخله يدوياً');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { onToast('يرجى كتابة وصف البلاغ'); return; }
    if (!form.location.trim()) { onToast('يرجى تحديد الموقع أو كتابته'); return; }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (reportImage) {
        const prefix = user?.id || 'guest';
        const url = await uploadOptionalImage('report-images', reportImage, prefix);
        if (url) {
          imageUrl = url;
        } else {
          onToast('تم رفع البلاغ بدون صورة بسبب تعذر رفع الصورة');
        }
      }
      const inserted = await insertReport(user, {
        reportType: form.type,
        description: form.description,
        location: form.location,
        urgency: form.urgency,
        elderlyRelated: form.elderly,
        phone: form.phone,
        hasWhatsApp: form.hasWhatsApp,
        imageUrl,
        latitude: reportGps?.lat,
        longitude: reportGps?.lng,
      });
      if (inserted) {
        setReports((prev) => [inserted as SupabaseReport, ...prev]);
      } else {
        const data = await fetchReports();
        setReports(data as SupabaseReport[]);
      }
      setForm({ type: 'إنارة', description: '', location: '', urgency: 'متوسط', elderly: false, phone: '', hasWhatsApp: false });
      setReportImage(null);
      setReportImagePreview(null);
      setReportGps(null);
      setGpsSet(false);
      setShowForm(false);
      onToast(user ? 'تم رفع البلاغ بنجاح' : 'تم رفع البلاغ كضيف - سجّل دخولك لحفظ بلاغاتك ومتابعتها');
    } catch (err) {
      console.error('Report publish failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const cycleStatus = async (id: string, currentStatusEn: string) => {
    const idx = STATUS_CYCLE_EN.indexOf(currentStatusEn);
    const nextStatusEn = STATUS_CYCLE_EN[(idx + 1) % STATUS_CYCLE_EN.length];
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: nextStatusEn } : r));
    if (selectedReport?.id === id) setSelectedReport((r) => r ? { ...r, status: nextStatusEn } : r);
    try {
      await updateReportStatus(id, nextStatusEn);
      onToast('تم تحديث حالة البلاغ');
    } catch {
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: currentStatusEn } : r));
      onToast('تعذر تحديث الحالة، حاول مرة أخرى');
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = reports.filter((r) => {
    if (activeTypeFilter && r.report_type !== activeTypeFilter) return false;
    if (activeStatusFilter && r.status !== activeStatusFilter) return false;
    if (q) {
      return (
        r.description.toLowerCase().includes(q) ||
        r.report_type.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (r.owner_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md">
          <Flag size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">{t.reportsTitle}</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">ارفع بلاغك ليصل للجهات المختصة ويحلل في القافلة الذكية</p>
        </div>
      </div>

      <button onClick={handleAddClick}
        className="w-full mb-4 bg-orange-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-600 transition text-base">
        <Plus size={20} /> {t.addReport}{!user && ' (كضيف)'}
      </button>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في البلاغات..."
          className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-700"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        <button
          onClick={() => setActiveTypeFilter(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
            !activeTypeFilter
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white dark:bg-[#1a2e21] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#2d4a35] hover:border-orange-300'
          }`}>
          <Filter size={13} /> {t.all}
        </button>
        {REPORT_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t] || AlertCircle;
          return (
            <button key={t}
              onClick={() => setActiveTypeFilter(activeTypeFilter === t ? null : t)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                activeTypeFilter === t
                  ? 'bg-orange-500 text-white border-orange-500'
                  : `${TYPE_COLORS[t] || TYPE_COLORS['أخرى']} hover:opacity-80`
              }`}>
              <Icon size={13} /> {t}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button key={String(opt.value)}
            onClick={() => setActiveStatusFilter(activeStatusFilter === opt.value ? null : opt.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              activeStatusFilter === opt.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white dark:bg-[#1a2e21] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#2d4a35] hover:border-orange-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-stone-500">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm">{t.loading}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <Flag size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {q ? `لا توجد نتائج لـ "${searchQuery}"` : t.noData}
          </p>
          {(q || activeTypeFilter || activeStatusFilter) && (
            <button onClick={() => { setSearchQuery(''); setActiveTypeFilter(null); setActiveStatusFilter(null); }}
              className="mt-3 text-orange-500 dark:text-orange-400 text-sm font-semibold hover:underline">
              عرض جميع البلاغات
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const statusAr = STATUS_EN_TO_AR[r.status] || r.status;
            const TypeIcon = TYPE_ICONS[r.report_type] || AlertCircle;
            const phone = r.owner_phone || undefined;
            const hasWhatsApp = !!r.owner_whatsapp_enabled && !!phone;
            return (
              <div key={r.id}
                className="bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-2xl overflow-hidden card-hover cursor-pointer"
                onClick={() => setSelectedReport(r)}>
                {r.image_url && (
                  <div className="h-32 overflow-hidden">
                    <img src={r.image_url} alt="صورة البلاغ" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <TypeIcon size={18} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${TYPE_COLORS[r.report_type] || TYPE_COLORS['أخرى']}`}>
                            {r.report_type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${urgencyColor(r.urgency)}`}>
                            {r.urgency}
                          </span>
                          {r.elderly_related && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-200 dark:border-purple-800">
                              كبير سن
                            </span>
                          )}
                          {!r.user_id && (
                            <span className="text-xs bg-stone-100 dark:bg-stone-700/50 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full font-semibold">ضيف</span>
                          )}
                        </div>
                        <p className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm line-clamp-2">{r.description}</p>
                        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1.5">
                          <span className="flex items-center gap-1"><MapPin size={11} /> {r.location}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold border flex items-center gap-1 flex-shrink-0 ${statusColor(r.status)}`}>
                      {r.status === 'resolved' && <CheckCircle2 size={11} />}
                      {statusAr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => cycleStatus(r.id, r.status)}
                      className="text-xs font-semibold bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                      <RefreshCw size={12} /> تحديث الحالة
                    </button>
                    {phone && (
                      <button onClick={() => openCall(phone)}
                        className="text-xs font-semibold bg-[#1a5c38] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                        <Phone size={12} /> اتصال
                      </button>
                    )}
                    {hasWhatsApp && (
                      <button onClick={() => openWhatsApp(phone!, `السلام عليكم، بخصوص البلاغ: ${r.description}`)}
                        className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                        <MessageCircle size={12} /> واتساب
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          user={user}
          onClose={() => setSelectedReport(null)}
          onCycleStatus={cycleStatus}
          onToast={onToast}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-stone-100 dark:border-[#2d4a35]">
            <div className="bg-orange-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Flag size={20} /> {t.addReport}{!user && ' (كضيف)'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/15 transition">
                <X size={20} />
              </button>
            </div>
            {!user && (
              <div className="mx-5 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm px-4 py-2.5 rounded-xl">
                سجّل دخولك لحفظ بلاغاتك ومتابعتها لاحقاً
              </div>
            )}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.reportType}</label>
                <div className="grid grid-cols-3 gap-2">
                  {REPORT_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t] || AlertCircle;
                    return (
                      <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                        className={`py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                          form.type === t ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'
                        }`}>
                        <Icon size={14} /> {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.description}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="اشرح المشكلة بالتفصيل..." rows={3} required
                  className="w-full bg-stone-100 dark:bg-[#0f1f14] dark:text-[#e8ede9] dark:placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              {/* Location + GPS */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  {t.location}{user && ' (من حسابك)'}
                </label>
                <div className="flex gap-2">
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="مثال: حي النخيل، شارع الأمير" required
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-[#e8ede9] dark:placeholder-stone-500 ${
                      user ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : 'bg-stone-100 dark:bg-[#0f1f14]'
                    }`} />
                  <button type="button" disabled={gpsLoading} onClick={handleGps}
                    className={`px-3 rounded-xl flex items-center gap-1 text-sm font-medium disabled:opacity-60 transition border ${
                      gpsSet
                        ? 'bg-[#1a5c38] text-white border-[#1a5c38]'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                    }`}>
                    {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                    {gpsSet ? 'تم' : 'موقعي'}
                  </button>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.urgency}</label>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_LEVELS.map((u) => (
                    <button key={u} type="button" onClick={() => setForm({ ...form, urgency: u })}
                      className={`py-2 rounded-xl text-sm font-medium transition ${
                        form.urgency === u ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'
                      }`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elderly */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">هل يخص كبير سن؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, elderly: true })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${form.elderly ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'}`}>
                    نعم
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, elderly: false })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${!form.elderly ? 'bg-stone-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'}`}>
                    لا
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  رقم التواصل{user && ' (من حسابك)'}
                </label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="مثال: 0501234567"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-[#e8ede9] dark:placeholder-stone-500 ${
                    user ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : 'bg-stone-100 dark:bg-[#0f1f14]'
                  }`} />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  هل الرقم يدعم واتساب؟{user && ' (من حسابك)'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, hasWhatsApp: true })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${form.hasWhatsApp ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'}`}>
                    نعم
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, hasWhatsApp: false })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${!form.hasWhatsApp ? 'bg-stone-500 text-white' : 'bg-stone-100 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#162a1c]'}`}>
                    لا
                  </button>
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">صورة للمشكلة (اختياري)</label>
                {reportImagePreview && (
                  <div className="relative mb-2">
                    <img src={reportImagePreview} alt="صورة البلاغ" className="w-full h-32 object-cover rounded-xl border border-stone-200 dark:border-[#2d4a35]" />
                    <button type="button" onClick={() => { setReportImage(null); setReportImagePreview(null); }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => reportCameraRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#162a1c] transition">
                    <Camera size={16} /> كاميرا
                  </button>
                  <button type="button" onClick={() => reportGalleryRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1f14] text-stone-600 dark:text-stone-300 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#162a1c] transition">
                    <ImagePlus size={16} /> معرض
                  </button>
                </div>
                <input ref={reportGalleryRef} type="file" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setReportImage(f); setReportImagePreview(URL.createObjectURL(f)); }}}
                  className="hidden" />
                <input ref={reportCameraRef} type="file" accept="image/*" capture="environment"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setReportImage(f); setReportImagePreview(URL.createObjectURL(f)); }}}
                  className="hidden" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Flag size={18} />}
                {submitting ? 'جارٍ الإرسال...' : 'إرسال البلاغ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
