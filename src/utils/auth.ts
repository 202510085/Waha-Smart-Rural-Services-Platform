import { supabase } from '../lib/supabase';

export type UserType = 'individual' | 'farmer' | 'seller' | 'volunteer' | 'service';

export const USER_TYPE_LABELS: Record<UserType, string> = {
  individual: 'فرد',
  farmer: 'مزارع',
  seller: 'بائع',
  volunteer: 'متطوع',
  service: 'جهة خدمية',
};

export const LOCATIONS = ['القوع', 'العين', 'سويحان', 'المنطقة الشرقية'] as const;

export interface Profile {
  id: string;
  fullName: string;
  phone: string;
  whatsappEnabled: boolean;
  email?: string;
  location: string;
  userType: UserType;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneVerificationMethod: string;
  avatarUrl?: string;
}

export type AccountLevel = 'visitor' | 'incomplete' | 'email_verified' | 'fully_verified';

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name || '',
    phone: row.phone || '',
    whatsappEnabled: row.whatsapp_enabled ?? false,
    email: row.email || undefined,
    location: row.location || 'القوع',
    userType: (row.user_type as UserType) || 'individual',
    emailVerified: row.email_verified ?? false,
    phoneVerified: row.phone_verified ?? false,
    phoneVerificationMethod: row.phone_verification_method || 'demo',
    avatarUrl: row.avatar_url || undefined,
  };
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit') || m.includes('email rate limit')) {
    return 'تم تجاوز حد إرسال رسائل التحقق عبر البريد الإلكتروني. يرجى الانتظار لمدة ساعة تقريبًا ثم المحاولة مرة أخرى، أو استخدام بريد إلكتروني آخر.';
  }
  if (m.includes('user already registered') || m.includes('already been registered') || m.includes('already registered')) {
    return 'هذا البريد الإلكتروني مسجل مسبقًا. يرجى تسجيل الدخول بدلاً من ذلك.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'البريد الإلكتروني غير صالح.';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (m.includes('email not confirmed')) {
    return 'البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك الإلكتروني.';
  }
  if (m.includes('password') && (m.includes('short') || m.includes('weak'))) {
    return 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.';
  }
  return msg;
}

export function getAccountLevel(profile: Profile | null): AccountLevel {
  if (!profile) return 'visitor';
  if (!profile.emailVerified) return 'incomplete';
  if (!profile.phoneVerified) return 'email_verified';
  return 'fully_verified';
}

export const ACCOUNT_LEVEL_LABELS: Record<AccountLevel, string> = {
  visitor: 'زائر',
  incomplete: 'حساب غير مكتمل',
  email_verified: 'موثق بالبريد',
  fully_verified: 'موثق بالكامل',
};

export async function signUp(
  email: string,
  password: string,
  profileData: {
    fullName: string;
    phone: string;
    whatsappEnabled: boolean;
    location: string;
    userType: UserType;
  }
): Promise<{ error: string | null; profile: Profile | null; needsEmailConfirmation: boolean; isRateLimit: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const translated = translateAuthError(error.message);
    const isRateLimit = error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('over_email_send_rate_limit');
    return { error: translated, profile: null, needsEmailConfirmation: false, isRateLimit };
  }

  if (!data.user) {
    return { error: 'فشل إنشاء الحساب، حاول مرة أخرى.', profile: null, needsEmailConfirmation: false, isRateLimit: false };
  }

  // When identities is empty, the email is already registered (Supabase fake-success)
  if (data.user.identities?.length === 0) {
    return {
      error: 'هذا البريد الإلكتروني مسجل مسبقًا. يرجى تسجيل الدخول أو استخدام بريد آخر.',
      profile: null,
      needsEmailConfirmation: false,
      isRateLimit: false,
    };
  }

  // Avoid duplicate profile if user retried after a previous partial success
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: profileData.fullName,
      phone: profileData.phone,
      whatsapp_enabled: profileData.whatsappEnabled,
      email,
      location: profileData.location,
      user_type: profileData.userType,
      email_verified: false,
      phone_verified: false,
      phone_verification_method: 'demo',
    });
    if (profileError) {
      return { error: translateAuthError(profileError.message), profile: null, needsEmailConfirmation: false, isRateLimit: false };
    }
  }

  return { error: null, profile: null, needsEmailConfirmation: true, isRateLimit: false };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error: string | null; profile: Profile | null; needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message), profile: null, needsEmailConfirmation: false };
  if (!data.user) return { error: 'فشل تسجيل الدخول', profile: null, needsEmailConfirmation: false };

  const profile = await fetchProfile(data.user.id);
  if (!profile) return { error: 'لم يتم العثور على الملف الشخصي', profile: null, needsEmailConfirmation: false };

  if (data.user.email_confirmed_at && !profile.emailVerified) {
    await supabase.from('profiles').update({ email_verified: true }).eq('id', data.user.id);
    profile.emailVerified = true;
  }

  const needsConfirmation = !profile.emailVerified;
  return { error: null, profile, needsEmailConfirmation: needsConfirmation };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'fullName' | 'phone' | 'whatsappEnabled' | 'email' | 'location' | 'userType'>>
): Promise<Profile | null> {
  const dbUpdates: any = {};
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.whatsappEnabled !== undefined) dbUpdates.whatsapp_enabled = updates.whatsappEnabled;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export async function resendEmailVerification(): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'لم يتم العثور على البريد الإلكتروني' };
  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
  if (error) return { error: translateAuthError(error.message) };
  return { error: null };
}

export async function resendSignupConfirmation(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) return { error: translateAuthError(error.message) };
  return { error: null };
}

export async function sendPhoneOtp(_phone: string): Promise<{ error: string | null; demoCode: string | null }> {
  return { error: null, demoCode: '123456' };
}

export async function verifyPhoneOtp(
  _phone: string,
  token: string,
  userId: string,
): Promise<{ error: string | null; profile: Profile | null }> {
  if (token !== '123456') {
    return { error: 'رمز التحقق غير صحيح', profile: null };
  }

  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      phone_verification_method: 'demo',
    })
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (updateError || !data) return { error: 'فشل تحديث حالة التحقق', profile: null };
  return { error: null, profile: mapProfile(data) };
}

export async function checkEmailVerified(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const isVerified = !!user.email_confirmed_at;
  if (isVerified) {
    await supabase.from('profiles').update({ email_verified: true }).eq('id', userId);
  }
  return isVerified;
}

export { supabase };

