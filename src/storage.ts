import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

export interface OwnerInfo {
  userId?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerWhatsappEnabled?: boolean;
  ownerLocation?: string;
}

export interface Report extends OwnerInfo {
  id: string;
  type: string;
  description: string;
  location: string;
  urgency: 'منخفض' | 'متوسط' | 'عالي';
  elderly: boolean;
  phone?: string;
  hasWhatsApp?: boolean;
  date: string;
  status: 'جديد' | 'قيد المعالجة' | 'تم الإصلاح';
}

export interface MarketItem extends OwnerInfo {
  id: string;
  name: string;
  productType: string;
  price: string;
  unit: string;
  seller: string;
  phone: string;
  hasWhatsApp: boolean;
  location: string;
  description: string;
  type: 'بيع' | 'شراء';
  date: string;
  isAuction?: boolean;
  auctionStartPrice?: number;
  bids?: Bid[];
}

export interface Announcement extends OwnerInfo {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  description: string;
  phone?: string;
  hasWhatsApp?: boolean;
}

export interface HealthConsult extends OwnerInfo {
  id: string;
  name: string;
  age: string;
  description: string;
  phone: string;
  hasWhatsApp: boolean;
  date: string;
}

export interface AgriRequest extends OwnerInfo {
  id: string;
  crop: string;
  problem: string;
  phone: string;
  hasWhatsApp: boolean;
  date: string;
}

export interface TransportRide extends OwnerInfo {
  id: string;
  driverName: string;
  driverPhone: string;
  hasWhatsApp: boolean;
  fromLocation: string;
  toLocation: string;
  time: string;
  seatsAvailable: number;
  verified: boolean;
  date: string;
  notes?: string;
}

export interface TransportRequest extends OwnerInfo {
  id: string;
  riderName: string;
  riderPhone: string;
  hasWhatsApp: boolean;
  fromLocation: string;
  toLocation: string;
  requestedTime: string;
  passengers: number;
  notes?: string;
  date: string;
  status: 'بحث عن سائق' | 'تم القبول' | 'مكتمل';
}

export interface Bid {
  bidder: string;
  amount: number;
  time: string;
}

export interface ServiceLocation {
  name: string;
  type: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  hours: string;
  hasWhatsApp: boolean;
  whatsapp?: string;
}

export const REPORT_TYPES = ['إنارة', 'طريق', 'مياه', 'نظافة', 'زراعة', 'صحة', 'أخرى'];
export const URGENCY_LEVELS: Report['urgency'][] = ['منخفض', 'متوسط', 'عالي'];
export const ANNOUNCEMENT_CATEGORIES = ['ديني', 'تدريبي', 'اجتماعي', 'صحي', 'زراعي', 'سوق', 'وطني', 'تعليمي', 'قرآني'];
export const MARKET_UNITS = ['كيلو', 'صندوق', 'حبة', 'حسب الاتفاق'];
export const PRODUCT_TYPES = ['تمر', 'عسل', 'خضار', 'أعلاف', 'منتجات يدوية', 'أخرى'];

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  { name: 'مركز صحي القوع', type: 'صحة', address: 'القوع - العين', phone: '037011111', lat: 24.2080, lng: 55.7690, hours: '24 ساعة', hasWhatsApp: false },
  { name: 'مستوصف الواحة', type: 'صحة', address: 'حي النخيل - القوع', phone: '0501234567', lat: 24.2050, lng: 55.7650, hours: '7 ص - 11 م', hasWhatsApp: true, whatsapp: '0501234567' },
  { name: 'مركز الطوارئ الإقليمي', type: 'صحة', address: 'العين - الطوارئ', phone: '998', lat: 24.2150, lng: 55.7750, hours: '24 ساعة', hasWhatsApp: false },
  { name: 'مسجد الواحة', type: 'ديني', address: 'وسط القوع', phone: '—', lat: 24.2070, lng: 55.7680, hours: 'مفتوح دائماً', hasWhatsApp: false },
  { name: 'المدرسة', type: 'تعليم', address: 'حي الصفوة - القوع', phone: '—', lat: 24.2100, lng: 55.7700, hours: '7 ص - 1 م', hasWhatsApp: false },
  { name: 'السوق المحلي', type: 'تجاري', address: 'السوق القديم - القوع', phone: '—', lat: 24.2040, lng: 55.7670, hours: '6 ص - 10 م', hasWhatsApp: false },
  { name: 'البلدية', type: 'حكومي', address: 'مبنى البلدية - العين', phone: '037022222', lat: 24.2120, lng: 55.7720, hours: '7:30 ص - 2:30 م', hasWhatsApp: false },
  { name: 'محطة وقود', type: 'خدمات', address: 'طريق القوع الرئيسي', phone: '—', lat: 24.2090, lng: 55.7710, hours: '24 ساعة', hasWhatsApp: false },
  { name: 'صراف / بنك', type: 'مالي', address: 'مركز القوع التجاري', phone: '—', lat: 24.2060, lng: 55.7700, hours: '9 ص - 9 م', hasWhatsApp: false },
  { name: 'صيدلية', type: 'صحة', address: 'شارع الأمير - القوع', phone: '0509876543', lat: 24.2075, lng: 55.7665, hours: '8 ص - 12 م', hasWhatsApp: true, whatsapp: '0509876543' },
  { name: 'مركز شرطة', type: 'أمن', address: 'مركز شرطة القوع', phone: '999', lat: 24.2130, lng: 55.7740, hours: '24 ساعة', hasWhatsApp: false },
  { name: 'الدفاع المدني', type: 'أمن', address: 'مركز الدفاع المدني - العين', phone: '997', lat: 24.2160, lng: 55.7760, hours: '24 ساعة', hasWhatsApp: false },
  { name: 'سوق التمور', type: 'تجاري', address: 'سوق التمور - القوع', phone: '—', lat: 24.2030, lng: 55.7640, hours: '6 ص - 8 م', hasWhatsApp: false },
  { name: 'مركز خدمات حكومية', type: 'حكومي', address: 'مركز الخدمات - العين', phone: '037033333', lat: 24.2140, lng: 55.7730, hours: '7:30 ص - 2:30 م', hasWhatsApp: false },
];

