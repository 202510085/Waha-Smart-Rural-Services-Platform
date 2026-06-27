import { useState, useRef, useEffect } from 'react';
import {
  Send, Mic, Volume2, Trash2, X, Sparkles, Siren, Sprout, HeartPulse,
  ShoppingBasket, Megaphone, Flag, MapPin, Bot, User, Loader2, Building2, Truck, Car,
  Zap, Calendar, WifiOff, CheckCircle2, MicOff,
} from 'lucide-react';
import {
  getAssistantResponse, QUICK_PROMPTS,
  type AssistantResponse, type AssistantAction,
} from './assistant';
import type { ConversationTurn } from './utils/geminiAssistant';
import { useTranslation } from './i18n/LanguageContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  category?: string;
  action?: AssistantAction;
  isFallback?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAction: (action: AssistantAction) => void;
}

const CATEGORY_ICONS: Record<string, typeof Sprout> = {
  'الصحة': HeartPulse,
  'الزراعة': Sprout,
  'الطوارئ': Siren,
  'السوق المحلي': ShoppingBasket,
  'الإعلانات': Megaphone,
  'الموقع والخدمات': MapPin,
  'بلاغات المجتمع': Flag,
  'القافلة الذكية': Truck,
  'النقل الذكي': Car,
  'الفعاليات': Calendar,
  'عام': Sparkles,
};

