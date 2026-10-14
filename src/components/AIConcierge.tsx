import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, MessageSquare, X, Send, Bot, RefreshCw, Eye, EyeOff, 
  CheckCircle2, ChevronDown, Award, Maximize2, Minimize2, CreditCard, 
  ShieldCheck, Wrench, Navigation, Zap, Truck, User, Globe, Edit3, Check
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

  // Client identification & Language State
  const [clientName, setClientName] = useState<string>(() => {
    return localStorage.getItem('truk_client_name') || '';
  });
  const [nameInput, setNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'he' | 'en' | 'ru' | 'ar'>('he');

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

  const getInitialWelcomeText = (name: string) => {
    const greeting = name ? `שלום ${name}!` : 'שלום!';
    return `${greeting} אני <b>טראק-סדרן | Truk AI Dispatcher & Express Controller</b> — מנוע הלוגיסטיקה, התמחור בזמן אמת ובקר השיגור של "טראק דיל il".<br/><br/>המערכת פועלת בשני מסלולים ייעודיים:<br/>⚡ <b>מסלול א׳: שליחויות אקספרס (Truk-Express)</b> — קטנוע למעטפות (₪40–₪70 עירוני, הגעה 15-25 דק׳), רכב פרטי לחבילות (₪80–₪150 בינעירוני), וטנדר (עמלה: 5% אשראי / Net 30 | 8% מזומן COD).<br/>🚛 <b>מסלול ב׳: הובלות כבדות, דירות ומנופים</b> — מסחריות 3.5ט, משאיות 7.5–12ט עם רמפה, מנוף סולם 1–18 (₪350–₪450 לשעה) ומנופי זרוע כבדים (עמלה: 15% ספוט / 10% B2B; נוסחה: עלות נטו + עמלה * 1.18).<br/><br/><b>באיזה מסלול תרצה שנתמקד כעת?</b><br/>🔲 מסלול א׳: שליחויות אקספרס (קטנוע / רכב פרטי / טנדר)<br/>🔲 מסלול ב׳: הובלות כבדות, דירות ומנופי הרמה<br/>🔲 בדיקת נסיעות חזור Backhaul (20% הנחה)<br/>🔲 איתור שליח קרוב על המפה 📍`;
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/concierge/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMessages(data);
        } else {
          setMessages([
            {
              id: 'init_welcome',
              sender: 'ai',
              text: getInitialWelcomeText(clientName),
              timestamp: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching concierge history:', err);
    }
  };

  const handleSaveClientName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setClientName(trimmed);
    localStorage.setItem('truk_client_name', trimmed);
    setIsEditingName(false);
    setNameInput('');
    handleSendMessage(`נעים להכיר, שמי ${trimmed}`);
  };

  const handleLanguageChange = (lang: 'he' | 'en' | 'ru' | 'ar') => {
    setSelectedLanguage(lang);
    if (lang === 'en') {
      handleSendMessage('Please assist me in English');
    } else if (lang === 'ru') {
      handleSendMessage('Пожалуйста, помогите мне на русском языке');
    } else if (lang === 'ar') {
      handleSendMessage('من فضلك ساعدني باللغة العربية');
    } else {
      handleSendMessage('נמשיך בעברית');
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
        body: JSON.stringify({ message: textToSend, sessionId, clientName })
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
      // Multi-Step Smart Client-Side Dispatcher (Interactive Lead Qualification)
      const lower = textToSend.toLowerCase();
      const greeting = clientName ? `שלום ${clientName}!` : 'שלום!';
      let smartReply = '';

      // Check for specific vehicle and delivery types
      if (lower.includes('קרטון') || lower.includes('חבילה') || lower.includes('רכב פרטי')) {
        smartReply = `${greeting} 🚗 <b>מסלול א׳: משלוח חבילה ברכב פרטי (1–3 קרטונים):</b><br/>• זמן איסוף ממוצע: 20–35 דקות.<br/>• אומדן מחירון קבוע: ₪50–₪75 עירוני | ₪85–₪120 בינעירוני (עמלת מערכת: 5% אשראי / 8% מזומן COD).<br/><br/><b>מאיזו עיר לאיזו עיר מיועד המשלוח?</b><br/><br/>🔲 פתיחת הזמנה ומילוי כתובות מיד<br/>🔲 איתור שליחים זמינים במפה 📍<br/>🔲 שיגור מהיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
      } else if (lower.includes('מעטפה') || lower.includes('מסמכ') || lower.includes('קטנוע') || lower.includes('עו"ד')) {
        smartReply = `${greeting} ⚡ <b>מסלול א׳: משלוח אקספרס דחוף בקטנוע (מעטפה / מסמכים משפטיים):</b><br/>• זמן הגעה לאיסוף: 15–25 דקות בלבד!<br/>• אומדן מחירון קבוע: ₪40–₪65 עירוני | ₪75–₪110 בינעירוני.<br/>• עמלת מערכת: 5% אשראי / Net 30 | 8% מזומן COD.<br/><br/><b>מאיזה רחוב או עיר לאסוף את המעטפה?</b><br/><br/>🔲 פתיחת הזמנת אקספרס מהירה<br/>🔲 איתור שליח קרוב על המפה 📍<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
      } else if (lower.includes('טנדר') || lower.includes('ציוד משרדי') || lower.includes('4-10 קרטונים')) {
        smartReply = `${greeting} 🚐 <b>מסלול א׳: משלוח טנדר / מסחרית קלה (ציוד משרדי וקרטונים מרובים):</b><br/>• מתאים לציוד משרד, 4–10 קרטונים וציוד מחשוב.<br/>• אומדן מחיר: ₪140 – ₪240.<br/><br/><b>האם נדרש סבל לסחיבת הציוד או פריקה עצמית?</b><br/><br/>🔲 פתיחת הזמנת טנדר מהירה<br/>🔲 איתור רכבים פנויים על המפה 📍<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
      } else if (lower.includes('מנוף') || lower.includes('קומה') || lower.includes('סולם') || lower.includes('הרמה')) {
        smartReply = `${greeting} 🏗️ <b>מסלול ב׳: עבודות מנוף והרמה לגובה (קומות 1–18 ועוז משא כבד):</b><br/>• ציוד זמין: מנופי סולם חיצוניים ומנופי זרוע כבדים (12ט–575ט) עם מנופאי מוסמך וביטוח צד ג' מלא.<br/>• תעריף מנוף סולם: ₪350 – ₪450 לשעה (קומות 1–18).<br/><br/><b>לאיזו קומה נדרשת ההרמה והאם יש חנייה למשאית המנוף?</b><br/><br/>🔲 בדיקת זמינות מנופי הרמה בפורטל<br/>🔲 פתיחת מכרז הובלה + מנוף<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
      } else if (lower.includes('טיפ') || lower.includes('חיסכון') || lower.includes('להוזיל') || lower.includes('זול') || lower.includes('הנחה')) {
        smartReply = `${greeting} ✨ <b>טיפ מסדרן טראק דיל (איך מוזילים את עלות ההובלה ב-20% עד 35%):</b><br/><br/>1. <b>The Self-Transport Hack (רכב פרטי מוזיל עלויות):</b><br/>חלק מהסכום הכולל של ההובלה מושפע ישירות מנפח הארגזים. אם יש לך ארגזים קטנים, ביגוד, מחשב אישי או חפצים יקרי ערך — העברה שלהם ברכב הפרטי שלכם תצמצם את נפח המשאית ותוזיל משמעותית את הצעת המובילים.<br/><br/>2. <b>Accurate Sizing & No Extra Fees:</b><br/>בחירת משאית מדויקת מונעת מצב שבו מוביל מגיע עם משאית גדולה מדי (שעולה יותר בסולר) או קטנה מדי שמצריכה נגלה שנייה.<br/><br/>3. <b>The 2-3 Photos Rule (העלאת תמונות בכפתור 🧷):</b><br/>מובילים לוקחים מכרזים ברצינות רבה יותר ונותנים הצעות נטו חדות כשיש להם 2–3 תמונות ברורות מזווית טובה של הרהיטים והמעברים. זה מבטל הפתעות ותוספות מחיר ביום ההובלה.<br/><br/><b>באיזה מסלול תרצה שנתמקד כעת כדי לחסוך בעלויות?</b><br/><br/>🔲 בדיקת נסיעות חזור Backhaul (20% הנחה)<br/>🔲 פתיחת מכרז חכם עם תמונות<br/>🔲 מסלול א׳: שליחות קלה (קטנוע / רכב פרטי)<br/>🔲 מסלול ב׳: הובלה כבדה / דירה`;
      } else if (lower.includes('חזור') || lower.includes('backhaul') || lower.includes('יקר')) {
        smartReply = `${greeting} 💡 <b>מהפכת ה-Backhaul (נסיעות חזור ב-20% הנחה):</b><br/>משאית 12ט חוזרת ריקה מחיפה, ירושלים או באר שבע למרכז? אתה מקבל <b>20% הנחה מיידית</b> על ההובלה (חיסכון של ₪200–₪400)!<br/><br/><b>לאיזה יעד ומתי נוח לך לתאם את נסיעת החזור?</b><br/><br/>🔲 שריון נסיעת חזור מוזלת (Backhaul)<br/>🔲 פתיחת מכרז הובלה חכם<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
      } else if (lower.includes('תל אביב') || lower.includes('רמת גן') || lower.includes('חולון') || lower.includes('פתח תקווה') || lower.includes('הרצליה') || lower.includes('ירושלים') || lower.includes('חיפה') || lower.includes('ראשון')) {
        smartReply = `${greeting} 📍 <b>זיהיתי מסלול משלוח!</b><br/>סדרן ה-AI בדק את המסלול והנהגים הפעילים באזור:<br/>• זמן הגעה משוער לאיסוף: 20–30 דקות.<br/>• אומדן מחירון לנתיב זה: ₪50 – ₪85 (כולל מעקב חי עד למסירה).<br/><br/><b>האם תרצה להזמין שליח לקריאה מיידית?</b><br/><br/>🔲 אישור ומעבר להזמנה מהירה (השליח יוצא מיד)<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)<br/>🔲 צפה בשליחים פנויים כעת במפה 📍`;
      } else {
        smartReply = `${greeting} אני <b>טראק-סדרן | Truk AI Dispatcher & Express Controller</b> — מנוע הלוגיסטיקה, התמחור והשיגור של טראק דיל il.<br/><br/>המערכת פועלת בשני מסלולים ייעודיים:<br/>• ⚡ <b>מסלול א׳: שליחויות אקספרס:</b> מעטפות (₪40–₪70), חבילות (₪80–₪150), טנדר (עמלה 5% אשראי / 8% מזומן COD).<br/>• 🚛 <b>מסלול ב׳: הובלות כבדות ומנופים:</b> משאיות 7.5–12ט, מנופי סולם 1–18 (₪350–₪450/שעה), מנופי עוז משא (עמלה 15% ספוט / 10% B2B; נוסחה: עלות נטו + עמלה * 1.18).<br/><br/><b>באיזה מסלול תרצה שנתמקד כעת?</b><br/><br/>🔲 מסלול א׳: שליחויות אקספרס (קטנוע / רכב פרטי / טנדר)<br/>🔲 מסלול ב׳: הובלות כבדות, דירות ומנופי הרמה<br/>🔲 בדיקת נסיעות חזור Backhaul (20% הנחה)<br/>🔲 שיגור ישיר בוואטסאפ למוקד (https://api.whatsapp.com/send?phone=972549876543)`;
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
    } 
    
    // 4. WhatsApp Dispatcher trigger
    if (cleanedOption.includes('WhatsApp') || cleanedOption.includes('וואטסאפ') || cleanedOption.includes('שיגור ישיר')) {
      window.open('https://api.whatsapp.com/send?phone=972549876543&text=' + encodeURIComponent('שלום מוקד טראק דיל, ברצוני לתאם משלוח/הובלה'), '_blank');
      return;
    } 
    
    // 5. Driver Availability Portal
    if ((cleanedOption.includes('זמינות') || cleanedOption.includes('משמרות') || cleanedOption.includes('פורטל')) && onNavigate) {
      onNavigate('availability', null);
      return;
    } 
    
    // 6. Live Drivers / Map navigation (Instant 1-Click Action)
    if ((cleanedOption.includes('מפה') || cleanedOption.includes('במפה') || cleanedOption.includes('שליח קרוב')) && onNavigate) {
      onNavigate('landing', null);
      return;
    }

    // 7. Order / Quote / Calculator Navigation (Instant 1-Click Action)
    if ((cleanedOption.includes('הזמנ') || cleanedOption.includes('מכרז') || cleanedOption.includes('מחשבון') || cleanedOption.includes('טופס') || cleanedOption.includes('אישור ומעבר')) && onNavigate) {
      onNavigate('quote', null);
      return;
    }

    // Otherwise, send conversational follow-up to agent
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
                onClick={() => handleSendMessage('טיפים לחיסכון במחיר ההובלה ✨')}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>✨ טיפים לחיסכון</span>
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
              {/* Initial Welcome Card Canvas (Interactive Identification & Language Widget) */}
              <div className="bg-gradient-to-br from-navy-900 via-navy-850 to-navy-900 border-2 border-orange-electric/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 text-right">
                {/* Header & Role */}
                <div className="flex items-center justify-between border-b border-navy-750 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-electric/20 border border-orange-electric/40 flex items-center justify-center text-orange-electric shadow-inner">
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm sm:text-base leading-tight">טראק-סדרן | Truk AI Dispatcher</h4>
                      <span className="text-[10px] sm:text-[11px] text-orange-electric font-bold block">סדרן לוגיסטי, מנוע שיגור בזמן אמת ובקר תמחור | טראק דיל il</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    מוקד פעיל
                  </span>
                </div>

                {/* Language Selection Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-orange-electric" />
                    בחירת שפת שיחה / Language:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'he', label: '🇮🇱 עברית' },
                      { id: 'en', label: '🇬🇧 English' },
                      { id: 'ru', label: '🇷🇺 Русский' },
                      { id: 'ar', label: '🇸🇦 العربية' }
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleLanguageChange(lang.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          selectedLanguage === lang.id
                            ? 'bg-orange-electric text-white border-orange-electric shadow-md'
                            : 'bg-navy-950/80 text-gray-300 hover:text-white border-navy-750 hover:border-navy-600'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Name & Identification Input Field */}
                <div className="bg-navy-950/80 border border-navy-750 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-electric" />
                      {clientName ? `לקוח מזוהה: ${clientName}` : 'זיהוי לקוח לקבלת ליווי אישי:'}
                    </span>
                    {clientName && !isEditingName && (
                      <button
                        type="button"
                        onClick={() => { setIsEditingName(true); setNameInput(clientName); }}
                        className="text-[10px] text-orange-electric hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        שנה שם
                      </button>
                    )}
                  </div>

                  {(!clientName || isEditingName) ? (
                    <form onSubmit={handleSaveClientName} className="flex gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="הזן את שמך הפרטי (למשל: דניאל, מיכל...)"
                        className="flex-1 px-3 py-1.5 bg-navy-900 border border-navy-700 text-white rounded-lg text-xs outline-none focus:border-orange-electric"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-orange-electric hover:bg-orange-hover text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        שמור
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between bg-navy-900/90 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300 font-bold">
                      <span>שלום {clientName}! טראק-סדרן לשירותך.</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Two Dedicated Tracks Selection Grid */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-gray-300 block">בחר מסלול שירות להתחלה מהירה:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Track A */}
                    <div 
                      onClick={() => handleSendMessage('אני מעוניין במסלול א׳: שליחויות אקספרס (קטנוע / רכב פרטי / טנדר)')}
                      className="p-3 rounded-xl bg-navy-950/90 border-2 border-orange-electric/40 hover:border-orange-electric transition-all cursor-pointer group hover:bg-navy-900"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-lg bg-orange-electric/20 text-orange-electric flex items-center justify-center font-black text-xs">
                          ⚡
                        </span>
                        <span className="font-black text-white text-xs group-hover:text-orange-electric transition-colors">
                          מסלול א׳: שליחויות אקספרס
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-snug">
                        קטנוע למעטפות (₪40–₪70) | רכב פרטי (₪80–₪150) | טנדר.<br/>
                        <span className="text-orange-electric font-bold text-[10px]">עמלה: 5% אשראי / Net 30 | 8% מזומן COD</span>
                      </p>
                    </div>

                    {/* Track B */}
                    <div 
                      onClick={() => handleSendMessage('אני מעוניין במסלול ב׳: הובלות כבדות, דירות ומנופים')}
                      className="p-3 rounded-xl bg-navy-950/90 border-2 border-blue-500/40 hover:border-blue-400 transition-all cursor-pointer group hover:bg-navy-900"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">
                          🚛
                        </span>
                        <span className="font-black text-white text-xs group-hover:text-blue-300 transition-colors">
                          מסלול ב׳: הובלות ומנופים
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-snug">
                        משאיות 7.5–12ט עם רמפה | מנופי סולם 1–18 (₪350–₪450/שעה).<br/>
                        <span className="text-blue-300 font-bold text-[10px]">עמלה: 15% ספוט / 10% B2B | 20% Backhaul</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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