export const DEFAULT_REPORTS: Report[] = [
  { id: 'r1', type: 'إنارة', description: 'إنارة الشارع الرئيسي معطلة منذ يومين', location: 'شارع الأمير', urgency: 'عالي', elderly: true, phone: '0501234567', hasWhatsApp: true, date: 'قبل يومين', status: 'قيد المعالجة' },
  { id: 'r2', type: 'طريق', description: 'حفرة كبيرة في الطريق المؤدي للمسجد', location: 'حي النخيل', urgency: 'متوسط', elderly: false, date: 'قبل أسبوع', status: 'تم الإصلاح' },
  { id: 'r3', type: 'مياه', description: 'تسريب مياه من الخط الرئيسي', location: 'حي الواحة', urgency: 'عالي', elderly: false, date: 'قبل 3 أيام', status: 'جديد' },
  { id: 'r4', type: 'إنارة', description: 'كشاف الإنارة بجانب المنزل لا يعمل', location: 'حي الصفوة', urgency: 'متوسط', elderly: true, date: 'قبل يوم', status: 'جديد' },
  { id: 'r5', type: 'نظافة', description: 'تراكم مخلفات بجانب السوق', location: 'السوق القديم', urgency: 'منخفض', elderly: false, date: 'قبل 4 أيام', status: 'قيد المعالجة' },
];

