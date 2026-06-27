import { askWahaAssistant, fallbackAssistantResponse, type GeminiResult, type ConversationTurn } from './utils/geminiAssistant';
import { fetchEvents, fetchProducts, fetchAnnouncements, fetchReports } from './lib/data';

export type RequestCategory =
  | 'الصحة'
  | 'الزراعة'
  | 'الطوارئ'
  | 'السوق المحلي'
  | 'الإعلانات'
  | 'الموقع والخدمات'
  | 'بلاغات المجتمع'
  | 'القافلة الذكية'
  | 'النقل الذكي'
  | 'الفعاليات'
  | 'عام';

export type AssistantActionType =
  | 'open_service' | 'sos' | 'open_market' | 'open_announcements'
  | 'open_reports' | 'open_caravan' | 'new_report' | 'new_market_item'
  | 'new_announcement' | 'open_health' | 'open_location' | 'open_transport'
  | 'new_transport_request' | 'new_report_lighting' | 'new_market_item_form'
  | 'open_agriculture_scan' | 'open_home' | 'open_add_product' | 'open_new_report'
  | 'open_services' | 'open_health_services' | 'open_agriculture' | 'open_crop_scan'
  | 'open_ride_request' | 'open_events' | 'open_account' | 'open_sos'
  | 'open_add_event' | 'open_add_announcement' | 'open_event_registration'
  | 'open_health_consultation' | 'open_agri_advice_request'
  | 'open_market_search' | 'open_events_search' | 'open_reports_search'
  | 'open_location_search' | 'none';

export interface AssistantAction {
  type: AssistantActionType;
  label: string;
  prefillType?: string;
  prefill?: Record<string, string>;
}

export interface AssistantResponse {
  text: string;
  category: RequestCategory;
  action?: AssistantAction;
  isFallback?: boolean;
}

// ---- Action string → label mapping ----
const ACTION_LABELS: Record<string, string> = {
  open_home: 'العودة للرئيسية',
  open_market: 'فتح السوق المحلي',
  open_add_product: 'إضافة المنتج',
  open_reports: 'فتح البلاغات',
  open_new_report: 'إرسال بلاغ',
  open_services: 'فتح الخدمات',
  open_health_services: 'الخدمات الصحية',
  open_agriculture: 'فتح الزراعة',
  open_crop_scan: 'فحص محصول',
  open_transport: 'فتح النقل الذكي',
  open_ride_request: 'طلب رحلة',
  open_events: 'فتح الفعاليات',
  open_add_event: 'نشر فعالية',
  open_announcements: 'فتح الإعلانات',
  open_add_announcement: 'نشر إعلان',
  open_account: 'فتح حسابي',
  open_sos: 'فتح الطوارئ',
  open_event_registration: 'التسجيل في الفعالية',
  open_health_consultation: 'طلب استشارة صحية',
  open_agri_advice_request: 'طلب استشارة زراعية',
  open_market_search: 'بحث في السوق',
  open_events_search: 'بحث في الفعاليات',
  open_reports_search: 'بحث في البلاغات',
  open_location_search: 'بحث في الخدمات',
};

const INTENT_CATEGORY: Record<string, RequestCategory> = {
  sell_product: 'السوق المحلي',
  auction_product: 'السوق المحلي',
  buy_product: 'السوق المحلي',
  market_search: 'السوق المحلي',
  create_announcement: 'الإعلانات',
  create_event: 'الفعاليات',
  event_registration: 'الفعاليات',
  report_issue: 'بلاغات المجتمع',
  report_lighting: 'بلاغات المجتمع',
  report_road: 'بلاغات المجتمع',
  report_cleanliness: 'بلاغات المجتمع',
  report_water: 'بلاغات المجتمع',
  report_security: 'بلاغات المجتمع',
  transport_request: 'النقل الذكي',
  health_services: 'الصحة',
  health_consultation: 'الصحة',
  nearby_health: 'الصحة',
  agriculture_scan: 'الزراعة',
  agriculture_advice: 'الزراعة',
  nearby_services: 'الموقع والخدمات',
  emergency: 'الطوارئ',
  account: 'عام',
  general: 'عام',
};

function geminiResultToResponse(result: GeminiResult): AssistantResponse {
  const category: RequestCategory = INTENT_CATEGORY[result.intent] ?? 'عام';
  let action: AssistantAction | undefined;

  if (result.action && result.action !== 'none') {
    action = {
      type: result.action as AssistantActionType,
      label: ACTION_LABELS[result.action] ?? 'تنفيذ',
      prefill: result.prefill,
      ...(result.action === 'open_new_report' && result.prefill?.report_type
        ? { prefillType: result.prefill.report_type }
        : {}),
    };
  }

  return { text: result.reply, category, action, isFallback: result.isFallback };
}

// ── Real-data query helpers ────────────────────────────────────────────────

