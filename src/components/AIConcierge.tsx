import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, X, Send, Bot, RefreshCw, Eye, EyeOff, CheckCircle2, ChevronDown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  driveLink?: string;
}

interface AIConciergeProps {
  onNavigate?: (view: 'landing' | 'quote' | 'driver' | 'admin' | 'tracking' | 'feedback' | 'driver-register', moveId: string | null) => void;
}

export default function AIConcierge({ onNavigate }: AIConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDriveLinks, setShowDriveLinks] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      const res = await fetch('/api/concierge/history');
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
              text: 'שלום! אני <b>Truk AI Dispatcher & Fleet Matchmaker</b> — המוח הלוגיסטי, מנוע התמחור, ומנהל השיבוץ הממוקד של פלטפורמת "טראק דיל il" (דומיין פעיל: https://truck-deal.vercel.app/).<br/><br/>כיצד אוכל לסייע לך באפיון הובלה, התאמת צי רכב ממוקד (מסחרית 3.5ט, משאית רמפה 7.5-12ט, מנוף סולם במה חיצונית, או מנוף זרוע כבד), ושידוך נסיעות חזור Backhaul בהנחה?<br/><br/>🔲 בדיקת נהגי Online זמינים על המפה<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 חישוב נסיעת חזור Backhaul (20% הנחה)',
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
        body: JSON.stringify({ message: textToSend })
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
      console.error(err);
      // Friendly fallback message
      const fallbackMsg: ChatMessage = {
        id: 'msg_err',
        sender: 'ai',
        text: 'אירעה שגיאת רשת זמנית. אשמח לסייע לך לחשב מחיר אופטימלי במחשבון הדיגיטלי או לתאם נהג מורשה ישירות.<br/><br/>🔲 פתח מחשבון הובלה<br/>🔲 צור קשר לתיאום טלפוני',
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
    if (cleanedOption.includes('מעקב חי') || cleanedOption.includes('מקדמה')) {
      for (let i = messages.length - 1; i >= 0; i--) {
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
                className="w-full mt-1.5 py-2 px-3 bg-navy-950 hover:bg-orange-electric/10 hover:border-orange-electric border border-navy-800 text-gray-200 hover:text-white rounded-xl text-xs font-semibold text-right transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
              >
                <span className="text-orange-electric font-black text-sm">🔲</span>
                <span dangerouslySetInnerHTML={{ __html: displayLabel }} />
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
              <p key={idx} className="text-xs md:text-sm leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: parts[0] }} />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-electric hover:underline break-all font-mono text-xs px-1"
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
              className="text-xs md:text-sm leading-relaxed"
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
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 h-[500px] bg-navy-900/95 border border-navy-800 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden backdrop-blur-xl"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-navy-950/90 border-b border-navy-800/80 px-5 py-4 flex items-center justify-between flex-row-reverse">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-electric/10 border border-orange-electric/25 flex items-center justify-center text-orange-electric shadow-inner">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm">Truk AI Dispatcher</h4>
                  <span className="text-[9px] text-orange-electric font-bold block leading-none">סדרן ומתמחר לוגיסטי ראשי | טראק דיל il</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 bg-navy-900 border border-navy-850 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning regarding real integration */}
            <div className="bg-orange-electric/10 border-b border-orange-electric/20 px-4 py-1.5 text-center text-[10px] text-gray-300 font-bold">
              ⚡ מחובר ישירות לערוצי תקשורת Firebase & OneSignal ⚡
            </div>

            {/* Chat Body messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-navy-950/40">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div key={msg.id} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    {/* Speaker identity badge */}
                    <span className="text-[9px] text-gray-500 mb-0.5 font-bold px-1">
                      {isAI ? 'Truk AI Dispatcher 🤖' : 'אני'}
                    </span>

                    <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-md ${
                      isAI 
                        ? 'bg-navy-900 border border-navy-800 text-gray-100 rounded-tl-none' 
                        : 'bg-orange-electric text-white rounded-tr-none'
                    }`}>
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-gray-500 mb-0.5 font-bold">מחשב מענה... 🧠</span>
                  <div className="bg-navy-900 border border-navy-800 text-gray-400 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-electric" />
                    <span className="text-xs">מנסח הנחיה אופטימלית...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="bg-navy-950/90 border-t border-navy-800/80 p-3 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="שאל אותי על מחיר, מכרז או סטטוס נהג..."
                className="flex-1 px-4 py-2 bg-navy-900 border border-navy-750 text-white rounded-xl text-xs placeholder-gray-500 outline-none focus:border-orange-electric text-right"
              />
              <button
                type="submit"
                className="px-3.5 bg-orange-electric hover:bg-orange-hover text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
