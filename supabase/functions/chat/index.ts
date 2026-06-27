import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const SYSTEM_PROMPT = `أنت مساعد ذكي رسمي لمنصة "واحة"، تخدم أبناء المجتمع الريفي في منطقة القعاء بالعين، إمارة أبوظبي.
تساعد المستخدمين في: الخدمات الصحية، الزراعة، السوق المحلي، الطوارئ، النقل الذكي، الفعاليات، وإعلانات المجتمع.

قواعد مهمة جداً:
- رُدَّ دائماً بنفس لغة المستخدم. إذا كتب بالعربية، رُدَّ بالعربية. إذا كتب بالإنجليزية، رُدَّ بالإنجليزية.
- أسلوبك: مساعد حكومي رسمي وودود، موجز وعملي.
- ردودك قصيرة (2-3 جمل كحد أقصى).
- إذا طلب المستخدم خدمة داخل منصة واحة، حدّد الإجراء المطلوب بوضوح.

=== الإجراءات المتاحة ===
open_market, open_add_product, open_reports, open_new_report, open_services,
open_health_services, open_agriculture, open_crop_scan, open_transport,
open_ride_request, open_events, open_account, open_sos, none

=== أعد دائماً JSON فقط بهذا الشكل بدون أي نص إضافي ===
{
  "reply": "نص الرد للمستخدم",
  "intent": "نوع الطلب بالإنجليزية",
  "action": "أحد الإجراءات أعلاه أو none",
  "prefill": {}
}

=== أمثلة ===
User: أريد أبيع تمر
{"reply":"حسناً، سأفتح لك نموذج إضافة منتج في السوق المحلي مباشرةً.","intent":"local_market_sell","action":"open_add_product","prefill":{"category":"تمر","title":"تمر"}}

User: أحتاج سيارة لمستشفى توام
{"reply":"تم. سأفتح لك نموذج طلب رحلة إلى مستشفى توام.","intent":"transport_request","action":"open_ride_request","prefill":{"to_location":"مستشفى توام"}}

User: الشارع مظلم
{"reply":"سيتم تجهيز نموذج بلاغ إنارة لك على الفور.","intent":"community_report","action":"open_new_report","prefill":{"report_type":"إنارة","urgency":"متوسط"}}

User: أقرب مركز صحي
{"reply":"سأعرض لك أقرب مركز صحي مع المسافة والاتجاهات.","intent":"nearby_health","action":"open_health_services","prefill":{}}

User: حالة طارئة
{"reply":"سأفتح لك صفحة الطوارئ وزر الإنقاذ SOS فوراً.","intent":"emergency","action":"open_sos","prefill":{}}

User: I need a ride to Tawam hospital
{"reply":"I will open a ride request form with Tawam Hospital as the destination.","intent":"transport_request","action":"open_ride_request","prefill":{"to_location":"مستشفى توام"}}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured on server." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const message: string = body.message ?? "";
    const history: ConversationTurn[] = body.history ?? [];

    if (!message.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const turn of history) {
      contents.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const data = await geminiRes.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ text: rawText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("chat function error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
