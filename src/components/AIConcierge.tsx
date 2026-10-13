import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, MessageSquare, X, Send, Bot, RefreshCw, Eye, EyeOff, 
  CheckCircle2, ChevronDown, Award, Maximize2, Minimize2, CreditCard, 
  ShieldCheck, Wrench, Navigation, Zap, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  driveLink?: string;
}

interface AIConciergeProps {
  onNavigate?: (view: 'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register' | 'availability', moveId: string | null) => void;
}

export default function AIConcierge({ onNavigate }: AIConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDriveLinks, setShowDriveLinks] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [sessionId] = useState<string>(() => {
    let saved = sessionStorage.getItem('truk_concierge_session_id');
    if (!saved) {
      saved = 'session_' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('truk_concierge_session_id', saved);
    }
    return saved;
  });

  // Load chat history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/concierge/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMessages(data);
        } else {
          // Default initial friendly message
          setMessages([
            {
              id: 'init_1',
              sender: 'ai',
              text: 'שלום! אני <b>Truk AI Dispatcher & Express Controller</b> — מנוע הלוגיסטיקה, התמחור והשיגור של פלטפורמת "טראק דיל il" (דומיין פעיל: https://truck-deal.vercel.app/).<br/><br/>המערכת פועלת בשני מסלולים נפרדים וממוקדים:<br/>1. ⚡ <b>מודול משלוחי אקספרס (Truk-Express):</b> קטנועים למעטפות ומסמכים דחופים (עו"ד/רו"ח), רכבים פרטיים לחבילות (1-3 קרטונים), וטנדרים לציוד משרדי (עמלה: 5% באשראי / 8% במזומן COD).<br/>2. 🚛 <b>מודול הובלות כבדות ומנופים:</b> מסחריות 3.5ט, משאיות סגורות 7.5-12ט עם רמפה, מנופי סולם/במה (קומות 1-18) ומנופי זרוע כבדים עוז משא (עמלה: 15% ספוט / 10% B2B).<br/><br/>כיצד אוכל לסייע לך כעת?<br/>🔲 איתור שליח קרוב על המפה 📍<br/>🔲 בדיקת נהגי Online זמינים על המפה<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 חישוב נסיעת חזור Backhaul (20% הנחה)',
              timestamp: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching concierge history:', err);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, sessionId })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: 'msg_' + Math.random().toString(36).substr(2, 9),
          sender: 'ai',
          text: data.reply,
          timestamp: new Date().toISOString(),
          driveLink: data.driveLink
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errText = await res.text().catch(() => '');
        console.error(`[AIConcierge POST /api/concierge/chat Error]: HTTP ${res.status}:`, errText);
        throw new Error(`שגיאה בתקשורת מול ה-AI (${res.status})`);
      }
    } catch (err) {
      console.warn('[AIConcierge] Network/server fallback engaged:', err);
      // Smart Client-Side Dispatcher Fallback (Zero-Downtime Guarantee)
      const lower = textToSend.toLowerCase();
      let smartReply = '';

      if (lower.includes('אקספרס') || lower.includes('מעטפה') || lower.includes('שליח') || lower.includes('קטנוע') || lower.includes('עו"ד') || lower.includes('דחוף')) {
        smartReply = 'שלום! עבור משלוחי <b>Truk-Express</b> (קטנועים, רכבים פרטיים וטנדרים):<br/>⏱️ <b>זמן הגעת שליח לאיסוף:</b> 15–25 דקות.<br/>💰 <b>אומדן מחיר קבוע:</b> ₪40–₪70 עירוני | ₪80–₪150 בינעירוני (עמלת מערכת: 5% אשראי / 8% מזומן COD).<br/><br/>🔲 פתיחת הזמנת אקספרס מהירה<br/>🔲 איתור שליח קרוב על המפה 📍<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)';
      } else if (lower.includes('מנוף') || lower.includes('קומה') || lower.includes('סולם') || lower.includes('הרמה')) {
        smartReply = 'עבור עבודות מנוף והרמה לגובה (קומות 1–18 ועוז משא כבד):<br/>🏗️ <b>ציוד זמין:</b> מנופי סולם חיצוניים ומנופי זרוע כבדים עם מנופאי מוסמך וביטוח צד ג' מלא.<br/>💰 <b>אומדן לשעת עבודה:</b> ₪450 – ₪650.<br/><br/>🔲 בדיקת זמינות מנופי הרמה בפורטל<br/>🔲 פתיחת מכרז הובלה + מנוף<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)';
      } else if (lower.includes('חזור') || lower.includes('חיסכון') || lower.includes('backhaul') || lower.includes('יקר') || lower.includes('חיפה') || lower.includes('באר שבע')) {
        smartReply = 'זיהיתי צורך בהובלה חכמה! במערכת טראק דיל מופעל מנגנון <b>Backhaul (נסיעות חזור)</b> בלעדי:<br/>💡 משאית 12ט חוזרת ריקה? אתה מקבל <b>20% הנחה מיידית</b> על ההובלה (חיסכון של ₪200–₪400)!<br/><br/>🔲 שריון נסיעת חזור מוזלת (Backhaul)<br/>🔲 פתיחת מכרז הובלה חכם<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)';
      } else if (lower.includes('זמינות') || lower.includes('שישי') || lower.includes('מחר') || lower.includes('פנוי') || lower.includes('משמרת')) {
        smartReply = 'נהגי המערכת מעדכנים זמינות שוטפת בפורטל הזמינות והמשמרות (בהשראת ControlApp):<br/>• נהגי משאיות 12ט ומנופאי סולם זמינים להזמנה מראש לימי שישי ושעות שיא.<br/>• נסיעות חזור פתוחות מחיפה וירושלים למרכז.<br/><br/>🔲 בדיקת נהגים זמינים בפורטל הזמינות<br/>🔲 פתיחת מכרז הובלה חכם<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)';
      } else {
        smartReply = 'שלום! אני <b>Truk AI Dispatcher</b> — סדרן ההובלות, המנופים והאקספרס של טראק דיל il.<br/>אנו מתאימים עבורך את כלי הרכב המדויק: ואן 3.5ט, משאית 7.5–12ט עם רמפה, מנוף הרמה סולם קומות 1–18, או שליחי אקספרס מהירים.<br/><br/>🔲 מחשבון ומכרז הובלה חכם<br/>🔲 בדיקת נהגים זמינים בפורטל הזמינות<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)<br/>🔲 איתור נהגים פנויים על המפה 📍';
      }

      const fallbackMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        sender: 'ai',
        text: smartReply,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to detect and handle clicking on custom continuation buttons (🔲)
  const handleContinuationClick = (optionText: string) => {
    const cleanedOption = optionText.replace('🔲', '').trim();

    // 1. Direct WhatsApp link embedded in option text
    const waUrlMatch = optionText.match(/https:\/\/api\.whatsapp\.com[^\s<"')]+/);
    if (waUrlMatch) {
      window.open(waUrlMatch[0], '_blank');
      return;
    }

    // 2. Direct tracking link embedded in option text
    const trackingMatch = optionText.match(/moveId=([^&\s)]+)/);
    if (trackingMatch && onNavigate) {
      onNavigate('tracking', trackingMatch[1]);
      return;
    }

    // 3. Fallback history search for tracking
    if (cleanedOption.includes('מעקב חי') || cleanedOption.includes('מקדמה') || cleanedOption.includes('סטטוס מסירה') || cleanedOption.includes('אישור מסירה')) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const expMatch = messages[i].text.match(/EXP-\d+/);
        if (expMatch && onNavigate) {
          onNavigate('tracking', expMatch[0]);
          return;
        }
        const match = messages[i].text.match(/TRK-\d+/);
        if (match && onNavigate) {
          onNavigate('tracking', match[0]);
          return;
        }
      }
    } else if (cleanedOption.includes('WhatsApp') || cleanedOption.includes('וואטסאפ') || cleanedOption.includes('שיגור ישיר')) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const match = messages[i].text.match(/https:\/\/api\.whatsapp\.com[^\s<"')]+/);
        if (match) {
          window.open(match[0], '_blank');
          return;
        }
      }
    } else if ((cleanedOption.includes('זמינות') || cleanedOption.includes('משמרות') || cleanedOption.includes('Backhaul')) && onNavigate) {
      onNavigate('availability', null);
      return;
    } else if (cleanedOption.includes('על המפה') && onNavigate) {
      // If user wants to see online drivers/couriers on the map
      onNavigate('landing', null);
    }

    handleSendMessage(cleanedOption.replace(/\(https?:\/\/[^\)]+\)/g, '').trim());
  };

  // Function to extract text lines and identify 🔲 options & Magic Links
  const renderMessageContent = (msg: ChatMessage) => {
    const rawHTML = msg.text || '';
    const lines = rawHTML
      .replace(/<br\s*[\/]?>/gi, '\n')
      .split('\n');

    return (
      <div className="space-y-1.5 text-right">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-0.5" />;
          }

          if (trimmed.startsWith('🔲')) {
            const displayLabel = trimmed
              .replace('🔲', '')
              .replace(/\(https?:\/\/[^\)]+\)/g, '')
              .trim();
            return (
              <button
                key={idx}
                onClick={() => handleContinuationClick(trimmed)}
                className="w-full my-2.5 p-3 sm:p-3.5 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 hover:from-navy-900 hover:to-navy-850 border-2 border-orange-electric/50 hover:border-orange-electric text-white rounded-2xl text-xs sm:text-sm font-extrabold text-right transition-all flex items-center justify-between gap-3 cursor-pointer shadow-lg hover:shadow-orange-electric/25 active:scale-[0.98] select-none group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-orange-electric/20 border border-orange-electric/40 text-orange-electric flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-110 group-hover:bg-orange-electric group-hover:text-white transition-all shadow-inner">
                    🔲
                  </span>
                  <span className="leading-relaxed text-gray-100 group-hover:text-white" dangerouslySetInnerHTML={{ __html: displayLabel }} />
                </div>
                <span className="text-orange-electric group-hover:translate-x-[-2px] transition-transform text-xs font-mono font-bold shrink-0">
                  בחר ←
                </span>
              </button>
            );
          }

          // Check for Magic Link patterns: Tracking, Driver, WhatsApp
          const urlMatch = trimmed.match(/(https?:\/\/[^\s<"']+)/);
          if (urlMatch) {
            const url = urlMatch[1];
            if (url.includes('view=tracking')) {
              const moveIdMatch = url.match(/moveId=([^&\s]+)/);
              const moveId = moveIdMatch ? moveIdMatch[1] : '';
              return (
                <div key={idx} className="my-1.5">
                  <a
                    href={url}
                    onClick={(e) => {
                      if (onNavigate) {
                        e.preventDefault();
                        onNavigate('tracking', moveId || null);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none"
                  >
                    <span>📍 מעקב הובלה ומקדמה ללקוח</span>
                    {moveId && (
                      <span className="font-mono text-[10px] bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200">
                        {moveId}
                      </span>
                    )}
                  </a>
                </div>
              );
            }

            if (url.includes('view=driver')) {
              const moveIdMatch = url.match(/moveId=([^&\s]+)/);
              const moveId = moveIdMatch ? moveIdMatch[1] : '';
              return (
                <div key={idx} className="my-1.5">
                  <a
                    href={url}
                    onClick={(e) => {
                      if (onNavigate) {
                        e.preventDefault();
                        onNavigate('driver', moveId || null);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none"
                  >
                    <span>🚛 כניסת נהגים והגשת הצעות</span>
                    {moveId && (
                      <span className="font-mono text-[10px] bg-blue-950/70 border border-blue-500/30 px-1.5 py-0.5 rounded text-blue-200">
                        {moveId}
                      </span>
                    )}
                  </a>
                </div>
              );
            }

            if (url.includes('whatsapp.com')) {
              return (
                <div key={idx} className="my-1.5">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none"
                  >
                    <span>📲 שידור המכרז בוואטסאפ (WhatsApp)</span>
                  </a>
                </div>
              );
            }

            // General link
            const parts = line.split(url);
            return (
              <p key={idx} className="text-sm md:text-base leading-relaxed text-gray-100">
                <span dangerouslySetInnerHTML={{ __html: parts[0] }} />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-electric hover:underline break-all font-mono text-xs sm:text-sm px-1 font-bold"
                >
                  {url}
                </a>
                <span dangerouslySetInnerHTML={{ __html: parts.slice(1).join(url) }} />
              </p>
            );
          }

          return (
            <p 
              key={idx} 
              className="text-sm md:text-base leading-relaxed text-gray-100"
              dangerouslySetInnerHTML={{ __html: line }}
            />
          );
        })}

        {/* Media upload mock & Google Drive automatic sync behind secure eye link */}
        {msg.driveLink && (
          <div className="mt-3 pt-2.5 border-t border-navy-800/40 space-y-2">
            <div className="flex items-center justify-between flex-row-reverse bg-navy-950/80 p-2 rounded-xl border border-navy-850">
              <span className="text-[10px] text-gray-400 font-bold">📂 גיבוי אוטומטי לענן</span>
              <button
                onClick={() => setShowDriveLinks(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                className="p-1 px-2.5 bg-orange-electric/15 text-orange-electric hover:bg-orange-electric/25 rounded-lg border border-orange-electric/20 text-[9px] font-bold flex items-center gap-1 cursor-pointer select-none transition-all"
              >
                {showDriveLinks[msg.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showDriveLinks[msg.id] ? 'הסתר קישור מאובטח' : 'הצג קישור גוגל דרייב 👁️'}</span>
              </button>
            </div>

            {showDriveLinks[msg.id] && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center text-[11px] space-y-1.5"
              >
                <p className="text-emerald-400 font-bold leading-tight">✓ התיקייה סוכרנה ומאובטחת ב-Google Drive</p>
                <a
                  href={msg.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-navy-950 font-extrabold rounded-lg text-[10px] transition-all"
                >
                  לחץ לפתיחת התיקייה המשותפת 🔗
                </a>
              </motion.div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Sparkles Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-orange-electric hover:bg-orange-hover text-white flex items-center justify-center shadow-[0_4px_25px_rgba(255,127,0,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer relative border border-orange-400"
          title="Truk AI Dispatcher — סדרן לוגיסטי"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
          
          {/* Notification red dot */}
          {!isOpen && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-ping" />
          )}
        </button>
      </div>

      {/* Main Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`fixed ${
              isMaximized 
                ? 'inset-2 sm:inset-4 w-auto h-auto max-w-none max-h-none rounded-2xl' 
                : 'bottom-22 left-3 sm:left-6 w-[540px] max-w-[95vw] h-[640px] max-h-[90vh] rounded-3xl'
            } bg-navy-950 border-2 border-navy-750 shadow-2xl flex flex-col z-50 overflow-hidden backdrop-blur-2xl transition-all duration-200`}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-navy-950/95 border-b border-navy-800/80 px-4 py-3 flex items-center justify-between flex-row-reverse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-electric/15 border border-orange-electric/30 flex items-center justify-center text-orange-electric shadow-inner">
                  <Bot className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm sm:text-base leading-tight">Truk AI Dispatcher & Express Controller</h4>
                  <span className="text-[10px] text-orange-electric font-bold block leading-none mt-0.5">סדרן לוגיסטי, מנוע שיגור ותמחור אקספרס | טראק דיל il</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-gray-300 hover:text-white transition-colors p-1.5 bg-navy-900 hover:bg-navy-850 border border-navy-800 rounded-lg cursor-pointer"
                  title={isMaximized ? 'הקטן חלון' : 'הרחב למסך מלא (Maximize)'}
                  aria-label={isMaximized ? 'הקטן חלון' : 'הרחב למסך מלא'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4 text-orange-electric" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-300 hover:text-white transition-colors p-1.5 bg-navy-900 hover:bg-navy-850 border border-navy-800 rounded-lg cursor-pointer"
                  title="סגור חלון"
                  aria-label="סגור חלון"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick module selection chips */}
            <div className="bg-navy-950/90 border-b border-navy-850 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendMessage('אני מעוניין במשלוח אקספרס מהיר של מעטפה ומסמכים דחופים ע״י קטנוע')}
                className="px-2.5 py-1 bg-orange-electric/15 hover:bg-orange-electric/25 border border-orange-electric/30 text-orange-electric rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>⚡ מעטפה/מסמכים (קטנוע)</span>
              </button>
              <button
                onClick={() => handleSendMessage('אני צריך משלוח חבילה 1-3 קרטונים ע״י רכב פרטי')}
                className="px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🚗 חבילה (רכב פרטי)</span>
              </button>
              <button
                onClick={() => handleSendMessage('אני צריך לתמחר הובלת דירה 3 חדרים ומשאית סגורה עם רמפה')}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🚚 הובלה ומנוף סולם</span>
              </button>
              <button
                onClick={() => handleSendMessage('איתור שליח קרוב על המפה 📍')}
                className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>📍 איתור במפה</span>
              </button>
            </div>

            {/* Warning regarding real integration */}
            <div className="bg-orange-electric/10 border-b border-orange-electric/20 px-4 py-1 text-center text-[10px] text-gray-200 font-bold flex items-center justify-center gap-1">
              <span>⚡ ערוץ שידור ישיר ומאובטח (PII Protected) | עמלות 5% אשראי / 8% מזומן COD ⚡</span>
            </div>

            {/* Chat Body messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-navy-950/90">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div key={msg.id} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    {/* Speaker identity badge */}
                    <span className="text-[10px] text-gray-400 mb-1 font-bold px-1">
                      {isAI ? 'Truk AI Dispatcher 🤖' : 'אני'}
                    </span>

                    <div className={`max-w-[90%] rounded-2xl p-4 shadow-xl ${
                      isAI 
                        ? 'bg-navy-900 border-2 border-navy-800 text-gray-100 rounded-tl-none' 
                        : 'bg-orange-electric text-white rounded-tr-none font-medium'
                    }`}>
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-gray-400 mb-1 font-bold">מחשב מענה... 🧠</span>
                  <div className="bg-navy-900 border-2 border-navy-800 text-gray-300 rounded-2xl rounded-tl-none p-4 flex items-center gap-2.5 shadow-lg">
                    <RefreshCw className="w-4 h-4 animate-spin text-orange-electric" />
                    <span className="text-sm font-bold">מנסח שיבוץ ומכרז אופטימלי...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom quick navigation shortcuts */}
            <div className="bg-navy-950 border-t border-navy-800 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleSendMessage('מה מחירון מנופי ההרמה החיצוניים ומנופי הזרוע?')}
                className="px-3 py-1.5 bg-navy-900 hover:bg-navy-850 border border-navy-750 hover:border-orange-electric/50 text-gray-200 hover:text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs"
              >
                <span>🏗️ מחירון מנוף</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('איך מבצעים תשלום ישיר ומקדמה מאובטחת למוביל?')}
                className="px-3 py-1.5 bg-navy-900 hover:bg-navy-850 border border-navy-750 hover:border-emerald-500/50 text-emerald-300 hover:text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs"
              >
                <span>💳 תשלום ישיר</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('מה פוליסת ביטוח המעמס ואחריות הובלות?')}
                className="px-3 py-1.5 bg-navy-900 hover:bg-navy-850 border border-navy-750 hover:border-blue-500/50 text-blue-300 hover:text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs"
              >
                <span>🛡️ פוליסת ביטוח</span>
              </button>
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="bg-navy-950/95 border-t border-navy-800/80 p-3 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="שאל אותי על מחיר, מכרז, מנוף או סטטוס נהג..."
                className="flex-1 px-4 py-2.5 bg-navy-900 border border-navy-750 text-white rounded-xl text-sm placeholder-gray-400 outline-none focus:border-orange-electric text-right"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-orange-electric hover:bg-orange-hover text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
