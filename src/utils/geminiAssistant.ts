/**
 * Waaha AI Assistant — Gemini integration
 *
 * Call order:
 * 1. Try backend edge function (GEMINI_API_KEY must be set as Supabase secret)
 * 2. If edge function unavailable AND VITE_GEMINI_API_KEY is set, call Gemini directly
 * 3. If both fail → keyword-based local fallback (isFallback: true)
 */

const EDGE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface GeminiResult {
  reply: string;
  intent: string;
  action: string | null;
  prefill: Record<string, string>;
  raw?: string;
  isFallback?: boolean;
  confidence?: 'low' | 'medium' | 'high';
}

// ── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `أنت "مساعد واحة الذكي"، مساعد رسمي لمنصة "واحة" لمجتمع القوع، أبوظبي.

CRITICAL RULES — READ CAREFULLY:
1. Return ONLY one valid JSON object. Nothing else. No text before or after.
2. Do NOT include markdown, code fences (no \`\`\`), or backticks.
3. Do NOT include the word "JSON" or "JSON format" anywhere.
4. Do NOT add explanations, comments, or extra text outside the JSON.
5. The "reply" field must contain ONLY a short natural Arabic (or English) message for the user.
6. Do NOT put JSON, code, or technical text inside the "reply" field.
7. Do NOT invent data, names, prices, phone numbers, or places.
8. The user will NEVER see the raw JSON — only the "reply" text.

الإجراءات المتاحة (action field):
open_market | open_add_product | open_reports | open_new_report | open_services |
open_health_services | open_health_consultation | open_agriculture | open_crop_scan | open_agri_advice_request |
open_transport | open_ride_request | open_events | open_add_event | open_event_registration |
open_announcements | open_add_announcement | open_account | open_sos |
open_market_search | open_events_search | open_reports_search | open_location_search | none

JSON shape — return exactly this structure:
{"reply":"...","intent":"...","action":"...","prefill":{},"confidence":"high"}

intents: sell_product | auction_product | buy_product | market_search |
create_announcement | create_event | event_registration |
report_issue | report_lighting | report_road | report_cleanliness | report_water | report_security |
transport_request | health_services | health_consultation | nearby_health |
agriculture_scan | agriculture_advice | nearby_services | emergency | account | general

EXAMPLES (return exactly this format — no extra text):

User: "أريد أبيع تمر خلاص فاخر"
{"reply":"تمام، سأفتح لك نموذج إضافة منتج تمر في السوق المحلي وأعبّي البيانات.","intent":"sell_product","action":"open_add_product","prefill":{"title":"تمر خلاص فاخر","category":"تمر","type":"بيع","description":"تمر خلاص فاخر"},"confidence":"high"}

User: "أريد أسوي مزاد خروف"
{"reply":"تمام، سأفتح نموذج إضافة منتج جديد كمزاد في السوق المحلي.","intent":"auction_product","action":"open_add_product","prefill":{"title":"خروف","category":"مواشي","isAuction":"true"},"confidence":"high"}

User: "أريد أعلن عن اجتماع في المسجد"
{"reply":"تمام، سأفتح لك نموذج نشر إعلان وأعبّي العنوان والتصنيف.","intent":"create_announcement","action":"open_add_announcement","prefill":{"title":"اجتماع في المسجد","category":"مناسبة","description":"اجتماع في المسجد"},"confidence":"high"}

User: "الشارع مظلم"
{"reply":"سأفتح لك نموذج بلاغ إنارة وأعبّي نوع البلاغ.","intent":"report_lighting","action":"open_new_report","prefill":{"report_type":"إنارة","urgency":"متوسط","description":"الشارع مظلم"},"confidence":"high"}

User: "فيه حفرة في الطريق"
{"reply":"سأفتح نموذج بلاغ طرق.","intent":"report_road","action":"open_new_report","prefill":{"report_type":"طرق","urgency":"متوسط","description":"حفرة في الطريق"},"confidence":"high"}

User: "أحتاج سيارة لمستشفى توام"
{"reply":"سأفتح لك نموذج طلب رحلة إلى مستشفى توام.","intent":"transport_request","action":"open_ride_request","prefill":{"to_location":"مستشفى توام"},"confidence":"high"}

User: "أريد أضيف فعالية زراعية"
{"reply":"سأفتح نموذج نشر فعالية جديدة بتصنيف زراعي.","intent":"create_event","action":"open_add_event","prefill":{"category":"زراعي","title":"فعالية زراعية"},"confidence":"high"}

User: "أقرب مركز صحي"
{"reply":"سأفتح لك الخدمات الصحية القريبة.","intent":"health_services","action":"open_health_services","prefill":{},"confidence":"high"}

User: "عندي نخلة أوراقها صفراء"
{"reply":"يبدو أن النخلة تعاني من اصفرار الأوراق. سأفتح فحص المحصول بالذكاء الاصطناعي.","intent":"agriculture_scan","action":"open_crop_scan","prefill":{"problem":"اصفرار أوراق النخلة"},"confidence":"high"}

User: "حالة طارئة"
{"reply":"سأفتح صفحة الطوارئ وزر SOS فوراً. رقم الطوارئ 999.","intent":"emergency","action":"open_sos","prefill":{},"confidence":"high"}

User: "افتح حسابي"
{"reply":"سأفتح لك صفحة حسابك.","intent":"account","action":"open_account","prefill":{},"confidence":"high"}

User: "ما الفعاليات القادمة؟"
{"reply":"سأفتح قسم الفعاليات لعرض الفعاليات المتاحة.","intent":"general","action":"open_events","prefill":{},"confidence":"high"}

User: "هل يوجد تمر للبيع؟"
{"reply":"سأفتح السوق المحلي مع البحث عن تمر.","intent":"market_search","action":"open_market_search","prefill":{"query":"تمر"},"confidence":"high"}

User: "أرسل بلاغ"
{"reply":"سأفتح لك نموذج بلاغ جديد.","intent":"report_issue","action":"open_new_report","prefill":{},"confidence":"high"}

REMEMBER: Output ONLY the JSON object above. No extra words. No markdown. No code fences.`;

// ── Allowed actions whitelist ──────────────────────────────────────────────

const ALLOWED_ACTIONS = new Set([
  'open_market', 'open_add_product', 'open_reports', 'open_new_report',
  'open_services', 'open_health_services', 'open_health_consultation',
  'open_agriculture', 'open_crop_scan', 'open_agri_advice_request',
  'open_transport', 'open_ride_request', 'open_events', 'open_add_event',
  'open_event_registration', 'open_announcements', 'open_add_announcement',
  'open_account', 'open_sos', 'open_market_search', 'open_events_search',
  'open_reports_search', 'open_location_search', 'none',
]);

// ── Reply sanitizer ────────────────────────────────────────────────────────

function looksLikeJsonOrCode(text: string): boolean {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[') || t.startsWith('```')) return true;
  if (/"reply"\s*:/.test(t)) return true;
  if (/"intent"\s*:/.test(t)) return true;
  if (/JSON format/i.test(t)) return true;
  if (/JSON object/i.test(t)) return true;
  return false;
}

function sanitizeReply(text: string): string {
  // Strip markdown fences
  let t = text.replace(/```(?:json)?[\s\S]*?```/g, '').trim();
  // Strip inline code
  t = t.replace(/`[^`]*`/g, '').trim();
  // Strip full JSON blobs
  t = t.replace(/\{[\s\S]*?\}/g, '').trim();
  // Strip "reply": labels
  t = t.replace(/"reply"\s*:\s*/gi, '').trim();
  // Strip surrounding quotes left from JSON
  t = t.replace(/^["']|["']$/g, '').trim();
  return t;
}

// ── JSON parser ────────────────────────────────────────────────────────────

export function parseGeminiResponse(rawText: string): GeminiResult | null {
  if (!rawText || !rawText.trim()) return null;

  // Strip markdown code fences
  let cleaned = rawText
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  // Find the first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonSlice = cleaned.slice(start, end + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    // Try to repair common issues: trailing commas, unquoted values
    try {
      const repaired = jsonSlice
        .replace(/,\s*([}\]])/g, '$1')   // trailing commas
        .replace(/(\w+)\s*:/g, (m, k) => `"${k}":`)  // unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"');          // single-quoted values
      parsed = JSON.parse(repaired);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  // Validate and clean reply
  let reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';

  // If reply looks like JSON/code, sanitize or discard
  if (looksLikeJsonOrCode(reply)) {
    const sanitized = sanitizeReply(reply);
    if (!sanitized || sanitized.length < 3 || looksLikeJsonOrCode(sanitized)) {
      return null; // Will fall back to keyword fallback
    }
    reply = sanitized;
  }

  if (!reply || reply.length < 2) return null;

  // Validate action
  let action: string | null = null;
  if (parsed.action && typeof parsed.action === 'string') {
    const a = parsed.action.trim();
    if (ALLOWED_ACTIONS.has(a) && a !== 'none') {
      action = a;
    }
  }

  // Validate prefill
  const prefill: Record<string, string> =
    parsed.prefill && typeof parsed.prefill === 'object' && !Array.isArray(parsed.prefill)
      ? (parsed.prefill as Record<string, string>)
      : {};

  const confidence = ['low', 'medium', 'high'].includes(parsed.confidence)
    ? (parsed.confidence as 'low' | 'medium' | 'high')
    : 'medium';

  return {
    reply,
    intent: String(parsed.intent || 'general').trim(),
    action,
    prefill,
    raw: rawText,
    confidence,
  };
}

// ── Keyword fallback ───────────────────────────────────────────────────────

export function fallbackAssistantResponse(message: string): GeminiResult {
  const m = message.toLowerCase();
  const orig = message;

  // Sell product
  if (m.includes('ابيع') || m.includes('أبيع') || m.includes('بيع') || m.includes('sell') || m.includes('أنشر منتج') || m.includes('أضيف منتج')) {
    let category = 'منتجات';
    let title = '';
    if (m.includes('تمر') || m.includes('خلاص') || m.includes('برحي') || m.includes('مجهول')) { category = 'تمر'; title = orig.replace(/أريد|ابيع|أبيع|بيع|sell/gi, '').trim() || 'تمر'; }
    else if (m.includes('عسل')) { category = 'عسل'; title = 'عسل'; }
    else if (m.includes('خضار') || m.includes('طماطم') || m.includes('خيار')) { category = 'خضار'; title = m.includes('طماطم') ? 'طماطم' : 'خضار'; }
    else if (m.includes('خروف') || m.includes('ماشية') || m.includes('مواشي') || m.includes('إبل') || m.includes('ناقة')) { category = 'مواشي'; title = m.includes('خروف') ? 'خروف' : 'مواشي'; }
    return { reply: `سأفتح لك نموذج إضافة منتج في السوق المحلي${title ? ` وأعبّي اسم المنتج.` : '.'}`, intent: 'sell_product', action: 'open_add_product', prefill: { category, ...(title ? { title, type: 'بيع' } : { type: 'بيع' }) }, isFallback: true, confidence: 'high' };
  }

  // Auction
  if (m.includes('مزاد') || m.includes('auction')) {
    let title = '';
    let category = 'منتجات';
    if (m.includes('خروف') || m.includes('مواشي')) { title = 'خروف'; category = 'مواشي'; }
    else if (m.includes('تمر')) { title = 'تمر'; category = 'تمر'; }
    return { reply: 'سأفتح نموذج إضافة منتج جديد كمزاد في السوق المحلي.', intent: 'auction_product', action: 'open_add_product', prefill: { ...(title ? { title } : {}), category, isAuction: 'true', type: 'مزاد' }, isFallback: true, confidence: 'high' };
  }

  // Report – lighting
  if (m.includes('مظلم') || m.includes('ظلام') || m.includes('إنارة') || m.includes('انارة') || m.includes('lighting') || m.includes('كشاف') || m.includes('مصباح'))
    return { reply: 'سأفتح لك نموذج بلاغ إنارة وأعبّي نوع البلاغ.', intent: 'report_lighting', action: 'open_new_report', prefill: { report_type: 'إنارة', urgency: 'متوسط', description: orig }, isFallback: true, confidence: 'high' };

  // Report – road
  if (m.includes('حفرة') || (m.includes('طريق') && (m.includes('مشكل') || m.includes('كسر') || m.includes('خطر'))) || m.includes('road') || m.includes('إسفلت'))
    return { reply: 'سأفتح نموذج بلاغ طرق.', intent: 'report_road', action: 'open_new_report', prefill: { report_type: 'طرق', urgency: 'متوسط', description: orig }, isFallback: true, confidence: 'high' };

  // Report – cleanliness
  if (m.includes('نظافة') || m.includes('قمامة') || m.includes('مخلفات') || m.includes('زبالة') || m.includes('قاذورات'))
    return { reply: 'سأفتح نموذج بلاغ نظافة.', intent: 'report_cleanliness', action: 'open_new_report', prefill: { report_type: 'نظافة', urgency: 'منخفض', description: orig }, isFallback: true, confidence: 'high' };

  // Report – water
  if ((m.includes('مياه') || m.includes('ماء') || m.includes('water')) && (m.includes('بلاغ') || m.includes('تسريب') || m.includes('مشكل') || m.includes('أبلغ') || m.includes('ابلغ')))
    return { reply: 'سأفتح نموذج بلاغ مياه.', intent: 'report_water', action: 'open_new_report', prefill: { report_type: 'مياه', urgency: 'عالي', description: orig }, isFallback: true, confidence: 'high' };

  // Report – security
  if ((m.includes('أمن') || m.includes('امن') || m.includes('سرقة') || m.includes('security')) && (m.includes('بلاغ') || m.includes('أبلغ') || m.includes('ابلغ') || m.includes('مشكل')))
    return { reply: 'سأفتح نموذج بلاغ أمن.', intent: 'report_security', action: 'open_new_report', prefill: { report_type: 'أمن', urgency: 'عالي', description: orig }, isFallback: true, confidence: 'high' };

  // Report – generic
  if (m.includes('بلاغ') || m.includes('ابلغ') || m.includes('أبلغ') || m.includes('report') || (m.includes('مشكلة') && !m.includes('سوق')))
    return { reply: 'سأفتح لك نموذج بلاغ جديد.', intent: 'report_issue', action: 'open_new_report', prefill: { description: orig }, isFallback: true, confidence: 'medium' };

  // Transport
  if (m.includes('توصيلة') || m.includes('رحلة') || m.includes('ride') || m.includes('transport') || (m.includes('سيارة') && m.includes('أحتاج')) || (m.includes('نقل') && !m.includes('ناقة'))) {
    const prefill: Record<string, string> = {};
    if (m.includes('توام') || m.includes('tawam')) prefill.to_location = 'مستشفى توام';
    else if (m.includes('العين') || m.includes('عين')) prefill.to_location = 'العين';
    else if (m.includes('أبوظبي') || m.includes('ابوظبي')) prefill.to_location = 'أبوظبي';
    return { reply: `سأفتح لك طلب رحلة في قسم النقل الذكي${prefill.to_location ? ` إلى ${prefill.to_location}` : ''}.`, intent: 'transport_request', action: 'open_ride_request', prefill, isFallback: true, confidence: 'high' };
  }

  // Emergency
  if (m.includes('طارئ') || m.includes('طوارئ') || m.includes('sos') || m.includes('emergency') || m.includes('إسعاف') || m.includes('اسعاف') || m.includes('حريق') || (m.includes('شرطة') && m.includes('احتاج')))
    return { reply: 'سأفتح لك صفحة الطوارئ وزر SOS فوراً. رقم الطوارئ: 999.', intent: 'emergency', action: 'open_sos', prefill: {}, isFallback: true, confidence: 'high' };

  // Health services
  if (m.includes('مركز صحي') || m.includes('عيادة') || m.includes('clinic') || m.includes('doctor') || (m.includes('صحة') && !m.includes('صحي')))
    return { reply: 'سأفتح لك الخدمات الصحية.', intent: 'health_services', action: 'open_health_services', prefill: {}, isFallback: true, confidence: 'high' };

  if (m.includes('مستشفى') || m.includes('hospital'))
    return { reply: 'سأفتح لك الخدمات الصحية مع المستشفيات القريبة.', intent: 'health_services', action: 'open_health_services', prefill: {}, isFallback: true, confidence: 'high' };

  // Events – create
  if ((m.includes('فعالية') || m.includes('فعاليه') || m.includes('دورة') || m.includes('ورشة')) &&
      (m.includes('أضيف') || m.includes('انشر') || m.includes('أنشر') || m.includes('إضافة') || m.includes('نشر') || m.includes('إنشاء'))) {
    let category = 'مجتمعي';
    if (m.includes('زراع') || m.includes('نخيل')) category = 'زراعي';
    else if (m.includes('قرآن') || m.includes('ديني')) category = 'قرآني';
    else if (m.includes('وطني')) category = 'وطني';
    else if (m.includes('صحي') || m.includes('طبي')) category = 'صحي';
    return { reply: `سأفتح نموذج نشر فعالية جديدة${category !== 'مجتمعي' ? ` بتصنيف ${category}` : ''}.`, intent: 'create_event', action: 'open_add_event', prefill: { category }, isFallback: true, confidence: 'high' };
  }

  // Events – browse
  if (m.includes('فعالية') || m.includes('فعاليه') || m.includes('فعاليات') || m.includes('event'))
    return { reply: 'سأفتح لك قسم فعاليات المنطقة.', intent: 'general', action: 'open_events', prefill: {}, isFallback: true, confidence: 'high' };

  // Announcements – create
  if ((m.includes('أعلن') || m.includes('اعلن') || m.includes('انشر إعلان') || m.includes('أنشر إعلان') || m.includes('إضافة إعلان')) ||
      (m.includes('إعلان') && (m.includes('أضيف') || m.includes('نشر') || m.includes('انشر') || m.includes('إنشاء')))) {
    let category = 'اجتماعي';
    let title = '';
    if (m.includes('مسجد') || m.includes('صلاة')) { category = 'مناسبة'; title = 'اجتماع في المسجد'; }
    else if (m.includes('مناسبة') || m.includes('اجتماع') || m.includes('حفلة')) { category = 'مناسبة'; }
    else if (m.includes('زراع')) category = 'زراعي';
    else if (m.includes('صحي') || m.includes('صحة')) category = 'صحي';
    return { reply: 'سأفتح نموذج نشر إعلان جديد وأعبّي التصنيف.', intent: 'create_announcement', action: 'open_add_announcement', prefill: { category, ...(title ? { title } : {}) }, isFallback: true, confidence: 'high' };
  }

  // Announcements – browse
  if (m.includes('إعلان') || m.includes('اعلان') || m.includes('اعلانات') || m.includes('منشور'))
    return { reply: 'سأفتح لك قسم الإعلانات.', intent: 'general', action: 'open_announcements', prefill: {}, isFallback: true, confidence: 'high' };

  // Agriculture
  if (m.includes('زراعة') || m.includes('نخيل') || m.includes('نخلة') || m.includes('crop') || m.includes('محصول') || m.includes('سوسة') || m.includes('آفة') || m.includes('مرض') || m.includes('فحص محصول')) {
    const prefill: Record<string, string> = {};
    if (m.includes('اصفرار') || m.includes('صفراء')) prefill.problem = 'اصفرار أوراق النخلة';
    else if (m.includes('سوسة')) prefill.problem = 'سوسة النخيل';
    else if (m.includes('مرض') || m.includes('آفة')) prefill.problem = 'مرض أو آفة';
    return { reply: 'سأفتح لك قسم الزراعة لفحص محصولك بالذكاء الاصطناعي.', intent: 'agriculture_scan', action: 'open_crop_scan', prefill, isFallback: true, confidence: 'high' };
  }

  // Account
  if (m.includes('حسابي') || m.includes('منتجاتي') || m.includes('إعلاناتي') || m.includes('فعالياتي') || m.includes('ملفي') || m.includes('account'))
    return { reply: 'سأفتح لك صفحة حسابك.', intent: 'account', action: 'open_account', prefill: {}, isFallback: true, confidence: 'high' };

  // Market search
  if (m.includes('تمر') || m.includes('عسل') || m.includes('خضار') || m.includes('سوق') || m.includes('market') || m.includes('منتج')) {
    const query = m.includes('تمر') ? 'تمر' : m.includes('عسل') ? 'عسل' : m.includes('خضار') ? 'خضار' : '';
    return { reply: `سأفتح لك السوق المحلي${query ? ` لعرض ${query}` : ''}.`, intent: 'market_search', action: query ? 'open_market_search' : 'open_market', prefill: query ? { query } : {}, isFallback: true, confidence: 'medium' };
  }

  // Unknown
  return {
    reply: 'لم أفهم الطلب بدقة. تقدر تقول مثلاً: أريد أبيع تمر، الشارع مظلم، أحتاج توصيلة، أو ما الفعاليات القادمة؟',
    intent: 'general',
    action: null,
    prefill: {},
    isFallback: true,
    confidence: 'low',
  };
}

// ── Build Gemini-format content array from history ──────────────────────────

function buildContents(history: ConversationTurn[], message: string) {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const turn of history) {
    if (!turn.text.trim()) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });
  return contents;
}

// ── Direct Gemini call (frontend key) ─────────────────────────────────────

async function callGeminiDirect(
  message: string,
  history: ConversationTurn[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: buildContents(history, message),
      generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ── Edge function call (backend) ───────────────────────────────────────────

async function callEdgeFunction(
  message: string,
  history: ConversationTurn[],
): Promise<string> {
  const res = await fetch(EDGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ message, history }),
  });

  if (res.status === 503) throw new Error('EDGE_NO_KEY');
  if (!res.ok) throw new Error(`Edge function error ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error('EDGE_NO_KEY');
  const text: string = data.text ?? '';
  if (!text) throw new Error('Empty edge response');
  return text;
}

// ── Main exported function ─────────────────────────────────────────────────

export async function sendMessageToGemini(
  history: ConversationTurn[],
  currentMessage: string,
): Promise<GeminiResult> {
  let rawText: string | null = null;

  // 1. Try backend edge function
  try {
    rawText = await callEdgeFunction(currentMessage, history);
  } catch (edgeErr) {
    const isNoKey =
      edgeErr instanceof Error && edgeErr.message.includes('EDGE_NO_KEY');

    if (isNoKey || !rawText) {
      const hasFrontendKey = !!import.meta.env.VITE_GEMINI_API_KEY;
      if (hasFrontendKey) {
        try {
          rawText = await callGeminiDirect(currentMessage, history);
        } catch (directErr) {
          console.error('Gemini direct call error:', directErr);
        }
      } else {
        console.error('Edge function error:', edgeErr);
      }
    } else {
      console.error('Edge function error:', edgeErr);
    }
  }

  // No response from any source → fallback
  if (!rawText) {
    return { ...fallbackAssistantResponse(currentMessage), isFallback: true };
  }

  // Parse the response
  const parsed = parseGeminiResponse(rawText);

  // Valid structured response
  if (parsed && parsed.reply && parsed.reply.length > 2 && !looksLikeJsonOrCode(parsed.reply)) {
    return parsed;
  }

  // Gemini returned something but parse failed or reply is bad → use fallback
  // NEVER show raw Gemini text to the user
  console.warn('[Assistant] Gemini response could not be parsed cleanly, using fallback. Raw:', rawText.slice(0, 200));
  return { ...fallbackAssistantResponse(currentMessage), isFallback: true };
}

// ── Legacy alias ───────────────────────────────────────────────────────────

export async function askWahaAssistant(
  message: string,
  history: ConversationTurn[] = [],
): Promise<GeminiResult> {
  return sendMessageToGemini(history, message);
}

export function buildWahaPrompt(message: string): string {
  return message;
}