const CATEGORY_COLORS: Record<string, string> = {
  'الصحة': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'الزراعة': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'الطوارئ': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'السوق المحلي': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'الإعلانات': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'الموقع والخدمات': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'بلاغات المجتمع': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'القافلة الذكية': 'bg-[#1a5c38] text-white dark:bg-[#0d3020] dark:text-emerald-300',
  'النقل الذكي': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'الفعاليات': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'عام': 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

const PROMPT_ICONS: Record<string, typeof Sprout> = {
  'sprout': Sprout,
  'heart-pulse': HeartPulse,
  'siren': Siren,
  'shopping-basket': ShoppingBasket,
  'megaphone': Megaphone,
  'flag': Flag,
  'building': Building2,
  'truck': Truck,
  'car': Car,
};

export default function AssistantPanel({ open, onClose, onAction }: Props) {
  const { t, lang } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t.assistantWelcome,
      category: 'عام',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [lastWasFallback, setLastWasFallback] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: content };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history: ConversationTurn[] = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const response: AssistantResponse = await getAssistantResponse(content, history);
      const isFallback = response.isFallback ?? false;
      setLastWasFallback(isFallback);

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        category: response.category,
        action: response.action,
        isFallback,
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setLastWasFallback(true);
      setMessages((m) => [...m, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: t.assistantError,
        category: 'عام',
        isFallback: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      { id: 'welcome', role: 'assistant', text: t.assistantCleared, category: 'عام' },
    ]);
    setVoiceError('');
    setLastWasFallback(null);
  };

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(t.browserNoVoice);
      return;
    }
    setVoiceError('');

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'en' ? 'en-US' : 'ar-AE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceError(t.micDenied);
      } else if (event.error === 'no-speech') {
        setVoiceError(t.noSpeechDetected);
      } else {
        setVoiceError(t.voiceError);
      }
    };

    recognition.onend = () => { setListening(false); };
    recognition.start();
  };

  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : 'ar-AE';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const handleAction = (action: AssistantAction) => {
    onAction(action);
    onClose();
  };

  if (!open) return null;

  const geminiConnected = lastWasFallback === false;
  const geminiOffline = lastWasFallback === true;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="assistant-panel relative bg-[#f5f0e8] dark:bg-[#0f1b14] w-full sm:max-w-lg h-[85vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#c8b97a]/40 dark:border-[#2d4a35]">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1a5c38] to-[#2d7a4f] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                {t.assistantTitle}
                <span className="inline-flex items-center gap-1 text-[10px] bg-[#c8b97a] text-[#1a5c38] font-bold px-2 py-0.5 rounded-full">
                  <Zap size={9} /> Gemini
                </span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {geminiConnected ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-300" />
                    <span className="text-xs text-emerald-200">{t.geminiConnected}</span>
                  </>
                ) : geminiOffline ? (
                  <>
                    <WifiOff size={11} className="text-amber-300" />
                    <span className="text-xs text-amber-200">{t.fallbackMode}</span>
                  </>
                ) : (
                  <span className="text-xs text-white/70">مدعوم بـ Gemini AI</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear} className="p-2 rounded-full hover:bg-white/15 transition" title={t.clearChat}>
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/15 transition" title={t.close}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f5f0e8] dark:bg-[#0f1b14]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const Icon = msg.category ? (CATEGORY_ICONS[msg.category] ?? Sparkles) : Sparkles;
            return (
              <div key={msg.id} className={`msg-appear flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-[#c8b97a]' : 'bg-[#1a5c38]'}`}>
                  {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isUser && msg.category && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[msg.category] ?? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}`}>
                        <Icon size={11} /> {msg.category}
                      </span>
                      {msg.isFallback && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                          <WifiOff size={9} /> {t.fallbackBadge}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-[#c8b97a] text-stone-800 rounded-tr-sm'
                      : 'bg-white dark:bg-[#1a2e21] text-stone-800 dark:text-[#e8ede9] rounded-tl-sm shadow-sm border border-stone-200/60 dark:border-[#2d4a35]'
                  }`}>
                    {msg.text}
                  </div>
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <button onClick={() => handleTTS(msg.text)} className="text-stone-400 hover:text-[#1a5c38] dark:hover:text-[#50c090] transition p-1" title={t.listen}>
                        <Volume2 size={14} />
                      </button>
                      {msg.action && msg.action.type !== 'none' && (
                        <button onClick={() => handleAction(msg.action!)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#1a5c38] hover:bg-[#2d7a4f] dark:bg-[#1a5c38] dark:hover:bg-[#2d7a4f] px-3 py-1.5 rounded-full transition shadow-sm">
                          <Zap size={11} /> {msg.action.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="msg-appear flex gap-2 flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a5c38] flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white dark:bg-[#1a2e21] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-stone-200/60 dark:border-[#2d4a35] flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#1a5c38]" />
                <span className="text-xs text-stone-500 dark:text-[#8a9a8e]">{t.assistantThinking}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 bg-[#f5f0e8] dark:bg-[#0f1b14]">
            {QUICK_PROMPTS.map((p) => {
              const Icon = PROMPT_ICONS[p.icon] ?? Sparkles;
              return (
                <button key={p.label} onClick={() => handleSend(p.message)}
                  className="quick-prompt-btn inline-flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-[#1a2e21] border border-[#c8b97a]/50 dark:border-[#2d4a35] text-stone-700 dark:text-[#c8d4ca] hover:bg-[#1a5c38] hover:text-white hover:border-[#1a5c38] dark:hover:bg-[#1a5c38] dark:hover:text-white dark:hover:border-[#1a5c38] px-3 py-2 rounded-full transition">
                  <Icon size={13} /> {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mx-4 mb-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <MicOff size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{voiceError}</p>
            <button onClick={() => setVoiceError('')} className="mr-auto text-red-400 hover:text-red-600">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-stone-200 dark:border-[#2d4a35] bg-white dark:bg-[#0f1b14] px-3 py-3 flex items-center gap-2">
          <button onClick={handleVoice}
            className={`flex-shrink-0 p-2.5 rounded-full transition ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-stone-100 dark:bg-[#1a2e21] hover:bg-[#1a5c38] hover:text-white text-stone-600 dark:text-[#b0bdb3]'
            }`}
            title={listening ? t.assistantListening : t.voiceInput}>
            <Mic size={18} />
          </button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={listening ? t.assistantListening : t.assistantPlaceholder}
            disabled={loading || listening}
            dir="rtl"
            className="flex-1 bg-stone-100 dark:bg-[#1a2e21] rounded-full px-4 py-2.5 text-sm text-stone-800 dark:text-[#e8ede9] placeholder-stone-400 dark:placeholder-[#6a7a6e] focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 text-right border-0" />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()}
            className="flex-shrink-0 p-2.5 rounded-full bg-[#1a5c38] text-white hover:bg-[#2d7a4f] disabled:opacity-40 disabled:cursor-not-allowed transition" title="إرسال">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 dark:text-[#6a7a6e] pb-2 px-3 bg-white dark:bg-[#0f1b14]">
          {listening ? t.assistantSpeakNow : 'يدعم الإدخال الصوتي بالعربية'}
        </p>
      </div>
    </div>
  );
}
