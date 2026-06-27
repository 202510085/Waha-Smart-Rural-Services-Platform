import { useState, useEffect, useRef } from 'react';
import {
  Sprout, Plus, X, TrendingUp, CheckCircle2,
  Bug, Leaf, Droplets, ChevronDown, ChevronLeft,
  ScanLine, Loader2, Lightbulb, Camera, Upload, ImagePlus, AlertCircle,
} from 'lucide-react';
import { COMMON_AGRI_PROBLEMS } from './storage';
import type { Profile } from './utils/auth';
import { fetchAgriRequests, insertAgriRequest, uploadOptionalImage, handleSupabaseError } from './lib/data';
import { useTranslation } from './i18n/LanguageContext';

interface Props {
  user: Profile | null;
  onToast: (msg: string) => void;
}

const PROBLEM_ICONS: Record<string, typeof Bug> = {
  'سوسة النخيل': Bug,
  'اصفرار الأوراق': Leaf,
  'قلة الري': Droplets,
  'أمراض التربة': Bug,
};

interface CropScanResult {
  isPlant: boolean;
  plantType?: string;
  visibleIssue?: string;
  confidence?: 'low' | 'medium' | 'high';
  advice?: string;
  disclaimer?: string;
  rawText?: string;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function analyzeCropImage(base64Data: string, mimeType: string): Promise<CropScanResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');

