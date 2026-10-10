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

export default function AIConcierge() {
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
              text: 'שלום! אני <b>Truk AI Dispatcher</b> — הסדרן, המתמחר ומנהל התפעול הלוגיסטי הראשי של פלטפורמת "טראק דיל il". כיצד אוכל לסייע לך באפיון לוגיסטי, התאמת צי רכב ותמחור שקוף כעת?<br/><br/>🔲 בדיקת התאמת מנוף למיקום<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 תיאום קו חלוקה קבוע לעסק',
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
        throw new Error('שגיאה בתקשורת מול ה-AI');
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
    handleSendMessage(cleanedOption);
  };

  // Function to extract text lines and identify 🔲 options
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
            return (
              <button
                key={idx}
                onClick={() => handleContinuationClick(trimmed)}
                className="w-full mt-1.5 py-2 px-3 bg-navy-950 hover:bg-orange-electric/10 hover:border-orange-electric border border-navy-800 text-gray-200 hover:text-white rounded-xl text-xs font-semibold text-right transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
              >
                <span className="text-orange-electric font-black text-sm">🔲</span>
                <span dangerouslySetInnerHTML={{ __html: trimmed.replace('🔲', '').trim() }} />
              </button>
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
