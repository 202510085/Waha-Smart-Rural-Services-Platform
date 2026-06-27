import { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon, Phone, MapPin, LogOut, Edit, X, CheckCircle2,
  Package, Flag, Megaphone, Stethoscope, Sprout, MessageCircle, Car, Loader2,
  Mail, MailCheck, MailWarning, PhoneCall, ShieldCheck, ShieldAlert, KeyRound, Send,
  Calendar, Clock, Trash2, ImagePlus, Plus, Camera, Gavel, BarChart2, TicketCheck,
} from 'lucide-react';
import {
  type Profile, type UserType, USER_TYPE_LABELS, LOCATIONS,
  updateProfile, signOut, resendEmailVerification, sendPhoneOtp, verifyPhoneOtp,
  getAccountLevel, ACCOUNT_LEVEL_LABELS,
} from './utils/auth';
import {
  fetchMyProducts, fetchMyReports, fetchMyAnnouncements,
  fetchMyHealthRequests, fetchMyAgriRequests, fetchMyRideRequests,
  updateAnnouncement, deleteAnnouncement, uploadAnnouncementImage,
  fetchMyEvents, deleteEvent,
  updateProduct, deleteProduct, uploadProfileImage, updateAvatarUrl,
  uploadOptionalImage, handleSupabaseError, fetchProductBids, endAuction,
  fetchMyRegistrations,
} from './lib/data';
import { ANNOUNCEMENT_CATEGORIES, MARKET_UNITS, PRODUCT_TYPES } from './storage';
import { openCall, openWhatsApp } from './utils/location';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile;
  onLogout: () => void;
  onToast: (msg: string) => void;
  onProfileUpdate: (profile: Profile) => void;
}

interface AnnouncementRow {
  id: string;
  title: string;
  category: string | null;
  event_date: string | null;
  event_time: string | null;
  description: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_whatsapp_enabled: boolean | null;
  image_url: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  title: string;
  category: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  description: string | null;
  owner_phone: string | null;
  owner_whatsapp_enabled: boolean | null;
  image_url: string | null;
  created_at: string;
}

interface ProductRow {
  id: string;
  title: string;
  category: string | null;
  price: string | null;
  unit: string | null;
  description: string | null;
  location: string | null;
  image_url: string | null;
  is_auction: boolean | null;
  current_bid: number | null;
  bid_increment: number | null;
  auction_end_time: string | null;
  auction_status: string | null;
  status: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'ديني': 'bg-emerald-100 text-emerald-700',
  'تدريبي': 'bg-blue-100 text-blue-700',
  'اجتماعي': 'bg-amber-100 text-amber-700',
  'صحي': 'bg-rose-100 text-rose-700',
  'زراعي': 'bg-lime-100 text-lime-700',
  'سوق': 'bg-orange-100 text-orange-700',
  'وطني': 'bg-red-100 text-red-700',
  'تعليمي': 'bg-sky-100 text-sky-700',
  'قرآني': 'bg-teal-100 text-teal-700',
};