export const DEFAULT_MARKET_ITEMS: MarketItem[] = [
  { id: 'm1', name: 'تمر خلاص', productType: 'تمر', price: '25', unit: 'كيلو', seller: 'أبو عبدالله', phone: '0501234567', hasWhatsApp: true, location: 'القوع', description: 'تمر خلاص فاخر من مزرعتنا، حصاد هذا الموسم', type: 'بيع', date: 'اليوم' },
  { id: 'm2', name: 'تمر برحي', productType: 'تمر', price: '18', unit: 'كيلو', seller: 'مزرعة النخيل', phone: '0507654321', hasWhatsApp: true, location: 'حي النخيل', description: 'تمر برحي طازج، متوفر بكميات', type: 'بيع', date: 'أمس' },
  { id: 'm3', name: 'عسل سدر طبيعي', productType: 'عسل', price: '120', unit: 'كيلو', seller: 'أبو سعد', phone: '0551112222', hasWhatsApp: true, location: 'القوع', description: 'عسل سدر طبيعي 100%، من المناحل المحلية', type: 'بيع', date: 'قبل يومين' },
  { id: 'm4', name: 'أعلاف (برسيم)', productType: 'أعلاف', price: 'حسب السعر', unit: 'صندوق', seller: 'مزرعة الفلاح', phone: '0533334444', hasWhatsApp: false, location: 'القوع', description: 'أعلاف برسيم طازجة للماشية', type: 'بيع', date: 'اليوم' },
  { id: 'm5', name: 'تمر خلاص فاخر (مزاد)', productType: 'تمر', price: 'مزاد', unit: 'صندوق', seller: 'أبو عبدالله', phone: '0501234567', hasWhatsApp: true, location: 'القوع', description: 'تمر خلاص فاخر - مزاد مباشر لمدة 3 أيام', type: 'بيع', date: 'اليوم', isAuction: true, auctionStartPrice: 250, bids: [{ bidder: 'أحمد', amount: 270, time: 'قبل ساعة' }] },
];

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'صلاة الجمعة في مسجد الواحة', category: 'ديني', date: 'كل جمعة', time: '12:30 ظهراً', description: 'صلاة الجمعة في مسجد الواحة الرئيسي' },
  { id: 'a2', title: 'دورة تدريبية في الزراعة الحديثة', category: 'تدريبي', date: 'الأحد القادم', time: '4 عصراً', description: 'دورة عن تقنيات الري الحديثة ومكافحة آفات النخيل', phone: '0501234567', hasWhatsApp: true },
  { id: 'a3', title: 'اجتماع أهالي الواحة', category: 'اجتماعي', date: 'الثلاثاء', time: '8 مساءً', description: 'اجتماع دوري لمناقشة احتياجات الحي' },
];

export const DEFAULT_TRANSPORT_RIDES: TransportRide[] = [
  { id: 't1', driverName: 'أبو سعيد', driverPhone: '0501234567', hasWhatsApp: true, fromLocation: 'القوع', toLocation: 'العين - توام', time: '3:00 عصراً', seatsAvailable: 3, verified: true, date: 'اليوم', notes: 'مرور بالقوع ثم العين' },
  { id: 't2', driverName: 'أبو محمد', driverPhone: '0509876543', hasWhatsApp: true, fromLocation: 'القوع', toLocation: 'العين - الجامعة', time: '7:00 صباحاً', seatsAvailable: 2, verified: true, date: 'غداً', notes: 'رحلة صباحية للطلاب' },
  { id: 't3', driverName: 'أبو خالد', driverPhone: '0533334444', hasWhatsApp: false, fromLocation: 'القوع', toLocation: 'سويحان', time: '5:00 مساءً', seatsAvailable: 4, verified: false, date: 'اليوم' },
];

export const COMMON_AGRI_PROBLEMS = [
  {
    name: 'سوسة النخيل',
    symptoms: 'ثقوب في الساق، اصفرار الأوراق، تساقط الثمار',
    tips: [
      'افحص النخيل أسبوعياً بحثاً عن ثقوب أو نشارة',
      'استخدم مصائد الفيرمون لرصد الإصابة مبكراً',
      'راجع المختبر الزراعي فوراً عند تأكد الإصابة',
      'قم بإزالة النخيل المصاب بشدة لمنع الانتشار',
    ],
  },
  {
    name: 'اصفرار الأوراق',
    symptoms: 'اصفرار تدريجي للأوراق من الأسفل للأعلى',
    tips: [
      'افحص نسبة الري - قد تكون زيادة أو نقص',
      'اختبر التربة لمعرفة نقص العناصر الغذائية',
      'أضف سماد يحتوي على النيتروجين والحديد',
      'تجنب الري في أوقات الذروة الحرارية',
    ],
  },
  {
    name: 'قلة الري',
    symptoms: 'جفاف أطراف الأوراق، ذبول، صغر حجم الثمار',
    tips: [
      'زد كمية الري تدريجياً ولا تغير فجأة',
      'اسقِ النخيل مرتين أسبوعياً في الصيف',
      'استخدم نظام التنقيط لتوفير الماء',
      'غط التربة بالنشارة للحفاظ على الرطوبة',
    ],
  },
  {
    name: 'أمراض التربة',
    symptoms: 'تعفن الجذور، بطء النمو، اصفرار عام',
    tips: [
      'حسن صرف التربة بإضافة الرمل العضوي',
      'تجنب الري الزائد الذي يسبب تعفن الجذور',
      'أضف مادة عضوية متحللة لتحسين التربة',
      'قم بتحليل التربة دورياً كل موسم',
    ],
  },
];