  const prompt = `أنت خبير زراعي. حلل هذه الصورة وأجب بالعربية فقط.
أعطني JSON فقط بالشكل التالي (بدون markdown):
{
  "isPlant": true أو false,
  "plantType": "نوع النبات أو المحصول إن كان واضحاً",
  "visibleIssue": "المشكلة الظاهرة مثل اصفرار أو بقع أو جفاف أو آفات",
  "confidence": "low أو medium أو high",
  "advice": "نصيحة أولية مختصرة",
  "disclaimer": "هذه ملاحظة مبدئية وليست تشخيصاً نهائياً. يُنصح باستشارة مختص زراعي."
}
إذا لم تكن الصورة لنبات أو محصول: ضع isPlant: false واشرح ذلك في visibleIssue.
لا تذكر مبيدات مقيدة أو كيماويات خطرة. لا تدعي يقيناً.`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!rawText) throw new Error('Empty Gemini response');

  try {
    const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return {
        isPlant: !!parsed.isPlant,
        plantType: parsed.plantType || undefined,
        visibleIssue: parsed.visibleIssue || undefined,
        confidence: parsed.confidence || 'low',
        advice: parsed.advice || undefined,
        disclaimer: parsed.disclaimer || 'هذه ملاحظة مبدئية وليست تشخيصاً نهائياً. يُنصح باستشارة مختص زراعي.',
        rawText,
      };
    }
  } catch {
    // JSON parse failed — return raw text
  }
  return { isPlant: true, rawText, disclaimer: 'هذه ملاحظة مبدئية وليست تشخيصاً نهائياً. يُنصح باستشارة مختص زراعي.' };
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgricultureView({ user, onToast }: Props) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [form, setForm] = useState({ crop: '', problem: '', phone: '', hasWhatsApp: false });

  // AI scan state
  const [scanMode, setScanMode] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CropScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanGalleryRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);

  // Form image state
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const formGalleryRef = useRef<HTMLInputElement>(null);
  const formCameraRef = useRef<HTMLInputElement>(null);

  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAgriRequests();
        if (active) setRequests(data);
      } catch (err) {
        console.error('[AgricultureView] Agri requests fetch failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crop.trim() || !form.problem.trim()) {
      onToast('يرجى إدخال نوع المحصول ووصف المشكلة');
      return;
    }
    if (!user) {
      onToast('يجب تسجيل الدخول لإرسال طلب');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (formImageFile && user) {
        const url = await uploadOptionalImage('agri-images', formImageFile, user.id);
        if (url) {
          imageUrl = url;
        } else {
          onToast('تعذر رفع الصورة، سيتم إرسال الطلب بدونها');
        }
      }
      const aiDiagnosis = scanResult?.isPlant ? (scanResult.visibleIssue || scanResult.plantType) : undefined;
      const newRow = await insertAgriRequest(user, {
        cropType: form.crop,
        problemDescription: form.problem,
        imageUrl,
        aiDiagnosis,
      });
      setRequests((prev) => [newRow, ...prev]);
      setForm({ crop: '', problem: '', phone: '', hasWhatsApp: false });
      setFormImageFile(null);
      setFormImagePreview(null);
      setShowForm(false);
      setScanResult(null);
      setScanImage(null);
      setScanFile(null);
      setScanMode(false);
      onToast('تم إرسال طلب الاستشارة الزراعية بنجاح');
    } catch (err: any) {
      console.error('[AgricultureView] Agriculture request submit failed:', err);
      onToast(handleSupabaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, forScan: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }
    if (forScan) {
      setScanFile(file);
      setScanResult(null);
      setScanError(null);
      const reader = new FileReader();
      reader.onload = () => setScanImage(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleScan = async () => {
    if (!scanFile) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const { base64, mimeType } = await fileToBase64(scanFile);
      const result = await analyzeCropImage(base64, mimeType);
      setScanResult(result);
      if (!result.isPlant) {
        setScanError('الصورة لا تبدو لنبات أو محصول. يرجى رفع صورة واضحة للنبات.');
      }
    } catch (err: any) {
      console.error('[AgricultureView] Crop scan failed:', err);
      if (err.message === 'NO_KEY') {
        setScanError('تحليل الصورة بالذكاء الاصطناعي غير مفعل حالياً، يمكنك إرسال طلب استشارة زراعية.');
      } else {
        setScanError('تعذر تحليل الصورة. تحقق من اتصال الإنترنت وحاول مجدداً.');
      }
    } finally {
      setScanning(false);
    }
  };

  const resetScan = () => {
    setScanImage(null);
    setScanFile(null);
    setScanResult(null);
    setScanError(null);
    setScanMode(false);
  };

  const severityColor = (s?: string) =>
    s === 'عالي' || s === 'high' ? 'bg-red-100 dark:bg-[#200808] text-red-700 dark:text-[#f06060]'
    : s === 'متوسط' || s === 'medium' ? 'bg-amber-100 dark:bg-[#3a280a] text-amber-700 dark:text-[#e0ae50]'
    : 'bg-emerald-100 dark:bg-[#0e2a1a] text-emerald-700 dark:text-[#50c088]';

  const formatDate = (createdAt: string) => {
    try {
      const d = new Date(createdAt);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'الآن';
      if (mins < 60) return `قبل ${mins} دقيقة`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `قبل ${hours} ساعة`;
      return `قبل ${Math.floor(hours / 24)} يوم`;
    } catch { return createdAt; }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-emerald-50 dark:bg-[#0d2018] border border-emerald-200 dark:border-[#1a4030] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Sprout size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-[#e8ede9]">خدمات الزراعة</h2>
          <p className="text-sm text-stone-600 dark:text-[#b0bdb3] mt-0.5">إرشادات زراعية، نصائح، فحص المحاصيل بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* AI Crop Scan */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <ScanLine size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">فحص المحاصيل بالذكاء الاصطناعي</h3>
            <p className="text-sm text-white/80">
              {hasGeminiKey ? 'ارفع صورة للمحصول واحصل على ملاحظة أولية' : 'يمكنك إرسال طلب استشارة زراعية بدلاً من ذلك'}
            </p>
          </div>
        </div>

        {!hasGeminiKey ? (
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm text-white/90 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            تحليل الصورة بالذكاء الاصطناعي غير مفعل حالياً، يمكنك إرسال طلب استشارة زراعية.
          </div>
        ) : !scanMode ? (
          <button onClick={() => setScanMode(true)}
            className="w-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            <ScanLine size={18} /> ابدأ الفحص
          </button>
        ) : (
          <div className="bg-white/10 rounded-xl p-4">
            {!scanImage ? (
              <div className="space-y-2">
                <p className="text-sm text-white/80 text-center mb-3">اختر طريقة رفع الصورة:</p>
                <button onClick={() => scanCameraRef.current?.click()}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl py-3 flex items-center justify-center gap-2 text-white font-medium transition">
                  <Camera size={18} /> التقط صورة بالكاميرا
                </button>
                <button onClick={() => scanGalleryRef.current?.click()}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl py-3 flex items-center justify-center gap-2 text-white font-medium transition">
                  <Upload size={18} /> اختر من المعرض
                </button>
                <button onClick={resetScan}
                  className="w-full text-white/70 hover:text-white text-sm py-2 transition">
                  إلغاء
                </button>
              </div>
            ) : (
              <div>
                <div className="relative rounded-xl overflow-hidden mb-3">
                  <img src={scanImage} alt="محصول" className="w-full h-48 object-cover" />
                  {scanning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={36} className="animate-spin text-white" />
                      <p className="text-white text-sm font-semibold">جاري تحليل الصورة بالذكاء الاصطناعي...</p>
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 mb-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">{scanError}</p>
                  </div>
                )}

                {scanResult && !scanError && (
                  <div className="bg-white rounded-xl p-4 text-stone-800 mb-3 msg-appear">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <h4 className="font-bold">نتيجة الفحص الأولية</h4>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      {scanResult.plantType && (
                        <div>
                          <p className="text-xs text-stone-500 font-semibold">نوع النبات</p>
                          <p className="font-semibold text-stone-800">{scanResult.plantType}</p>
                        </div>
                      )}
                      {scanResult.visibleIssue && (
                        <div>
                          <p className="text-xs text-stone-500 font-semibold">المشكلة الظاهرة</p>
                          <p className="text-stone-700">{scanResult.visibleIssue}</p>
                        </div>
                      )}
                      {scanResult.advice && (
                        <div>
                          <p className="text-xs text-stone-500 font-semibold">النصيحة الأولية</p>
                          <p className="text-stone-700">{scanResult.advice}</p>
                        </div>
                      )}
                      {scanResult.confidence && (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-stone-500 font-semibold">مستوى الثقة:</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${severityColor(scanResult.confidence === 'high' ? 'عالي' : scanResult.confidence === 'medium' ? 'متوسط' : 'منخفض')}`}>
                            {scanResult.confidence === 'high' ? 'عالي' : scanResult.confidence === 'medium' ? 'متوسط' : 'منخفض'}
                          </span>
                        </div>
                      )}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                        <Lightbulb size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">{scanResult.disclaimer}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scanResult && scanResult.rawText && !scanResult.plantType && !scanResult.visibleIssue && (
                  <div className="bg-white rounded-xl p-4 text-stone-800 mb-3 msg-appear">
                    <p className="text-sm text-stone-700 leading-relaxed">{scanResult.rawText.slice(0, 400)}</p>
                    <p className="text-xs text-amber-700 mt-2 border-t pt-2">هذه ملاحظة مبدئية وليست تشخيصاً نهائياً. يُنصح باستشارة مختص زراعي.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!scanResult && !scanning && !scanError && (
                    <button onClick={handleScan}
                      className="flex-1 bg-white text-emerald-700 font-bold py-2.5 rounded-xl hover:bg-emerald-50 transition flex items-center justify-center gap-2">
                      <ScanLine size={16} /> تحليل الصورة
                    </button>
                  )}
                  {scanError && !scanning && (
                    <button onClick={() => { setScanImage(null); setScanFile(null); setScanError(null); setScanResult(null); }}
                      className="flex-1 bg-white text-emerald-700 font-bold py-2.5 rounded-xl hover:bg-emerald-50 transition">
                      اختر صورة أخرى
                    </button>
                  )}
                  <button onClick={resetScan}
                    className="bg-white/15 text-white font-medium py-2.5 px-4 rounded-xl hover:bg-white/25 transition flex items-center gap-1.5">
                    <X size={16} /> إغلاق
                  </button>
                </div>
              </div>
            )}
            <input ref={scanGalleryRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
            <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
          </div>
        )}
      </div>

      {/* Request advice button */}
      <button
        onClick={() => {
          if (user) setForm({ crop: '', problem: '', phone: user.phone, hasWhatsApp: user.whatsappEnabled });
          setShowForm(true);
        }}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition text-lg">
        <Plus size={20} /> طلب استشارة زراعية
      </button>

      {/* Sent requests */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-stone-500 dark:text-[#8a9a8e] py-6">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-sm">جاري تحميل الطلبات...</p>
        </div>
      ) : requests.length > 0 ? (
        <div>
          <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3">طلبات الاستشارة المرسلة</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-white dark:bg-[#1a2e21] border border-emerald-200 dark:border-[#1a4030] rounded-2xl p-3 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 dark:text-[#e8ede9] truncate">{r.crop_type}</p>
                  <p className="text-xs text-stone-500 dark:text-[#8a9a8e] truncate">{r.problem_description}</p>
                  {r.ai_diagnosis && (
                    <p className="text-xs text-emerald-600 dark:text-[#50c088] mt-0.5 truncate">🤖 {r.ai_diagnosis}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 dark:text-[#6a7a6e] whitespace-nowrap">{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Common problems */}
      <div>
        <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-3">مشاكل زراعية شائعة ونصائحها</h3>
        <div className="space-y-3">
          {COMMON_AGRI_PROBLEMS.map((p) => {
            const Icon = PROBLEM_ICONS[p.name] ?? Bug;
            const isExpanded = expandedProblem === p.name;
            return (
              <div key={p.name} className="bg-white dark:bg-[#1a2e21] border border-emerald-200 dark:border-[#1a4030] rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedProblem(isExpanded ? null : p.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-emerald-50/50 dark:hover:bg-[#1e3327] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-[#0e2a1a] flex items-center justify-center">
                      <Icon size={20} className="text-emerald-600 dark:text-[#40b080]" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-stone-800 dark:text-[#e8ede9]">{p.name}</h4>
                      <p className="text-xs text-stone-500 dark:text-[#8a9a8e]">{p.symptoms}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronLeft size={18} className="text-stone-400" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-emerald-100 dark:border-[#1a4030]">
                    <ul className="space-y-2">
                      {p.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-stone-600 dark:text-[#b0bdb3] flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date prices */}
      <div className="bg-emerald-50 dark:bg-[#0d2018] border border-emerald-200 dark:border-[#1a4030] rounded-2xl p-5">
        <h3 className="font-bold text-stone-800 dark:text-[#e8ede9] mb-2 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600 dark:text-[#40b080]" /> أسعار التمور التقريبية
        </h3>
        <p className="text-xs text-stone-500 dark:text-[#8a9a8e] mb-3">* أسعار تقريبية للمقارنة - قد تختلف حسب الجودة والموسم</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[{ n: 'خلاص', p: '25' }, { n: 'برحي', p: '18' }, { n: 'سكري', p: '22' }, { n: 'عجوة', p: '35' }].map((x) => (
            <div key={x.n} className="bg-white dark:bg-[#1a2e21] rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500 dark:text-[#8a9a8e]">{x.n}</p>
              <p className="font-bold text-emerald-700 dark:text-[#50c088]">{x.p} درهم</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#1a2e21] rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-emerald-500 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Sprout size={20} /> طلب استشارة زراعية</h3>
              <button onClick={() => setShowForm(false)} disabled={submitting} className="p-1.5 rounded-full hover:bg-white/15 disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">نوع المحصول *</label>
                <input type="text" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}
                  placeholder="مثال: نخيل، تمر، خضار" required
                  className="w-full bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">وصف المشكلة *</label>
                <textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  placeholder="اشرح المشكلة الزراعية بالتفصيل..." rows={3} required
                  className="w-full bg-stone-100 dark:bg-[#1e3327] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-[#d5ddd7] mb-2">صورة المشكلة (اختياري)</label>
                {formImagePreview && (
                  <div className="relative mb-2">
                    <img src={formImagePreview} alt="صورة المشكلة" className="w-full h-36 object-cover rounded-xl border border-stone-200 dark:border-[#2d4a35]" />
                    <button type="button" onClick={() => { setFormImageFile(null); setFormImagePreview(null); }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => formCameraRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#162519] text-stone-600 dark:text-[#b0bdb3] rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#1e3327] transition">
                    <Camera size={16} /> كاميرا
                  </button>
                  <button type="button" onClick={() => formGalleryRef.current?.click()}
                    className="border border-stone-200 dark:border-[#2d4a35] bg-stone-50 dark:bg-[#162519] text-stone-600 dark:text-[#b0bdb3] rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-[#1e3327] transition">
                    <ImagePlus size={16} /> معرض
                  </button>
                </div>
                <input ref={formGalleryRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                <input ref={formCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {submitting ? <><Loader2 size={18} className="animate-spin" /> جاري الإرسال...</> : <><Plus size={18} /> إرسال الطلب</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