export default function AccountView({ user, onLogout, onToast, onProfileUpdate }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    fullName: user.fullName, phone: user.phone, whatsappEnabled: user.whatsappEnabled,
    email: user.email || '', location: user.location, userType: user.userType,
  });

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code_sent'>('idle');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // My content
  const [myAnnouncements, setMyAnnouncements] = useState<AnnouncementRow[]>([]);
  const [myProducts, setMyProducts] = useState<ProductRow[]>([]);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [myHealthRequests, setMyHealthRequests] = useState<any[]>([]);
  const [myAgriRequests, setMyAgriRequests] = useState<any[]>([]);
  const [myRideRequests, setMyRideRequests] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<EventRow[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);

  // Announcement edit/delete state
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRow | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<AnnouncementRow | null>(null);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementDeleting, setAnnouncementDeleting] = useState(false);
  const [editAnnouncementForm, setEditAnnouncementForm] = useState({
    title: '', category: 'اجتماعي', eventDate: '', eventTime: '',
    description: '', ownerPhone: '', ownerWhatsapp: false,
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Event CRUD state
  const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null);
  const [eventDeleting, setEventDeleting] = useState(false);

  // Product CRUD state
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [productDeleting, setProductDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [editProductForm, setEditProductForm] = useState({
    title: '', category: 'تمر', price: '', unit: 'كيلو', description: '', location: '',
  });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const productImageRef = useRef<HTMLInputElement>(null);

  // Auction management
  const [productBidCounts, setProductBidCounts] = useState<Record<string, { count: number; highest: number }>>({});
  const [endingAuction, setEndingAuction] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [announcements, products, reports, health, agri, rides, events, registrations] = await Promise.all([
        fetchMyAnnouncements(user.id),
        fetchMyProducts(user.id),
        fetchMyReports(user.id),
        fetchMyHealthRequests(user.id),
        fetchMyAgriRequests(user.id),
        fetchMyRideRequests(user.id),
        fetchMyEvents(user.id),
        fetchMyRegistrations(user.id),
      ]);
      if (cancelled) return;
      setMyAnnouncements(announcements as AnnouncementRow[]);
      setMyProducts(products);
      setMyReports(reports);
      setMyHealthRequests(health);
      setMyAgriRequests(agri);
      setMyRideRequests(rides);
      setMyEvents(events as EventRow[]);
      setMyRegistrations(registrations);

      // Fetch bid counts for auction products
      const bidStats: Record<string, { count: number; highest: number }> = {};
      await Promise.all(
        (products as ProductRow[])
          .filter((p) => p.is_auction)
          .map(async (p) => {
            try {
              const bids = await fetchProductBids(p.id);
              bidStats[p.id] = {
                count: bids.length,
                highest: bids.length > 0 ? Math.max(...bids.map((b: any) => b.bid_amount)) : (p.current_bid || 0),
              };
            } catch {
              bidStats[p.id] = { count: 0, highest: p.current_bid || 0 };
            }
          })
      );
      if (!cancelled) setProductBidCounts(bidStats);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateProfile(user.id, {
      fullName: editForm.fullName,
      phone: editForm.phone,
      whatsappEnabled: editForm.whatsappEnabled,
      email: editForm.email || undefined,
      location: editForm.location,
      userType: editForm.userType,
    });
    if (updated) {
      onProfileUpdate(updated);
      onToast('تم حفظ بياناتك');
      setEditing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
    onToast(t.signOutSuccess);
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    const { error } = await resendEmailVerification();
    setResendingEmail(false);
    if (error) {
      onToast('تعذر إرسال الرابط: ' + error);
    } else {
      onToast('تم إعادة إرسال رابط التحقق إلى بريدك');
    }
  };

  const handleSendPhoneCode = async () => {
    if (!user.phone.trim()) {
      onToast('يرجى إدخال رقم الجوال أولاً');
      return;
    }
    setPhoneSending(true);
    const { error, demoCode } = await sendPhoneOtp(user.phone);
    setPhoneSending(false);
    if (error) {
      onToast('تعذر إرسال الرمز: ' + error);
      return;
    }
    onToast(`رمز التحقق المؤقت للعرض التجريبي هو: ${demoCode || '123456'}`);
    setPhoneStep('code_sent');
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode.trim()) {
      onToast('يرجى إدخال رمز التحقق');
      return;
    }
    setPhoneVerifying(true);
    const { error, profile } = await verifyPhoneOtp(user.phone, phoneCode, user.id);
    setPhoneVerifying(false);
    if (error) {
      onToast(error);
      return;
    }
    if (profile) {
      onProfileUpdate(profile);
      onToast('تم تأكيد رقم الجوال بنجاح');
      setPhoneStep('idle');
      setPhoneCode('');
    }
  };

  // Announcement edit handlers
  const openEditAnnouncement = (a: AnnouncementRow) => {
    setEditingAnnouncement(a);
    setEditAnnouncementForm({
      title: a.title,
      category: a.category || 'اجتماعي',
      eventDate: a.event_date || '',
      eventTime: a.event_time || '',
      description: a.description || '',
      ownerPhone: a.owner_phone || '',
      ownerWhatsapp: a.owner_whatsapp_enabled ?? false,
    });
    setNewImageFile(null);
    setNewImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editAnnouncementForm.title.trim()) return;
    setAnnouncementSaving(true);
    try {
      let imageUrl: string | undefined = undefined;
      if (newImageFile) {
        imageUrl = await uploadAnnouncementImage(user.id, newImageFile);
      }
      const updated = await updateAnnouncement(editingAnnouncement.id, {
        title: editAnnouncementForm.title,
        category: editAnnouncementForm.category,
        eventDate: editAnnouncementForm.eventDate || null,
        eventTime: editAnnouncementForm.eventTime || null,
        description: editAnnouncementForm.description,
        ownerPhone: editAnnouncementForm.ownerPhone,
        ownerWhatsappEnabled: editAnnouncementForm.ownerWhatsapp,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      });
      if (updated) {
        setMyAnnouncements((prev) =>
          prev.map((a) => a.id === editingAnnouncement.id ? (updated as AnnouncementRow) : a)
        );
      }
      onToast('تم تحديث المنشور بنجاح');
      setEditingAnnouncement(null);
      setNewImageFile(null);
      setNewImagePreview(null);
    } catch {
      onToast('تعذر تحديث المنشور، حاول مرة أخرى');
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnouncement) return;
    setAnnouncementDeleting(true);
    try {
      await deleteAnnouncement(deletingAnnouncement.id);
      setMyAnnouncements((prev) => prev.filter((a) => a.id !== deletingAnnouncement.id));
      onToast('تم حذف المنشور بنجاح');
      setDeletingAnnouncement(null);
    } catch {
      onToast('تعذر حذف المنشور، حاول مرة أخرى');
    } finally {
      setAnnouncementDeleting(false);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!deletingEvent) return;
    setEventDeleting(true);
    try {
      await deleteEvent(deletingEvent.id);
      setMyEvents((prev) => prev.filter((ev) => ev.id !== deletingEvent.id));
      onToast('تم حذف الفعالية');
      setDeletingEvent(null);
    } catch {
      onToast('تعذر الحذف، حاول مرة أخرى');
    } finally {
      setEventDeleting(false);
    }
  };

  const openEditProduct = (p: ProductRow) => {
    setEditingProduct(p);
    setEditProductForm({
      title: p.title,
      category: p.category || 'تمر',
      price: p.price || '',
      unit: p.unit || 'كيلو',
      description: p.description || '',
      location: p.location || '',
    });
    setProductImageFile(null);
    setProductImagePreview(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProductForm.title.trim()) return;
    setProductSaving(true);
    try {
      let imageUrl: string | undefined;
      if (productImageFile) {
        const url = await uploadOptionalImage('product-images', productImageFile, user.id);
        if (url) { imageUrl = url; }
        else { onToast('تعذر رفع الصورة، سيتم الحفظ بدونها'); }
      }
      const updated = await updateProduct(editingProduct.id, {
        title: editProductForm.title,
        category: editProductForm.category,
        price: editProductForm.price || 'حسب الاتفاق',
        unit: editProductForm.unit,
        description: editProductForm.description,
        location: editProductForm.location,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      });
      if (updated) {
        setMyProducts((prev) => prev.map((p) => p.id === editingProduct.id ? (updated as ProductRow) : p));
      }
      onToast('تم تحديث المنتج بنجاح');
      setEditingProduct(null);
      setProductImageFile(null);
      setProductImagePreview(null);
    } catch (err) {
      console.error('[AccountView] product update failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setProductSaving(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setProductDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      setMyProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      onToast('تم حذف المنتج');
      setDeletingProduct(null);
    } catch {
      onToast('تعذر حذف المنتج، حاول مرة أخرى');
    } finally {
      setProductDeleting(false);
    }
  };

  const handleEndAuction = async (productId: string) => {
    setEndingAuction(productId);
    try {
      await endAuction(productId, true);
      setMyProducts((prev) => prev.map((p) => p.id === productId ? { ...p, auction_status: 'closed_by_seller' } : p));
      onToast('تم إغلاق المزاد بنجاح');
    } catch (err) {
      console.error('[AccountView] end auction failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setEndingAuction(null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadProfileImage(user.id, file);
      await updateAvatarUrl(user.id, url);
      onProfileUpdate({ ...user, avatarUrl: url } as any);
      onToast('تم تحديث الصورة الشخصية بنجاح');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      onToast('تعذر رفع الصورة الشخصية، حاول مرة أخرى');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const accountLevel = getAccountLevel(user);

  const otherSections = [
    { label: t.myReports, icon: Flag, count: myReports.length, items: myReports.map((r) => r.description), color: 'orange' },
    { label: 'طلباتي الصحية', icon: Stethoscope, count: myHealthRequests.length, items: myHealthRequests.map((c) => c.symptoms), color: 'rose' },
    { label: 'طلباتي الزراعية', icon: Sprout, count: myAgriRequests.length, items: myAgriRequests.map((a) => `${a.crop_type} - ${a.problem_description}`), color: 'emerald' },
    { label: 'طلبات النقل', icon: Car, count: myRideRequests.length, items: myRideRequests.map((t) => `${t.from_location} ← ${t.to_location}`), color: 'purple' },
  ];

  const sectionColors: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="bg-gradient-to-l from-[#1a5c38] to-[#2d7a4f] text-white rounded-3xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {(user as any).avatarUrl ? (
                <img src={(user as any).avatarUrl} alt={user.fullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#c8b97a]" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#c8b97a] flex items-center justify-center">
                  <UserIcon size={32} className="text-[#1a5c38]" />
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow border border-stone-200 hover:bg-stone-50 transition disabled:opacity-60"
                title="تغيير الصورة الشخصية">
                {uploadingAvatar ? <Loader2 size={13} className="animate-spin text-stone-600" /> : <Camera size={13} className="text-stone-600" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.fullName}</h2>
              <p className="text-white/80 text-sm">{USER_TYPE_LABELS[user.userType]}</p>
              <span className="inline-block mt-1 text-xs bg-white/15 px-2.5 py-0.5 rounded-full">
                {ACCOUNT_LEVEL_LABELS[accountLevel]}
              </span>
            </div>
          </div>
          <button onClick={handleLogout}
            className="bg-white/15 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 hover:bg-white/25 transition">
            <LogOut size={16} /> {t.signOut}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <Phone size={16} className="text-[#c8b97a]" />
            <div>
              <p className="text-xs text-white/70">رقم الهاتف</p>
              <p className="text-sm font-semibold">{user.phone}</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#c8b97a]" />
            <div>
              <p className="text-xs text-white/70">واتساب</p>
              <p className="text-sm font-semibold">{user.whatsappEnabled ? 'متوفر' : 'غير متوفر'}</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <MapPin size={16} className="text-[#c8b97a]" />
            <div>
              <p className="text-xs text-white/70">المنطقة</p>
              <p className="text-sm font-semibold">{user.location}</p>
            </div>
          </div>
          {user.email && (
            <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
              <Mail size={16} className="text-[#c8b97a]" />
              <div>
                <p className="text-xs text-white/70">البريد</p>
                <p className="text-sm font-semibold truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setEditing(true)}
          className="mt-4 bg-[#c8b97a] text-[#1a5c38] font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#d4c789] transition flex items-center gap-2">
          <Edit size={16} /> تعديل البيانات
        </button>
      </div>

      {/* Verification status card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#1a5c38]" /> حالة التحقق
        </h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {/* Email verification */}
          <div className={`border rounded-2xl p-4 ${user.emailVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {user.emailVerified ? (
                <MailCheck size={20} className="text-emerald-600" />
              ) : (
                <MailWarning size={20} className="text-amber-600" />
              )}
              <h4 className="font-bold text-stone-800 text-sm">البريد الإلكتروني</h4>
            </div>
            <p className={`text-sm font-semibold mb-2 ${user.emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {user.emailVerified ? 'موثق' : 'غير موثق'}
            </p>
            {!user.emailVerified && (
              <button onClick={handleResendEmail} disabled={resendingEmail}
                className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-amber-600 transition flex items-center gap-1.5 disabled:opacity-50">
                {resendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                إعادة إرسال رابط التحقق
              </button>
            )}
          </div>

          {/* Phone verification */}
          <div className={`border rounded-2xl p-4 ${user.phoneVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall size={20} className={user.phoneVerified ? 'text-emerald-600' : 'text-amber-600'} />
              <h4 className="font-bold text-stone-800 text-sm">رقم الجوال</h4>
            </div>
            <p className={`text-sm font-semibold ${user.phoneVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {user.phoneVerified ? 'موثق' : 'غير موثق'}
            </p>
          </div>
        </div>

        {/* Account level badge */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-3">
          <ShieldAlert size={18} className={accountLevel === 'fully_verified' ? 'text-emerald-600' : accountLevel === 'email_verified' ? 'text-blue-600' : 'text-amber-600'} />
          <div>
            <p className="text-xs text-stone-500">مستوى الحساب</p>
            <p className="text-sm font-bold text-stone-800">{ACCOUNT_LEVEL_LABELS[accountLevel]}</p>
          </div>
        </div>
      </div>

      {/* Phone verification section */}
      {!user.phoneVerified && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
            <KeyRound size={20} className="text-purple-600" /> تحقق رقم الجوال
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">رقم الجوال</label>
              <input type="tel" value={user.phone} readOnly
                className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm text-stone-700" />
            </div>

            {phoneStep === 'idle' && (
              <button onClick={handleSendPhoneCode} disabled={phoneSending}
                className="w-full bg-purple-500 text-white font-bold py-3 rounded-2xl hover:bg-purple-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {phoneSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                إرسال رمز التحقق
              </button>
            )}

            {phoneStep === 'code_sent' && (
              <>
                {/* Demo OTP notice — prominent for judges/testers */}
                <div className="bg-yellow-400 border-2 border-yellow-500 rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-yellow-900 mb-1">رمز التحقق المؤقت للعرض التجريبي هو:</p>
                  <p className="text-4xl font-extrabold tracking-[0.3em] text-yellow-900 my-2">123456</p>
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    ملاحظة: هذا الرمز مؤقت ومخصص لنسخة الهاكاثون فقط. في النسخة النهائية سيتم إرسال رمز تحقق حقيقي عبر SMS.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">رمز التحقق</label>
                  <input type="text" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="أدخل الرمز المرسل" maxLength={6}
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <button onClick={handleVerifyPhone} disabled={phoneVerifying}
                  className="w-full bg-emerald-500 text-white font-bold py-3 rounded-2xl hover:bg-emerald-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {phoneVerifying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  تحقق
                </button>
                <button onClick={() => { setPhoneStep('idle'); setPhoneCode(''); }}
                  className="w-full text-stone-500 text-sm py-2 hover:text-stone-700 transition">
                  رجوع
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* My Announcements section - full CRUD */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-stone-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
          <div className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" /> {t.myAnnouncements}
              </h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {myAnnouncements.length}
              </span>
            </div>

            {myAnnouncements.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Megaphone size={28} className="text-blue-400" />
                </div>
                <p className="text-stone-500 text-sm mb-4">لا توجد منشورات حتى الآن</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('waaha:navigate', { detail: 'announcements' }))}
                  className="inline-flex items-center gap-2 bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-blue-600 transition">
                  <Plus size={16} /> نشر إعلان جديد
                </button>
              </div>
            ) : (
              <div className="divide-y divide-blue-100">
                {myAnnouncements.map((a) => (
                  <div key={a.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[a.category || ''] || 'bg-stone-100 text-stone-600'}`}>
                            {a.category}
                          </span>
                          <h4 className="font-bold text-stone-800 text-sm">{a.title}</h4>
                        </div>
                        {a.description && a.description !== a.title && (
                          <p className="text-xs text-stone-600 mt-1 line-clamp-2">{a.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-1.5">
                          {a.event_date && (
                            <span className="flex items-center gap-1"><Calendar size={11} /> {a.event_date}</span>
                          )}
                          {a.event_time && (
                            <span className="flex items-center gap-1"><Clock size={11} /> {a.event_time}</span>
                          )}
                          <span className="text-stone-400">{new Date(a.created_at).toLocaleDateString('ar-AE')}</span>
                        </div>
                      </div>
                      {a.image_url && (
                        <img src={a.image_url} alt={a.title}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-stone-100" />
                      )}
                    </div>

                    {/* Contact + action buttons */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {a.owner_phone && (
                        <>
                          <button onClick={() => openCall(a.owner_phone!)}
                            className="text-xs font-semibold bg-[#1a5c38] text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-[#2d7a4f] transition">
                            <Phone size={11} /> اتصال
                          </button>
                          {a.owner_whatsapp_enabled && (
                            <button onClick={() => openWhatsApp(a.owner_phone!, `السلام عليكم، شفت إعلانك في منصة واحة.`)}
                              className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-600 transition">
                              <MessageCircle size={11} /> واتساب
                            </button>
                          )}
                        </>
                      )}
                      <div className="flex-1" />
                      <button onClick={() => openEditAnnouncement(a)}
                        className="text-xs font-semibold bg-amber-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-amber-600 transition">
                        <Edit size={11} /> تعديل
                      </button>
                      <button onClick={() => setDeletingAnnouncement(a)}
                        className="text-xs font-semibold bg-red-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-red-600 transition">
                        <Trash2 size={11} /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Events section */}
          <div className="bg-white border border-violet-200 rounded-2xl overflow-hidden">
            <div className="bg-violet-50 border-b border-violet-200 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Calendar size={20} className="text-violet-600" /> فعالياتي
              </h3>
              <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {myEvents.length}
              </span>
            </div>
            {myEvents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-3">
                  <Calendar size={28} className="text-violet-400" />
                </div>
                <p className="text-stone-500 text-sm mb-4">لا توجد فعاليات منشورة</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('waaha:navigate', { detail: 'events' }))}
                  className="inline-flex items-center gap-2 bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-violet-600 transition">
                  <Plus size={16} /> أضف فعالية جديدة
                </button>
              </div>
            ) : (
              <div className="divide-y divide-violet-100">
                {myEvents.map((ev) => (
                  <div key={ev.id} className="p-4 flex items-start gap-3">
                    {ev.image_url && (
                      <img src={ev.image_url} alt={ev.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-stone-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {ev.category && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">
                            {ev.category}
                          </span>
                        )}
                        <h4 className="font-bold text-stone-800 text-sm">{ev.title}</h4>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-stone-600 line-clamp-2 mb-1">{ev.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 text-xs text-stone-500">
                        {ev.event_date && <span className="flex items-center gap-1"><Calendar size={11} /> {ev.event_date}</span>}
                        {ev.event_time && <span className="flex items-center gap-1"><Clock size={11} /> {ev.event_time}</span>}
                        {ev.location && <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>}
                      </div>
                    </div>
                    <button onClick={() => setDeletingEvent(ev)}
                      className="text-xs font-semibold bg-red-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-red-600 transition flex-shrink-0">
                      <Trash2 size={11} /> حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Event Registrations section */}
          <div className="bg-white dark:bg-[#1a2e21] border border-[#c6e8d6] dark:border-[#2d4a35] rounded-2xl overflow-hidden">
            <div className="bg-[#f0f9f4] dark:bg-[#0f1f14] border-b border-[#c6e8d6] dark:border-[#2d4a35] px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] flex items-center gap-2">
                <TicketCheck size={20} className="text-[#1a5c38] dark:text-[#6abf8a]" /> تسجيلاتي في الفعاليات
              </h3>
              <span className="bg-[#1a5c38]/10 dark:bg-[#1a5c38]/30 text-[#1a5c38] dark:text-[#6abf8a] text-xs font-bold px-2.5 py-1 rounded-full">
                {myRegistrations.length}
              </span>
            </div>
            {myRegistrations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#f0f9f4] dark:bg-[#0f1f14] flex items-center justify-center mx-auto mb-3">
                  <TicketCheck size={28} className="text-[#1a5c38]/40 dark:text-[#6abf8a]/40" />
                </div>
                <p className="text-stone-500 dark:text-stone-400 text-sm">لا توجد تسجيلات في فعاليات بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-[#c6e8d6] dark:divide-[#2d4a35]">
                {myRegistrations.map((reg) => {
                  const ev = reg.events;
                  return (
                    <div key={reg.id} className="p-4">
                      <div className="flex items-start gap-3">
                        {ev?.image_url && (
                          <img src={ev.image_url} alt={ev?.title || ''}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-[#2d4a35]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm line-clamp-1">
                            {ev?.title || 'فعالية محذوفة'}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 mt-1">
                            {ev?.event_date && (
                              <span className="flex items-center gap-1"><Calendar size={10} /> {ev.event_date}</span>
                            )}
                            {ev?.location && (
                              <span className="flex items-center gap-1"><MapPin size={10} /> {ev.location}</span>
                            )}
                            <span className="flex items-center gap-1">حضور: {reg.attendees_count}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#f0f9f4] dark:bg-[#0f1f14] text-[#1a5c38] dark:text-[#6abf8a] border border-[#c6e8d6] dark:border-[#2d4a35] font-mono font-semibold">
                              <TicketCheck size={10} /> {reg.registration_code}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Products section - full CRUD */}
          <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Package size={20} className="text-amber-600" /> {t.myProducts2}
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {myProducts.length}
              </span>
            </div>
            {myProducts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <Package size={28} className="text-amber-400" />
                </div>
                <p className="text-stone-500 text-sm mb-4">لا توجد منتجات منشورة</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('waaha:navigate', { detail: 'market' }))}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-amber-600 transition">
                  <Plus size={16} /> أضف منتجاً
                </button>
              </div>
            ) : (
              <div className="divide-y divide-amber-100 dark:divide-[#2d4a35]">
                {myProducts.map((p) => {
                  const bidInfo = productBidCounts[p.id];
                  const isAuctionEnded = p.auction_status === 'ended' || p.auction_status === 'closed_by_seller' || (p.auction_end_time ? new Date(p.auction_end_time).getTime() < Date.now() : false);
                  return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.title}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-[#2d4a35]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {p.category && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {p.category}
                            </span>
                          )}
                          {p.is_auction && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isAuctionEnded ? 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                              {isAuctionEnded ? (p.auction_status === 'closed_by_seller' ? 'أُغلق' : 'انتهى') : 'مزاد نشط'}
                            </span>
                          )}
                          <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm">{p.title}</h4>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {p.price ? `${p.price} درهم / ${p.unit || ''}` : 'حسب الاتفاق'}
                          {p.location ? ` · ${p.location}` : ''}
                        </p>
                        {p.is_auction && bidInfo && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                            <span className="flex items-center gap-1"><Gavel size={10} /> {bidInfo.count} مزايدة</span>
                            {bidInfo.highest > 0 && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                <BarChart2 size={10} /> أعلى: {bidInfo.highest} درهم
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => openEditProduct(p)}
                        className="text-xs font-semibold bg-amber-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-amber-600 transition">
                        <Edit size={11} /> تعديل
                      </button>
                      {p.is_auction && !isAuctionEnded && (
                        <button onClick={() => handleEndAuction(p.id)} disabled={endingAuction === p.id}
                          className="text-xs font-semibold bg-orange-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-orange-600 transition disabled:opacity-60">
                          {endingAuction === p.id ? <Loader2 size={11} className="animate-spin" /> : <Gavel size={11} />} إغلاق المزاد
                        </button>
                      )}
                      <button onClick={() => setDeletingProduct(p)}
                        className="text-xs font-semibold bg-red-500 text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-red-600 transition">
                        <Trash2 size={11} /> حذف
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other sections - simple cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {otherSections.map((s) => (
              <div key={s.label} className={`border rounded-2xl p-4 ${sectionColors[s.color]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <s.icon size={18} /> {s.label}
                  </h3>
                  <span className="bg-white text-stone-700 text-xs font-bold px-2.5 py-1 rounded-full">{s.count}</span>
                </div>
                {s.items.length > 0 ? (
                  <div className="space-y-2">
                    {s.items.map((item, i) => (
                      <div key={i} className="bg-white/70 rounded-xl px-3 py-2 text-sm text-stone-700">
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">لا يوجد محتوى بعد</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1a5c38] text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={20} /> {t.editProfile}</h3>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الاسم الكامل</label>
                <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">رقم الهاتف</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">هل الرقم يدعم واتساب؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditForm({ ...editForm, whatsappEnabled: true })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition ${editForm.whatsappEnabled ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>نعم</button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, whatsappEnabled: false })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition ${!editForm.whatsappEnabled ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>لا</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">البريد الإلكتروني</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">المنطقة</label>
                <select value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40">
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">نوع المستخدم</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(USER_TYPE_LABELS) as UserType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setEditForm({ ...editForm, userType: t })}
                      className={`py-2 rounded-xl text-xs font-medium transition ${editForm.userType === t ? 'bg-[#1a5c38] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {USER_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit"
                className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-2xl hover:bg-[#2d7a4f] transition flex items-center justify-center gap-2 text-lg">
                <CheckCircle2 size={18} /> حفظ التغييرات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingAnnouncement(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={20} /> تعديل المنشور</h3>
              <button onClick={() => setEditingAnnouncement(null)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">عنوان الإعلان</label>
                <input type="text" value={editAnnouncementForm.title}
                  onChange={(e) => setEditAnnouncementForm({ ...editAnnouncementForm, title: e.target.value })}
                  required className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">التصنيف</label>
                <div className="grid grid-cols-3 gap-2">
                  {ANNOUNCEMENT_CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setEditAnnouncementForm({ ...editAnnouncementForm, category: c })}
                      className={`py-2 rounded-xl text-sm font-medium transition ${editAnnouncementForm.category === c ? 'bg-blue-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">التاريخ</label>
                  <input type="text" value={editAnnouncementForm.eventDate}
                    onChange={(e) => setEditAnnouncementForm({ ...editAnnouncementForm, eventDate: e.target.value })}
                    placeholder="مثال: الأحد القادم"
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">الوقت</label>
                  <input type="text" value={editAnnouncementForm.eventTime}
                    onChange={(e) => setEditAnnouncementForm({ ...editAnnouncementForm, eventTime: e.target.value })}
                    placeholder="مثال: 4 عصراً"
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الوصف</label>
                <textarea value={editAnnouncementForm.description}
                  onChange={(e) => setEditAnnouncementForm({ ...editAnnouncementForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">رقم التواصل</label>
                <input type="tel" value={editAnnouncementForm.ownerPhone}
                  onChange={(e) => setEditAnnouncementForm({ ...editAnnouncementForm, ownerPhone: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">هل الرقم يدعم واتساب؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditAnnouncementForm({ ...editAnnouncementForm, ownerWhatsapp: true })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${editAnnouncementForm.ownerWhatsapp ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>نعم</button>
                  <button type="button" onClick={() => setEditAnnouncementForm({ ...editAnnouncementForm, ownerWhatsapp: false })}
                    className={`py-2 rounded-xl text-sm font-medium transition ${!editAnnouncementForm.ownerWhatsapp ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>لا</button>
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الصورة</label>
                {(newImagePreview || editingAnnouncement.image_url) && (
                  <img
                    src={newImagePreview || editingAnnouncement.image_url!}
                    alt="صورة الإعلان"
                    className="w-full h-40 object-cover rounded-xl mb-2 border border-stone-200"
                  />
                )}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-blue-300 text-blue-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition text-sm">
                  <ImagePlus size={18} />
                  {newImageFile ? 'تغيير الصورة' : editingAnnouncement.image_url ? 'استبدال الصورة' : 'رفع صورة'}
                </button>
              </div>

              <button type="submit" disabled={announcementSaving}
                className="w-full bg-blue-500 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-600 transition flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {announcementSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingAnnouncement(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">هل أنت متأكد؟</h3>
            <p className="text-sm text-stone-600 mb-1">سيتم حذف هذا المنشور نهائياً:</p>
            <p className="text-sm font-semibold text-stone-800 mb-5 bg-stone-50 rounded-xl px-4 py-2">
              "{deletingAnnouncement.title}"
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeletingAnnouncement(null)}
                className="py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition">
                إلغاء
              </button>
              <button onClick={handleConfirmDelete} disabled={announcementDeleting}
                className="py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {announcementDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                حذف المنشور
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Event Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingEvent(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">هل أنت متأكد؟</h3>
            <p className="text-sm text-stone-600 mb-1">سيتم حذف هذه الفعالية نهائياً:</p>
            <p className="text-sm font-semibold text-stone-800 mb-5 bg-stone-50 rounded-xl px-4 py-2">
              "{deletingEvent.title}"
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeletingEvent(null)}
                className="py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition">
                إلغاء
              </button>
              <button onClick={handleConfirmDeleteEvent} disabled={eventDeleting}
                className="py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {eventDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                حذف الفعالية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-amber-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><Edit size={20} /> تعديل المنتج</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">اسم المنتج</label>
                <input type="text" value={editProductForm.title}
                  onChange={(e) => setEditProductForm({ ...editProductForm, title: e.target.value })}
                  required className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">نوع المنتج</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCT_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setEditProductForm({ ...editProductForm, category: t })}
                      className={`py-2 rounded-xl text-sm font-medium transition ${editProductForm.category === t ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">السعر</label>
                  <input type="text" value={editProductForm.price}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                    placeholder="مثال: 25"
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">الوحدة</label>
                  <select value={editProductForm.unit} onChange={(e) => setEditProductForm({ ...editProductForm, unit: e.target.value })}
                    className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {MARKET_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الموقع</label>
                <input type="text" value={editProductForm.location}
                  onChange={(e) => setEditProductForm({ ...editProductForm, location: e.target.value })}
                  className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الوصف</label>
                <textarea value={editProductForm.description}
                  onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">الصورة</label>
                {(productImagePreview || editingProduct.image_url) && (
                  <img
                    src={productImagePreview || editingProduct.image_url!}
                    alt="صورة المنتج"
                    className="w-full h-36 object-cover rounded-xl mb-2 border border-stone-200"
                  />
                )}
                <input ref={productImageRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProductImageFile(f); setProductImagePreview(URL.createObjectURL(f)); } }} />
                <button type="button" onClick={() => productImageRef.current?.click()}
                  className="w-full border-2 border-dashed border-amber-300 text-amber-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:border-amber-500 hover:bg-amber-50 transition text-sm">
                  <ImagePlus size={18} />
                  {productImageFile ? 'تغيير الصورة' : editingProduct.image_url ? 'استبدال الصورة' : 'رفع صورة'}
                </button>
              </div>
              <button type="submit" disabled={productSaving}
                className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-2xl hover:bg-amber-600 transition flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {productSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingProduct(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">هل أنت متأكد؟</h3>
            <p className="text-sm text-stone-600 mb-1">سيتم حذف هذا المنتج نهائياً:</p>
            <p className="text-sm font-semibold text-stone-800 mb-5 bg-stone-50 rounded-xl px-4 py-2">
              "{deletingProduct.title}"
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeletingProduct(null)}
                className="py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition">
                إلغاء
              </button>
              <button onClick={handleConfirmDeleteProduct} disabled={productDeleting}
                className="py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {productDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                حذف المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