async function handleRealDataQuery(message: string): Promise<AssistantResponse | null> {
  const m = message.toLowerCase();

  // Events query
  if ((m.includes('فعالية') || m.includes('فعاليات') || m.includes('event')) &&
      (m.includes('ما') || m.includes('وش') || m.includes('كم') || m.includes('هل') || m.includes('قادم') || m.includes('?') || m.includes('؟'))) {
    try {
      const events = await fetchEvents();
      if (!events.length) {
        return { text: 'لا توجد فعاليات مسجلة حالياً في المنصة.', category: 'الفعاليات', action: { type: 'open_add_event', label: 'نشر فعالية', prefill: {} } };
      }
      const top = events.slice(0, 3);
      const lines = top.map((e: any) => `• ${e.title}${e.event_date ? ` — ${e.event_date}` : ''}${e.location ? ` في ${e.location}` : ''}`).join('\n');
      return {
        text: `هذه الفعاليات المتاحة في واحة (${events.length} فعالية):\n${lines}`,
        category: 'الفعاليات',
        action: { type: 'open_events', label: 'فتح جميع الفعاليات', prefill: {} },
      };
    } catch { /* fall through to Gemini */ }
  }

  // Products query
  if ((m.includes('تمر') || m.includes('عسل') || m.includes('خضار') || m.includes('منتج') || m.includes('سوق')) &&
      (m.includes('هل') || m.includes('في') || m.includes('ما') || m.includes('وش') || m.includes('كم') || m.includes('?') || m.includes('؟'))) {
    try {
      const products = await fetchProducts();
      const query = m.includes('تمر') ? 'تمر' : m.includes('عسل') ? 'عسل' : m.includes('خضار') ? 'خضار' : '';
      const filtered = query ? products.filter((p: any) => (p.title || '').includes(query) || (p.category || '').includes(query)) : products;
      if (!filtered.length) {
        return { text: `لا توجد منتجات${query ? ` من نوع ${query}` : ''} في السوق حالياً.`, category: 'السوق المحلي', action: { type: 'open_market', label: 'فتح السوق المحلي', prefill: {} } };
      }
      const top = filtered.slice(0, 3);
      const lines = top.map((p: any) => `• ${p.title}${p.price ? ` — ${p.price} درهم` : ''}${p.location ? ` (${p.location})` : ''}`).join('\n');
      return {
        text: `هذه المنتجات المتاحة${query ? ` من ${query}` : ''} في السوق (${filtered.length}):\n${lines}`,
        category: 'السوق المحلي',
        action: { type: 'open_market', label: 'فتح السوق المحلي', prefill: {} },
      };
    } catch { /* fall through */ }
  }

  // Announcements query
  if ((m.includes('إعلان') || m.includes('اعلان') || m.includes('منشور')) &&
      (m.includes('هل') || m.includes('ما') || m.includes('وش') || m.includes('في') || m.includes('كم') || m.includes('?') || m.includes('؟'))) {
    try {
      const announcements = await fetchAnnouncements();
      if (!announcements.length) {
        return { text: 'لا توجد إعلانات حالياً.', category: 'الإعلانات', action: { type: 'open_add_announcement', label: 'نشر إعلان', prefill: {} } };
      }
      const top = announcements.slice(0, 3);
      const lines = top.map((a: any) => `• ${a.title}${a.event_date ? ` — ${a.event_date}` : ''}`).join('\n');
      return {
        text: `آخر الإعلانات (${announcements.length} إعلان):\n${lines}`,
        category: 'الإعلانات',
        action: { type: 'open_announcements', label: 'فتح الإعلانات', prefill: {} },
      };
    } catch { /* fall through */ }
  }

  // Reports query
  if ((m.includes('بلاغ') || m.includes('بلاغات')) &&
      (m.includes('آخر') || m.includes('كم') || m.includes('ما') || m.includes('وش') || m.includes('هل') || m.includes('?') || m.includes('؟'))) {
    try {
      const reports = await fetchReports();
      if (!reports.length) {
        return { text: 'لا توجد بلاغات مسجلة حالياً.', category: 'بلاغات المجتمع', action: { type: 'open_new_report', label: 'إرسال بلاغ', prefill: {} } };
      }
      const top = reports.slice(0, 3);
      const lines = top.map((r: any) => `• ${r.report_type}: ${(r.description || '').slice(0, 50)}${r.location ? ` (${r.location})` : ''}`).join('\n');
      return {
        text: `آخر البلاغات (${reports.length} بلاغ):\n${lines}`,
        category: 'بلاغات المجتمع',
        action: { type: 'open_reports', label: 'فتح البلاغات', prefill: {} },
      };
    } catch { /* fall through */ }
  }

  return null;
}

// ── Main exported function ─────────────────────────────────────────────────

export async function getAssistantResponse(message: string, history: ConversationTurn[] = []): Promise<AssistantResponse> {
  // Try real-data queries first (no Gemini needed)
  const realDataResponse = await handleRealDataQuery(message);
  if (realDataResponse) return realDataResponse;

  const result = await askWahaAssistant(message, history);
  return geminiResultToResponse(result);
}

export function getMockResponse(message: string): AssistantResponse {
  const result = fallbackAssistantResponse(message);
  return geminiResultToResponse(result);
}

export const QUICK_PROMPTS: { label: string; message: string; icon: string }[] = [
  { label: 'أبيع تمر', message: 'أريد أبيع تمر', icon: 'shopping-basket' },
  { label: 'مزاد', message: 'أريد أسوي مزاد', icon: 'shopping-basket' },
  { label: 'الشارع مظلم', message: 'الشارع مظلم', icon: 'flag' },
  { label: 'توصيلة توام', message: 'أحتاج توصيلة لمستشفى توام', icon: 'car' },
  { label: 'الفعاليات القادمة', message: 'ما الفعاليات القادمة؟', icon: 'megaphone' },
  { label: 'نشر إعلان', message: 'أريد أعلن عن مناسبة', icon: 'megaphone' },
  { label: 'أقرب مركز صحي', message: 'أقرب مركز صحي', icon: 'heart-pulse' },
  { label: 'فحص محصول', message: 'أريد فحص محصول', icon: 'sprout' },
  { label: 'إرسال بلاغ', message: 'أريد أرسل بلاغ', icon: 'flag' },
  { label: 'حسابي', message: 'افتح حسابي', icon: 'building' },
];
