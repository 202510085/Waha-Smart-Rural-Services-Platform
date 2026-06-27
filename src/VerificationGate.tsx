import { X, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Profile } from './utils/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  requirement: 'email' | 'phone' | 'email_or_phone';
  profile: Profile | null;
  onGoToAccount: () => void;
}

export default function VerificationGate({ open, onClose, requirement, profile, onGoToAccount }: Props) {
  if (!open) return null;

  const needsEmail = requirement === 'email' || (requirement === 'email_or_phone' && !profile?.emailVerified);
  const needsPhone = requirement === 'phone' || (requirement === 'email_or_phone' && profile?.emailVerified && !profile?.phoneVerified);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-stone-100">
          <X size={20} className="text-stone-400" />
        </button>
        <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert size={32} className="text-amber-600" />
        </div>

        {needsEmail && (
          <>
            <h3 className="font-bold text-lg text-stone-800 mb-2">يرجى تأكيد بريدك الإلكتروني أولاً</h3>
            <p className="text-sm text-stone-600 mb-5">
              يجب تأكيد بريدك الإلكتروني قبل استخدام هذه الميزة. توجه إلى صفحة حسابي لإعادة إرسال رابط التحقق.
            </p>
          </>
        )}

        {needsPhone && !needsEmail && (
          <>
            <h3 className="font-bold text-lg text-stone-800 mb-2">يرجى تأكيد رقم الجوال أولاً</h3>
            <p className="text-sm text-stone-600 mb-5">
              يجب تأكيد رقم جوالك قبل استخدام هذه الميزة. توجه إلى صفحة حسابي لإكمال التحقق.
            </p>
          </>
        )}

        <button onClick={() => { onClose(); onGoToAccount(); }}
          className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2 flex items-center justify-center gap-2">
          <ShieldCheck size={18} /> الذهاب إلى حسابي
        </button>
        <button onClick={onClose}
          className="w-full text-stone-500 text-sm py-2 hover:text-stone-700 transition">
          إلغاء
        </button>
      </div>
    </div>
  );
}

export function canPerformAction(profile: Profile | null, action: 'add_report' | 'add_announcement' | 'add_product' | 'add_ride' | 'bid' | 'contact'): { allowed: boolean; requirement: 'email' | 'phone' | 'email_or_phone' | null } {
  if (!profile) return { allowed: false, requirement: null };

  const emailOk = profile.emailVerified;
  const phoneOk = profile.phoneVerified;

  switch (action) {
    case 'add_report':
    case 'add_announcement':
      return { allowed: emailOk, requirement: emailOk ? null : 'email' };
    case 'add_product':
    case 'add_ride':
    case 'bid':
      return { allowed: emailOk && phoneOk, requirement: !emailOk ? 'email' : !phoneOk ? 'phone' : null };
    case 'contact':
      return { allowed: true, requirement: null };
    default:
      return { allowed: false, requirement: null };
  }
}
