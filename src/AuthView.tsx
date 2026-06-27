import { useState, useEffect } from 'react';
import { UserPlus, LogIn, X, User as UserIcon, Loader2, MailCheck, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import {
  signUp, signIn, resendSignupConfirmation,
  LOCATIONS, USER_TYPE_LABELS, type Profile, type UserType,
} from './utils/auth';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  onAuth: (profile: Profile) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function AuthView({ onAuth, onClose, onToast }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [registrationDone, setRegistrationDone] = useState(false);

  // Resend cooldown: 60 seconds
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [regForm, setRegForm] = useState({
    fullName: '', countryCode: '+971', phone: '', whatsappEnabled: false, email: '',
    location: LOCATIONS[0] as string, userType: 'individual' as UserType, password: '', confirmPassword: '',
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!regForm.fullName.trim() || !regForm.phone.trim() || !regForm.email.trim() || !regForm.password.trim()) {
      setError(t.fillAllFields);
      return;
    }
    if (regForm.password.length < 6) {
      setError(t.passwordMinLength);
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    const fullPhone = regForm.countryCode + regForm.phone.replace(/^0/, '');
    const { error: err, needsEmailConfirmation, isRateLimit } = await signUp(regForm.email, regForm.password, {
      fullName: regForm.fullName,
      phone: fullPhone,
      whatsappEnabled: regForm.whatsappEnabled,
      location: regForm.location,
      userType: regForm.userType,
    });
    setLoading(false);

    if (err) {
      setError(err);
      if (isRateLimit) {
        setRegistrationDone(true);
      }
      return;
    }

    if (needsEmailConfirmation) {
      setPendingEmail(regForm.email);
      setRegistrationDone(true);
      setResendCooldown(60);
      setShowEmailConfirmation(true);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    const { error: err } = await resendSignupConfirmation(pendingEmail);
    setResending(false);
    if (err) {
      onToast('تعذر إعادة الإرسال: ' + err);
    } else {
      onToast('تم إعادة إرسال رابط التحقق إلى بريدك');
      setResendCooldown(60);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setError(t.enterEmailPassword);
      return;
    }
    setLoading(true);
    const { error: err, profile } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    if (profile) {
      onToast(t.signInSuccess);
      onAuth(profile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-[#1a5c38] text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <UserIcon size={20} /> {tab === 'login' ? t.signIn : t.signUp}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
        </div>

        <div className="flex border-b border-stone-200">
          <button onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${tab === 'login' ? 'text-[#1a5c38] border-b-2 border-[#1a5c38] bg-[#f5f0e8]/50' : 'text-stone-500 hover:text-stone-700'}`}>
            <LogIn size={16} className="inline ml-1" /> {t.signIn}
          </button>
          <button onClick={() => { setTab('register'); setError(''); setRegistrationDone(false); setRegForm({ fullName: '', countryCode: '+971', phone: '', whatsappEnabled: false, email: '', location: LOCATIONS[0] as string, userType: 'individual' as UserType, password: '', confirmPassword: '' }); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${tab === 'register' ? 'text-[#1a5c38] border-b-2 border-[#1a5c38] bg-[#f5f0e8]/50' : 'text-stone-500 hover:text-stone-700'}`}>
            <UserPlus size={16} className="inline ml-1" /> {t.signUp}
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2.5">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.email}</label>
              <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="example@mail.com"
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.password}</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-2xl hover:bg-[#2d7a4f] transition flex items-center justify-center gap-2 text-lg disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} {t.signIn}
            </button>
            <p className="text-center text-sm text-stone-500">
              {t.dontHaveAccount}{' '}
              <button type="button" onClick={() => setTab('register')} className="text-[#1a5c38] font-semibold hover:underline">
                {t.signUp}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.fullName}</label>
              <input type="text" value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                placeholder="مثال: أبو عبدالله" required disabled={registrationDone}
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.phone}</label>
              <div className="flex gap-2">
                <select value={regForm.countryCode} onChange={(e) => setRegForm({ ...regForm, countryCode: e.target.value })}
                  disabled={registrationDone}
                  className="bg-stone-100 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60">
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+968">🇴🇲 +968</option>
                  <option value="+974">🇶🇦 +974</option>
                  <option value="+973">🇧🇭 +973</option>
                  <option value="+965">🇰🇼 +965</option>
                  <option value="+1">🌍 أخرى</option>
                </select>
                <input type="tel" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="501234567" required disabled={registrationDone}
                  className="flex-1 bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.whatsappEnabled}</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={registrationDone} onClick={() => setRegForm({ ...regForm, whatsappEnabled: true })}
                  className={`py-2.5 rounded-xl text-sm font-medium transition ${regForm.whatsappEnabled ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'} disabled:opacity-60`}>نعم</button>
                <button type="button" disabled={registrationDone} onClick={() => setRegForm({ ...regForm, whatsappEnabled: false })}
                  className={`py-2.5 rounded-xl text-sm font-medium transition ${!regForm.whatsappEnabled ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'} disabled:opacity-60`}>لا</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.email}</label>
              <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="example@mail.com" required disabled={registrationDone}
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.location}</label>
              <select value={regForm.location} onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                disabled={registrationDone}
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60">
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.userType}</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(USER_TYPE_LABELS) as UserType[]).map((t) => (
                  <button key={t} type="button" disabled={registrationDone} onClick={() => setRegForm({ ...regForm, userType: t })}
                    className={`py-2 rounded-xl text-xs font-medium transition ${regForm.userType === t ? 'bg-[#1a5c38] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'} disabled:opacity-60`}>
                    {USER_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.password}</label>
              <input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="6 أحرف على الأقل" required disabled={registrationDone}
                className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">{t.passwordConfirm}</label>
              <input type="password" value={regForm.confirmPassword} onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                placeholder="أعد كتابة كلمة المرور" required disabled={registrationDone}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 disabled:opacity-60 ${
                  regForm.confirmPassword && regForm.password !== regForm.confirmPassword
                    ? 'bg-red-50 border border-red-300'
                    : 'bg-stone-100'
                }`} />
              {regForm.confirmPassword && regForm.password !== regForm.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{t.passwordMismatch}</p>
              )}
            </div>
            <button type="submit" disabled={loading || registrationDone}
              className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-2xl hover:bg-[#2d7a4f] transition flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {registrationDone ? 'تم إنشاء الحساب' : t.signUp}
            </button>
            <p className="text-center text-sm text-stone-500">
              {t.alreadyHaveAccount}{' '}
              <button type="button" onClick={() => setTab('login')} className="text-[#1a5c38] font-semibold hover:underline">
                {t.signIn}
              </button>
            </p>
          </form>
        )}
      </div>

      {showEmailConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
              <MailCheck size={32} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">تم إنشاء الحساب</h3>
            <p className="text-sm text-stone-600 mb-2 leading-relaxed">
              {t.checkEmail}
            </p>
            <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2 mb-5 truncate">
              {pendingEmail}
            </p>

            {/* Resend button with countdown */}
            <button
              onClick={handleResendConfirmation}
              disabled={resendCooldown > 0 || resending}
              className="w-full mb-3 border-2 border-[#1a5c38] text-[#1a5c38] font-semibold py-2.5 rounded-2xl text-sm hover:bg-[#f0f7f3] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? <><Loader2 size={15} className="animate-spin" /> جارٍ الإرسال...</>
                : resendCooldown > 0
                  ? <><RefreshCw size={15} /> {t.resendVerification} {resendCooldown}ث</>
                  : <><Send size={15} /> {t.resendVerification}</>
              }
            </button>

            <button onClick={() => { setShowEmailConfirmation(false); setTab('login'); }}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2">
              حسناً، سأتحقق من بريدي
            </button>
            <button onClick={() => { setShowEmailConfirmation(false); onClose(); }}
              className="w-full text-stone-500 text-sm py-2 hover:text-stone-700 transition">
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
