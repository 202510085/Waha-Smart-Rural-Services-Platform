import { useState, useEffect } from 'react';
import {
  Car, Plus, X, Phone, MessageCircle, Clock, ShieldCheck,
  CheckCircle2, UserCheck, Lock, Navigation, Loader2,
} from 'lucide-react';
import { openCall, openWhatsApp } from './utils/location';
import type { Profile } from './utils/auth';
import { fetchRides, insertRideRequest, fetchRideRequests } from './lib/data';
import VerificationGate, { canPerformAction } from './VerificationGate';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
  onRequireLogin: () => void;
  openRequestForm?: boolean;
  onGoToAccount: () => void;
  assistantPrefill?: { action: string; prefill: Record<string, any>; nonce: number } | null;
}

export default function TransportView({ user, onToast, onRequireLogin, openRequestForm, onGoToAccount, assistantPrefill }: Props) {
  const { t } = useTranslation();
  const [rides, setRides] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRequirement, setGateRequirement] = useState<'email' | 'phone' | 'email_or_phone'>('email');
  const [form, setForm] = useState({
    fromLocation: '', toLocation: '', requestedTime: '', passengers: 1, notes: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [ridesData, reqData] = await Promise.all([fetchRides(), fetchRideRequests()]);
      if (!mounted) return;
      setRides(ridesData);
      setRequests(reqData);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  function handleRequestClick() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!canPerformAction(user, 'add_ride')) {
      setGateRequirement('email_or_phone');
      setGateOpen(true);
      return;
    }
    setForm({
      fromLocation: user.location || '',
      toLocation: '',
      requestedTime: '',
      passengers: 1,
      notes: '',
    });
    setShowForm(true);
  }

  useEffect(() => {
    if (openRequestForm) handleRequestClick();
  }, [openRequestForm]);

  useEffect(() => {
    if (!assistantPrefill || !assistantPrefill.nonce) return;
    const { action, prefill } = assistantPrefill;
    if (action === 'open_ride_request') {
      if (!user) { setShowLoginPrompt(true); return; }
      if (!canPerformAction(user, 'add_ride')) { setGateRequirement('email_or_phone'); setGateOpen(true); return; }
      setForm({
        fromLocation: user.location || '',
        toLocation: prefill.to_location || '',
        requestedTime: prefill.time || '',
        passengers: 1,
        notes: prefill.notes || '',
      });
      setShowForm(true);
    }
  }, [assistantPrefill?.nonce]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromLocation.trim() || !form.toLocation.trim() || !user) return;
    setSubmitting(true);
    try {
      await insertRideRequest(user, {
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        requestedTime: form.requestedTime || 'في أقرب وقت',
        passengers: form.passengers,
        notes: form.notes || undefined,
      });
      const fresh = await fetchRideRequests();
      setRequests(fresh);
      setForm({ fromLocation: '', toLocation: '', requestedTime: '', passengers: 1, notes: '' });
      setShowForm(false);
      onToast('تم إرسال طلب الرحلة بنجاح');
    } catch (err) {
      onToast('تعذر إرسال الطلب، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md">
          <Car size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800">النقل الذكي</h2>
          <p className="text-sm text-stone-600 mt-0.5">رحلات تشاركية آمنة بين سكان المنطقة - موثوقة بالهوية الرقمية</p>
        </div>
      </div>

      <button onClick={handleRequestClick}
        className="w-full mb-6 bg-purple-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-600 transition text-lg">
        <Plus size={20} /> طلب توصيلة
      </button>

      {requests.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-stone-800 mb-3">طلباتي</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-white border border-purple-200 rounded-2xl p-3 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-purple-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-800">{r.from_location} ← {r.to_location}</p>
                  <p className="text-xs text-stone-500">{r.requested_time} - {r.passengers} راكب</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  r.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'تم القبول' ? 'bg-amber-100 text-amber-700' :
                  'bg-purple-100 text-purple-700'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-bold text-stone-800 mb-3">رحلات متاحة</h3>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">لا توجد رحلات متاحة حالياً</div>
      ) : (
        <div className="space-y-3">
          {rides.map((r) => (
            <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4 card-hover">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Car size={22} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-800">{r.driver_name}</h4>
                      {r.uae_pass_verified && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                          <ShieldCheck size={11} /> UAE Pass
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{r.from_location} ← {r.to_location}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${r.available_seats > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {r.available_seats > 0 ? `${r.available_seats} مقاعد` : 'ممتلئ'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                <span className="flex items-center gap-1"><Clock size={12} /> {r.departure_time}</span>
                {r.notes && <span className="text-stone-400">{r.notes}</span>}
              </div>
              <div className="flex items-center gap-2">
                {!user ? (
                  <button onClick={() => setShowLoginPrompt(true)}
                    className="bg-stone-100 text-stone-600 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-stone-200 transition">
                    <Lock size={14} /> سجّل للتواصل
                  </button>
                ) : !user.phoneVerified ? (
                  <button onClick={() => { setGateRequirement('phone'); setGateOpen(true); }}
                    className="bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition">
                    <Lock size={14} /> تحقق من الجوال للتواصل
                  </button>
                ) : (
                  <>
                    <button onClick={() => openCall(r.driver_phone)}
                      className="bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-[#2d7a4f] transition">
                      <Phone size={14} /> اتصال
                    </button>
                    {r.whatsapp_enabled ? (
                      <button onClick={() => openWhatsApp(r.driver_phone, `السلام عليكم، شفت رحلتك في منصة واحة من ${r.from_location} إلى ${r.to_location} وأرغب بحجز مقعد.`)}
                        className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-emerald-600 transition">
                        <MessageCircle size={14} /> واتساب
                      </button>
                    ) : (
                      <span className="bg-stone-100 text-stone-400 text-sm font-medium px-4 py-2 rounded-full flex items-center gap-1.5 cursor-not-allowed">
                        <MessageCircle size={14} /> واتساب غير متوفر
                      </span>
                    )}
                  </>
                )}
                {r.available_seats > 0 && (
                  <button onClick={() => onToast('تم طلب المقعد - سيتواصل معك السائق')}
                    className="bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-purple-600 transition">
                    <UserCheck size={14} /> طلب مقعد
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">الأمان أولاً</p>
          <p className="text-xs text-emerald-700 mt-1">جميع السائقين الموثوقين تم التحقق من هويتهم عبر الهوية الرقمية UAE Pass. في نسخة الهاكاثون هذه ميزة تجريبية للعرض فقط.</p>
        </div>
      </div>

      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 mx-auto flex items-center justify-center mb-4">
              <Lock size={28} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">يرجى تسجيل الدخول أولاً</h3>
            <p className="text-sm text-stone-600 mb-5">لتتمكن من طلب توصيلة، يجب تسجيل الدخول أو إنشاء حساب</p>
            <button onClick={() => { setShowLoginPrompt(false); onRequireLogin(); }}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2">
              تسجيل الدخول / إنشاء حساب
            </button>
            <button onClick={() => setShowLoginPrompt(false)}
              className="w-full text-stone-500 text-sm py-2 hover:text-stone-700 transition">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-purple-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><Car size={20} /> طلب توصيلة</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-stone-700">
                <p>الاسم: <span className="font-semibold">{user.fullName}</span></p>
                <p>الهاتف: <span className="font-semibold">{user.phone}</span></p>
                <p>واتساب: <span className="font-semibold">{user.whatsappEnabled ? 'متوفر' : 'غير متوفر'}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">من أين؟</label>
                  <input type="text" value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
                    placeholder="مثال: القوع" required
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">إلى أين؟</label>
                  <input type="text" value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
                    placeholder="مثال: مستشفى توام" required
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">الوقت المطلوب</label>
                  <input type="text" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })}
                    placeholder="مثال: 3 عصراً"
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">عدد الركاب</label>
                  <input type="number" min={1} max={6} value={form.passengers} onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) || 1 })}
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي تفاصيل إضافية..." rows={2}
                  className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-purple-500 text-white font-bold py-3.5 rounded-2xl hover:bg-purple-600 transition flex items-center justify-center gap-2 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />} إرسال الطلب
              </button>
            </form>
          </div>
        </div>
      )}

      <VerificationGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requirement={gateRequirement}
        profile={user}
        onGoToAccount={onGoToAccount}
      />
    </div>
  );
}
