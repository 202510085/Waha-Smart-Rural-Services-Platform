import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBasket, Plus, X, Package, Phone, MessageCircle, MapPin, TrendingUp,
  Lock, Gavel, Loader2, Search, Camera, ImagePlus, Navigation, ChevronLeft,
  ChevronRight, Clock, User, ArrowUp, ArrowDown, SortAsc, Filter, BarChart2,
} from 'lucide-react';
import { MARKET_UNITS, PRODUCT_TYPES } from './storage';
import {
  openCall, openWhatsApp, openDirections, getCurrentLocation,
  formatDistance, calculateDistanceKm,
} from './utils/location';
import type { Profile } from './utils/auth';
import {
  fetchProducts, insertProduct, insertProductImages, placeBid, fetchProductBids,
  fetchProductImages, uploadOptionalImage, deleteProduct, handleSupabaseError, endAuction,
} from './lib/data';
import VerificationGate, { canPerformAction } from './VerificationGate';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
  onRequireLogin: () => void;
  onGoToAccount: () => void;
  assistantPrefill?: { action: string; prefill: Record<string, any>; nonce: number } | null;
}

interface ProductBid {
  id: string;
  product_id: string;
  user_id: string;
  bidder_name: string;
  bid_amount: number;
  created_at: string;
}

interface Product {
  id: string;
  user_id: string;
  title: string;
  category: string;
  price: string;
  unit: string;
  description: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  owner_name: string;
  owner_phone: string;
  owner_whatsapp_enabled: boolean;
  is_auction: boolean;
  current_bid: number | null;
  bid_increment: number | null;
  auction_end_time: string | null;
  auction_status: string | null;
  image_url?: string | null;
  created_at: string;
  status: string;
}

const CATEGORY_FILTERS = ['الكل', 'تمر', 'خضار', 'فواكه', 'عسل', 'مواشي', 'أدوات زراعية', 'منتجات منزلية', 'بيع', 'مزاد'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر الأقل' },
  { value: 'price_desc', label: 'السعر الأعلى' },
  { value: 'nearest', label: 'الأقرب' },
];
const MAX_IMAGES = 5;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

function auctionTimeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'انتهى';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d} يوم ${h} ساعة`;
  if (h > 0) return `${h} ساعة ${m} دقيقة`;
  return `${m} دقيقة`;
}

function isAuctionEnded(item: Product): boolean {
  if (item.auction_status === 'ended' || item.auction_status === 'closed_by_seller') return true;
  if (item.auction_end_time && new Date(item.auction_end_time).getTime() < Date.now()) return true;
  return false;
}

// ----- Product Details Modal -----
function ProductDetailsModal({
  item, bids, onClose, onBid, user, onRequireLogin, onGateOpen,
}: {
  item: Product;
  bids: ProductBid[];
  onClose: () => void;
  onBid: () => void;
  user: Profile | null;
  onRequireLogin: () => void;
  onGateOpen: () => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    fetchProductImages(item.id).then((imgs) => {
      const urls = imgs.map((i) => i.image_url);
      if (item.image_url && !urls.includes(item.image_url)) urls.unshift(item.image_url);
      setImages(urls.length ? urls : []);
    });
  }, [item.id, item.image_url]);

  const currentMax = Math.max(item.current_bid || 0, ...bids.map((b) => b.bid_amount));
  const inc = item.bid_increment || 10;
  const ended = isAuctionEnded(item);
  const phone = item.owner_phone || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[#1a2e21] z-10 flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-[#2d4a35] rounded-t-3xl">
          <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] text-lg">{item.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#2d4a35] text-stone-500 dark:text-stone-400">
            <X size={20} />
          </button>
        </div>

        {/* Image carousel */}
        {images.length > 0 ? (
          <div className="relative h-56 sm:h-72 bg-stone-100 dark:bg-[#0f1b14]">
            <img src={images[imgIdx]} alt={item.title} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((p) => (p - 1 + images.length) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => setImgIdx((p) => (p + 1) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60">
                  <ChevronLeft size={18} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
                <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {imgIdx + 1}/{images.length}
                </span>
              </>
            )}
            <span className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${item.is_auction ? 'bg-amber-500 text-white' : 'bg-[#1a5c38] text-white'}`}>
              {item.is_auction ? 'مزاد' : 'بيع'}
            </span>
          </div>
        ) : (
          <div className="h-36 bg-amber-50 dark:bg-[#0f1b14] flex items-center justify-center">
            <Package size={48} className="text-amber-300" />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Price + category */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {item.is_auction ? `${currentMax} درهم` : `${item.price} درهم`}
                <span className="text-sm font-normal text-stone-500 dark:text-stone-400"> / {item.unit}</span>
              </p>
              <span className="inline-block mt-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                {item.category}
              </span>
            </div>
            <div className="text-left text-xs text-stone-400 dark:text-stone-500 text-right">
              <p className="flex items-center gap-1 justify-end"><User size={11} /> {item.owner_name}</p>
              <p className="flex items-center gap-1 justify-end mt-0.5"><Clock size={11} /> {timeAgo(item.created_at)}</p>
            </div>
          </div>

          {/* Location */}
          {item.location && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <MapPin size={14} className="text-[#1a5c38]" />
              <span>{item.location}</span>
              {item.latitude && item.longitude && (
                <button onClick={() => openDirections(item.latitude!, item.longitude!)}
                  className="mr-auto text-xs text-[#1a5c38] dark:text-[#5dc993] font-semibold underline underline-offset-2">
                  الاتجاهات
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && item.description !== item.title && (
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{item.description}</p>
          )}

          {/* Auction details */}
          {item.is_auction && (
            <div className={`border rounded-2xl p-4 ${ended ? 'bg-stone-50 dark:bg-[#0f1b14] border-stone-200 dark:border-stone-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-stone-800 dark:text-[#e8ede9] flex items-center gap-1.5">
                  <Gavel size={16} className="text-amber-600" /> تفاصيل المزاد
                </p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  item.auction_status === 'closed_by_seller' ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400' :
                  ended ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
                }`}>
                  {item.auction_status === 'closed_by_seller' ? 'أُغلق بواسطة البائع' : ended ? 'انتهى' : 'نشط'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="bg-white dark:bg-[#1a2e21] rounded-xl p-2.5 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">أعلى مزايدة</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400">{currentMax} درهم</p>
                </div>
                <div className="bg-white dark:bg-[#1a2e21] rounded-xl p-2.5 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">عدد المزايدات</p>
                  <p className="font-bold text-stone-800 dark:text-[#e8ede9]">{bids.length}</p>
                </div>
                <div className="bg-white dark:bg-[#1a2e21] rounded-xl p-2.5 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">أدنى زيادة</p>
                  <p className="font-bold text-stone-800 dark:text-[#e8ede9]">{inc} درهم</p>
                </div>
                <div className="bg-white dark:bg-[#1a2e21] rounded-xl p-2.5 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">الوقت المتبقي</p>
                  <p className={`font-bold text-sm ${ended ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {item.auction_end_time ? auctionTimeLeft(item.auction_end_time) : '—'}
                  </p>
                </div>
              </div>
              {!ended && (
                <button onClick={onBid}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-2xl hover:bg-amber-600 active:scale-95 transition flex items-center justify-center gap-2">
                  <Gavel size={16} /> أضف مزايدتك (+{inc} درهم)
                </button>
              )}
              {ended && <p className="text-center text-sm text-stone-500 dark:text-stone-400 font-semibold">انتهى وقت المزاد</p>}

              {/* Bid history */}
              {bids.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-stone-600 dark:text-stone-400 mb-2">سجل المزايدات</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {[...bids].reverse().slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-white dark:bg-[#1a2e21] rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-stone-700 dark:text-stone-300">{b.bidder_name}</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">{b.bid_amount} درهم</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!user ? (
              <button onClick={() => { onClose(); onRequireLogin(); }}
                className="flex-1 bg-stone-100 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 text-sm font-semibold px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5 hover:bg-stone-200 transition">
                <Lock size={14} /> سجّل للتواصل
              </button>
            ) : (
              <>
                {phone && (
                  <button onClick={() => openCall(phone)}
                    className="flex-1 bg-[#1a5c38] text-white text-sm font-semibold px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5 hover:bg-[#2d7a4f] transition">
                    <Phone size={14} /> اتصال
                  </button>
                )}
                {item.owner_whatsapp_enabled && phone && (
                  <button onClick={() => openWhatsApp(phone, `السلام عليكم، أنا مهتم بالمنتج: ${item.title}`)}
                    className="flex-1 bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition">
                    <MessageCircle size={14} /> واتساب
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Main Component -----
export default function MarketView({ user, onToast, onRequireLogin, onGoToAccount, assistantPrefill }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>([]);
  const [bidsByProduct, setBidsByProduct] = useState<Record<string, ProductBid[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateRequirement, setGateRequirement] = useState<'email' | 'phone' | 'email_or_phone'>('email');

  // Filters + search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Detail modal
  const [detailItem, setDetailItem] = useState<Product | null>(null);

  // Form state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', productType: 'تمر', price: '', unit: 'كيلو',
    location: '', description: '',
    isAuction: false, auctionStartPrice: '', auctionEndDate: '', bidIncrement: '10',
    latitude: null as number | null, longitude: null as number | null,
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const products = await fetchProducts();
      setItems(products);
      const bidsMap: Record<string, ProductBid[]> = {};
      await Promise.all(
        products.filter((p: Product) => p.is_auction).map(async (p: Product) => {
          const bids = await fetchProductBids(p.id);
          bidsMap[p.id] = bids;
        })
      );
      setBidsByProduct(bidsMap);
    } catch (err) {
      console.error('Product fetch failed:', err);
      onToast('تعذر تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!assistantPrefill || !assistantPrefill.nonce) return;
    const { action, prefill } = assistantPrefill;
    if (action === 'open_add_product' || action === 'open_market_search') {
      if (action === 'open_add_product') {
        if (!user) { setShowLoginPrompt(true); return; }
        const { allowed, requirement } = canPerformAction(user, 'add_product');
        if (!allowed) { if (requirement) setGateRequirement(requirement); setGateOpen(true); return; }
        setForm({
          name: prefill.title || '',
          productType: prefill.category || 'تمر',
          price: prefill.price || '',
          unit: 'كيلو',
          location: user.location || '',
          description: prefill.description || '',
          isAuction: prefill.isAuction === 'true' || prefill.type === 'مزاد',
          auctionStartPrice: '', auctionEndDate: '', bidIncrement: '10',
          latitude: null, longitude: null,
        });
        setImageFiles([]);
        setImagePreviews([]);
        setShowForm(true);
      } else if (action === 'open_market_search' && prefill.query) {
        setSearchQuery(prefill.query);
      }
    }
  }, [assistantPrefill?.nonce]);

  const handleLocate = async () => {
    setLocating(true);
    const loc = await getCurrentLocation();
    setLocating(false);
    if (!loc.isDefault) {
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
      setSortBy('nearest');
    }
  };

  const handleGpsForForm = async () => {
    setGpsLoading(true);
    const loc = await getCurrentLocation();
    setGpsLoading(false);
    if (loc.isDefault) {
      onToast('لم يتم السماح بتحديد الموقع، يمكنك كتابة الموقع يدوياً.');
    } else {
      setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude, location: f.location || 'موقعي الحالي' }));
    }
  };

  const handleAddImage = (file: File) => {
    if (imageFiles.length >= MAX_IMAGES) { onToast(`الحد الأقصى ${MAX_IMAGES} صور`); return; }
    setImageFiles((prev) => [...prev, file]);
    setImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
  };

  const handleRemoveImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddClick = () => {
    if (!user) { setShowLoginPrompt(true); return; }
    const { allowed, requirement } = canPerformAction(user, 'add_product');
    if (!allowed) {
      if (requirement) setGateRequirement(requirement);
      setGateOpen(true);
      return;
    }
    setForm({
      name: '', productType: 'تمر', price: '', unit: 'كيلو',
      location: user.location, description: '',
      isAuction: false, auctionStartPrice: '', auctionEndDate: '', bidIncrement: '10',
      latitude: null, longitude: null,
    });
    setImageFiles([]);
    setImagePreviews([]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { onToast('يرجى تعبئة اسم المنتج'); return; }
    if (!user) return;
    const priceNum = parseFloat(form.price);
    if (form.price && isNaN(priceNum)) { onToast('يرجى إدخال سعر صحيح'); return; }
    if (form.isAuction && form.auctionEndDate) {
      const endDate = new Date(form.auctionEndDate);
      const minEnd = new Date(Date.now() + 24 * 3600 * 1000);
      if (endDate < minEnd) { onToast('يجب أن يكون وقت انتهاء المزاد بعد 24 ساعة على الأقل'); return; }
    }
    setSubmitting(true);
    let firstImageUrl: string | undefined;
    const failedImages: number[] = [];

    // Upload images
    const uploadedUrls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const url = await uploadOptionalImage('product-images', imageFiles[i], user.id);
      if (url) { uploadedUrls.push(url); }
      else { failedImages.push(i + 1); console.error('Product image upload failed:', `image ${i + 1}`); }
    }
    if (uploadedUrls.length > 0) firstImageUrl = uploadedUrls[0];

    try {
      const newProduct = await insertProduct(user, {
        title: form.name,
        category: form.productType,
        price: form.price || 'حسب الاتفاق',
        unit: form.unit,
        description: form.description || form.name,
        location: form.location || 'القوع',
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        isAuction: form.isAuction,
        currentBid: form.isAuction && form.auctionStartPrice ? Number(form.auctionStartPrice) : undefined,
        imageUrl: firstImageUrl,
        auctionEndTime: form.isAuction && form.auctionEndDate ? new Date(form.auctionEndDate).toISOString() : undefined,
        bidIncrement: form.isAuction && form.bidIncrement ? Number(form.bidIncrement) : 10,
      });
      if (newProduct && uploadedUrls.length > 1) {
        try {
          await insertProductImages(newProduct.id, uploadedUrls.slice(1));
        } catch {
          // non-fatal
        }
      }
      if (newProduct) {
        setItems((prev) => [newProduct, ...prev]);
        if (newProduct.is_auction) setBidsByProduct((prev) => ({ ...prev, [newProduct.id]: [] }));
      }
      setShowForm(false);
      setImageFiles([]);
      setImagePreviews([]);
      if (failedImages.length > 0) {
        onToast('تم نشر المنتج بدون بعض الصور بسبب تعذر رفعها');
      } else {
        onToast('تم نشر المنتج بنجاح');
      }
    } catch (err) {
      console.error('Product publish failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBid = async (item: Product) => {
    if (!user) { setShowLoginPrompt(true); return; }
    if (item.user_id === user.id) { onToast('لا يمكنك المزايدة على منتجك'); return; }
    if (isAuctionEnded(item)) { onToast('انتهى وقت المزاد'); return; }
    const { allowed, requirement } = canPerformAction(user, 'bid');
    if (!allowed) {
      if (requirement) setGateRequirement(requirement);
      setGateOpen(true);
      return;
    }
    const bids = bidsByProduct[item.id] || [];
    const currentMax = Math.max(item.current_bid || 0, ...bids.map((b) => b.bid_amount));
    const inc = item.bid_increment || 10;
    const newAmount = currentMax + inc;
    if (newAmount <= currentMax) { onToast('يجب أن تكون المزايدة أعلى من السعر الحالي'); return; }
    try {
      await placeBid(item.id, user, newAmount);
      setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, current_bid: newAmount } : p));
      setBidsByProduct((prev) => ({
        ...prev,
        [item.id]: [...(prev[item.id] || []), {
          id: `local-${Date.now()}`, product_id: item.id,
          user_id: user.id, bidder_name: user.fullName,
          bid_amount: newAmount, created_at: new Date().toISOString(),
        }],
      }));
      onToast(`تمت مزايدتك بمبلغ ${newAmount} درهم`);
      if (detailItem?.id === item.id) setDetailItem((prev) => prev ? { ...prev, current_bid: newAmount } : prev);
    } catch (err) {
      console.error('Bid submit failed:', err);
      onToast(handleSupabaseError(err));
    }
  };

  // Filter + sort
  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const match = (
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.owner_name?.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    if (activeFilter === 'الكل') return true;
    if (activeFilter === 'مزاد') return item.is_auction;
    if (activeFilter === 'بيع') return !item.is_auction;
    return item.category === activeFilter;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'price_asc') return parseFloat(a.price || '0') - parseFloat(b.price || '0');
    if (sortBy === 'price_desc') return parseFloat(b.price || '0') - parseFloat(a.price || '0');
    if (sortBy === 'nearest' && userLat !== null && userLng !== null) {
      const dA = a.latitude && a.longitude ? calculateDistanceKm(userLat, userLng, a.latitude, a.longitude) : 9999;
      const dB = b.latitude && b.longitude ? calculateDistanceKm(userLat, userLng, b.latitude, b.longitude) : 9999;
      return dA - dB;
    }
    return 0;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-amber-50 dark:bg-[#1a2e21] border border-amber-200 dark:border-[#2d4a35] rounded-2xl p-5 flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <ShoppingBasket size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-[#e8ede9]">السوق المحلي</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">بيع وشراء المنتجات المحلية بسهولة وأمان</p>
        </div>
        <button onClick={handleAddClick}
          className="mr-auto flex-shrink-0 bg-[#1a5c38] text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-[#2d7a4f] active:scale-95 transition text-sm">
          <Plus size={16} /> نشر منتج
        </button>
      </div>

      {/* Search + GPS */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن منتج، بائع، موقع، أو تصنيف..."
            className="w-full bg-stone-100 dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-stone-800 dark:text-[#e8ede9] placeholder-stone-400" />
        </div>
        <button onClick={handleLocate} disabled={locating}
          className="flex-shrink-0 bg-[#1a5c38] text-white px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold hover:bg-[#2d7a4f] transition disabled:opacity-60">
          {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
          <span className="hidden sm:inline">موقعي</span>
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {CATEGORY_FILTERS.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full transition ${activeFilter === f
              ? 'bg-[#1a5c38] text-white shadow-sm'
              : 'bg-stone-100 dark:bg-[#1a2e21] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2d4a35] hover:bg-stone-200 dark:hover:bg-[#2d4a35]'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Sort + results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {filteredItems.length} منتج
          {userLat !== null && <span className="mr-1 text-[#1a5c38] dark:text-[#5dc993]">· مرتب حسب المسافة</span>}
        </p>
        <div className="relative">
          <button onClick={() => setShowSortDropdown((s) => !s)}
            className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] px-3 py-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-[#2d4a35] transition">
            <SortAsc size={14} />
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
          </button>
          {showSortDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[#1a2e21] border border-stone-200 dark:border-[#2d4a35] rounded-xl shadow-xl z-20 overflow-hidden min-w-[130px]">
              {SORT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                  className={`w-full text-right px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:hover:bg-[#2d4a35] ${sortBy === opt.value ? 'font-bold text-[#1a5c38] dark:text-[#5dc993]' : 'text-stone-700 dark:text-stone-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm">جاري تحميل المنتجات...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-stone-400 dark:text-stone-500">
          <Package size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">لا توجد منتجات حالياً</p>
          {searchQuery && <p className="text-xs mt-1 opacity-70">جرب بحثاً مختلفاً</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const bids = bidsByProduct[item.id] || [];
            const currentMax = Math.max(item.current_bid || 0, ...bids.map((b) => b.bid_amount));
            const phone = item.owner_phone || '';
            const ended = isAuctionEnded(item);
            const inc = item.bid_increment || 10;
            const dist = (userLat !== null && userLng !== null && item.latitude && item.longitude)
              ? calculateDistanceKm(userLat, userLng, item.latitude, item.longitude)
              : null;

            return (
              <div key={item.id} className="bg-white dark:bg-[#1a2e21] border border-amber-100 dark:border-[#2d4a35] rounded-2xl overflow-hidden card-hover flex flex-col">
                {/* Image */}
                <div className="relative h-40 bg-amber-50 dark:bg-[#0f1b14] overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={36} className="text-amber-200 dark:text-amber-800" />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${item.is_auction ? 'bg-amber-500 text-white' : 'bg-[#1a5c38] text-white'}`}>
                    {item.is_auction ? 'مزاد' : 'بيع'}
                  </span>
                  {dist !== null && (
                    <span className="absolute top-2 left-2 text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Navigation size={10} /> {formatDistance(dist)}
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <div className="mb-2">
                    <h4 className="font-bold text-stone-800 dark:text-[#e8ede9] text-sm leading-snug">{item.title}</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{item.category} · {item.owner_name}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <p className="font-bold text-amber-600 dark:text-amber-400 text-lg leading-none">
                      {item.is_auction ? currentMax : item.price}
                    </p>
                    <span className="text-xs text-stone-400 dark:text-stone-500">درهم / {item.unit}</span>
                  </div>

                  {/* Location */}
                  <p className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1 mb-2">
                    <MapPin size={10} /> {item.location}
                  </p>

                  {/* Auction mini info */}
                  {item.is_auction && (
                    <div className={`text-xs rounded-xl px-3 py-2 mb-2 ${ended ? 'bg-stone-100 dark:bg-[#0f1b14] text-stone-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                      <div className="flex items-center justify-between">
                        <span>{bids.length} مزايدة</span>
                        <span className="font-bold">
                          {ended ? 'انتهى المزاد' : item.auction_end_time ? auctionTimeLeft(item.auction_end_time) : 'نشط'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <button onClick={() => setDetailItem(item)}
                      className="flex-1 bg-stone-100 dark:bg-[#2d4a35] text-stone-700 dark:text-stone-300 text-xs font-semibold py-2 rounded-xl hover:bg-stone-200 dark:hover:bg-[#3d5a45] transition">
                      عرض التفاصيل
                    </button>
                    {item.is_auction && !ended && (
                      <button onClick={() => handleBid(item)}
                        className="flex-1 bg-amber-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-amber-600 active:scale-95 transition flex items-center justify-center gap-1">
                        <Gavel size={12} /> زايد (+{inc})
                      </button>
                    )}
                    {!item.is_auction && phone && user && (
                      <button onClick={() => openCall(phone)}
                        className="flex-shrink-0 bg-[#1a5c38] text-white p-2 rounded-xl hover:bg-[#2d7a4f] transition">
                        <Phone size={14} />
                      </button>
                    )}
                    {!item.is_auction && item.owner_whatsapp_enabled && phone && user && (
                      <button onClick={() => openWhatsApp(phone, `السلام عليكم، أنا مهتم بالمنتج: ${item.title}`)}
                        className="flex-shrink-0 bg-emerald-500 text-white p-2 rounded-xl hover:bg-emerald-600 transition">
                        <MessageCircle size={14} />
                      </button>
                    )}
                    {item.latitude && item.longitude && (
                      <button onClick={() => openDirections(item.latitude!, item.longitude!)}
                        className="flex-shrink-0 bg-stone-200 dark:bg-[#2d4a35] text-stone-600 dark:text-stone-300 p-2 rounded-xl hover:bg-stone-300 dark:hover:bg-[#3d5a45] transition">
                        <MapPin size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <ProductDetailsModal
          item={detailItem}
          bids={bidsByProduct[detailItem.id] || []}
          onClose={() => setDetailItem(null)}
          onBid={() => handleBid(detailItem)}
          user={user}
          onRequireLogin={() => { setDetailItem(null); setShowLoginPrompt(true); }}
          onGateOpen={() => setGateOpen(true)}
        />
      )}

      {/* Login prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center mb-4">
              <Lock size={28} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-[#e8ede9] mb-2">يرجى تسجيل الدخول أولاً</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-5">لتتمكن من إضافة منتج أو التواصل مع البائعين</p>
            <button onClick={() => { setShowLoginPrompt(false); onRequireLogin(); }}
              className="w-full bg-[#1a5c38] text-white font-bold py-3 rounded-2xl hover:bg-[#2d7a4f] transition mb-2">
              تسجيل الدخول / إنشاء حساب
            </button>
            <button onClick={() => setShowLoginPrompt(false)} className="w-full text-stone-500 text-sm py-2 hover:text-stone-700 transition">إلغاء</button>
          </div>
        </div>
      )}

      {/* Add product form */}
      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-lg max-h-[93vh] overflow-y-auto">
            <div className="bg-[#1a5c38] text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Plus size={20} /> نشر منتج جديد</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/15"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Images */}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-[#e8ede9] mb-2">
                  صور المنتج (حد أقصى {MAX_IMAGES} صور)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-[#2d4a35]">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(i)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                        <X size={10} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">رئيسية</span>
                      )}
                    </div>
                  ))}
                  {imagePreviews.length < MAX_IMAGES && (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-stone-300 dark:border-[#2d4a35] flex flex-col items-center justify-center gap-1 col-span-1">
                      <Plus size={16} className="text-stone-400" />
                      <span className="text-xs text-stone-400">إضافة</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#1a2e21] transition">
                    <Camera size={16} /> كاميرا
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#1a2e21] transition">
                    <ImagePlus size={16} /> معرض الصور
                  </button>
                </div>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { Array.from(e.target.files || []).forEach(handleAddImage); e.target.value = ''; }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddImage(f); e.target.value = ''; }} />
              </div>

              {/* Product info */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">اسم المنتج *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: تمر خلاص فاخر" required
                  className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-transparent dark:border-[#2d4a35]" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">التصنيف</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, productType: t })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${form.productType === t ? 'bg-[#1a5c38] text-white' : 'bg-stone-100 dark:bg-[#0f1b14] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2d4a35]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price + unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">السعر (درهم)</label>
                  <input type="number" min="0" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="مثال: 25"
                    className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-transparent dark:border-[#2d4a35]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">الوحدة</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-transparent dark:border-[#2d4a35]">
                    {MARKET_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-1.5">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="تفاصيل المنتج، الجودة، المصدر..." rows={2}
                  className="w-full bg-stone-100 dark:bg-[#0f1b14] dark:text-[#e8ede9] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none border border-transparent dark:border-[#2d4a35]" />
              </div>

              {/* Location */}
              <div className="bg-stone-50 dark:bg-[#0f1b14] border border-stone-200 dark:border-[#2d4a35] rounded-xl p-3">
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#e8ede9] mb-2">الموقع</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="مثال: القوع - حي النخيل"
                    className="flex-1 bg-white dark:bg-[#1a2e21] dark:text-[#e8ede9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-stone-200 dark:border-[#2d4a35]" />
                  <button type="button" onClick={handleGpsForForm} disabled={gpsLoading}
                    className="flex-shrink-0 bg-[#1a5c38] text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-[#2d7a4f] transition disabled:opacity-60">
                    {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                    GPS
                  </button>
                </div>
                {form.latitude && form.longitude && (
                  <p className="text-xs text-[#1a5c38] dark:text-[#5dc993] flex items-center gap-1">
                    <Navigation size={11} /> تم تحديد الموقع ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
                  </p>
                )}
              </div>

              {/* Auction toggle */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <input type="checkbox" checked={form.isAuction} onChange={(e) => setForm({ ...form, isAuction: e.target.checked })}
                    className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm font-bold text-stone-800 dark:text-[#e8ede9] flex items-center gap-1.5">
                    <Gavel size={15} className="text-amber-600" /> تفعيل المزاد المباشر (اختياري)
                  </span>
                </label>
                {form.isAuction && (
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">سعر البداية *</label>
                        <input type="number" min="0" value={form.auctionStartPrice}
                          onChange={(e) => setForm({ ...form, auctionStartPrice: e.target.value })}
                          placeholder="مثال: 500" required
                          className="w-full bg-white dark:bg-[#1a2e21] dark:text-[#e8ede9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-amber-200 dark:border-amber-700" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">أقل زيادة (درهم)</label>
                        <input type="number" min="1" value={form.bidIncrement}
                          onChange={(e) => setForm({ ...form, bidIncrement: e.target.value })}
                          placeholder="10"
                          className="w-full bg-white dark:bg-[#1a2e21] dark:text-[#e8ede9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-amber-200 dark:border-amber-700" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">تاريخ وانتهاء المزاد *</label>
                      <input type="datetime-local" value={form.auctionEndDate}
                        min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)}
                        onChange={(e) => setForm({ ...form, auctionEndDate: e.target.value })}
                        required
                        className="w-full bg-white dark:bg-[#1a2e21] dark:text-[#e8ede9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 border border-amber-200 dark:border-amber-700" />
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">الحد الأدنى لمدة المزاد 24 ساعة</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-[#1a5c38]/5 dark:bg-[#1a5c38]/10 border border-[#1a5c38]/20 rounded-xl p-3">
                <p className="text-xs text-[#1a5c38] dark:text-[#5dc993] font-semibold mb-1.5">ملاحظات مهمة</p>
                <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-0.5">
                  <li>· جميع المنتجات من المجتمع المحلي فقط</li>
                  <li>· تأكد من صحة معلومات المنتج والسعر</li>
                  <li>· تمنع بيع المنتجات المخالفة للقوانين</li>
                  <li>· تواصل بالبائع مباشرة عبر التطبيق</li>
                </ul>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-[#1a5c38] text-white font-bold py-3.5 rounded-2xl hover:bg-[#2d7a4f] transition flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                {submitting ? 'جاري النشر...' : 'نشر المنتج'}
              </button>
            </form>
          </div>
        </div>
      )}

      <VerificationGate open={gateOpen} onClose={() => setGateOpen(false)} requirement={gateRequirement} profile={user} onGoToAccount={onGoToAccount} />
    </div>
  );
}
