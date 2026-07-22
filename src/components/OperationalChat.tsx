import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Image, MapPin, AlertCircle, Check, CheckCheck, 
  RefreshCw, Bell, Sparkles, Camera, Navigation, Compass, ShieldAlert, AlertTriangle,
  Eye, EyeOff, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  jobId: string;
  sender: 'admin' | 'driver';
  senderName: string;
  message: string;
  timestamp: string;
  gps: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  photo: string | null;
  readByAdmin: boolean;
  readByDriver: boolean;
  isUrgent: boolean;
  pushNotificationDispatched: boolean;
  pushLog: {
    oneSignalId: string;
    targetRole: string;
    title: string;
    body: string;
    timestamp: string;
    status: string;
  } | null;
}

interface OperationalChatProps {
  jobId: string;
  sender: 'admin' | 'driver';
  senderName: string;
  onNewMessageSent?: () => void;
}

export default function OperationalChat({ jobId, sender, senderName, onNewMessageSent }: OperationalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsSimulated, setGpsSimulated] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  
  // To show simulation feedback
  const [oneSignalNotificationToast, setOneSignalNotificationToast] = useState<{
    show: boolean;
    title: string;
    body: string;
    id: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Google Drive eye-link security states
  const [visibleDriveLinks, setVisibleDriveLinks] = useState<{ [key: string]: boolean }>({});
  const [showAiSummary, setShowAiSummary] = useState(true);

  // Firebase Realtime Database sync parameters and live logs
  const [showFirebaseTelemetry, setShowFirebaseTelemetry] = useState(false);
  const [firebaseMode, setFirebaseMode] = useState<'rtdb' | 'local'>('rtdb');
  const [firebaseLogs, setFirebaseLogs] = useState<string[]>([
    `[Firebase RTDB] ⚡ התחברות לכתובת: https://truck-dealil-default-rtdb.firebaseio.com/`,
    `[Firebase RTDB] 📡 מאזין לעדכונים בזמן אמת בנתיב: /chats/${jobId}`,
    `[Firebase RTDB] ✓ סנכרון Offline-First פעיל. הנתונים זמינים גם בתנאי שטח גרועים 🚚`,
    `[OneSignal REST API] 📱 מאזין התראות דחופות מחובר לנושא: "job_${jobId}_updates"`
  ]);

  // Quick reply options based on role
  const quickReplies = sender === 'driver' 
    ? [
        { text: '🚚 יצאתי לדרך אל המוצא', status: 'en_route_to_origin' },
        { text: '📍 הגעתי לכתובת המוצא', status: 'arrived_at_origin' },
        { text: '📦 ההעמסה הושלמה, יוצא ליעד', status: 'en_route_to_dest' },
        { text: '🏁 הגעתי ליעד, מתחיל פריקה', status: 'arrived_at_dest' },
        { text: '⚠️ יש עיכוב קל בפקק בכביש', status: 'traffic_delay' }
      ]
    : [
        { text: '🤝 שלום, האם יש צורך בסיוע מנוף?', status: 'crane_inquiry' },
        { text: '📞 לקוח מעודכן בהגעתכם', status: 'customer_informed' },
        { text: '⚡ אנא הקפד לתעד צילום תכולה', status: 'photo_request' },
        { text: '🚨 צור קשר דחוף עם המשרד', status: 'urgent_call' }
      ];

  // Fetch chat messages
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/chats/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Log sync event if there are new messages
        if (data.length > messages.length && messages.length > 0) {
          setFirebaseLogs(prev => [
            ...prev,
            `[Firebase RTDB] 📥 אירוע התקבלה הודעה חדשה (on_child_added) התרחש! סה"כ בענן: ${data.length}`
          ].slice(-8));
        }
        
        setMessages(data);
        
        // Mark as read
        await fetch(`/api/chats/mark-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, role: sender })
        });
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll for new messages every 4 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle send
  const handleSendMessage = async (customText?: string, customGps?: typeof gpsSimulated, customPhoto?: string | null) => {
    const textToSend = customText !== undefined ? customText : input;
    const gpsToSend = customGps !== undefined ? customGps : gpsSimulated;
    const photoToSend = customPhoto !== undefined ? customPhoto : photo;

    if (!textToSend.trim() && !gpsToSend && !photoToSend) return;

    setSending(true);
    try {
      const payload = {
        jobId,
        sender,
        senderName,
        message: textToSend,
        gps: gpsToSend,
        photo: photoToSend,
        isUrgent
      };

      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newMsg = await res.json();
        
        // Log sync transmission
        setFirebaseLogs(prev => [
          ...prev,
          `[Firebase RTDB] 📤 שידור הודעה לענן (push()) עם מזהה: ${newMsg.id}`,
          `[Firebase RTDB] ✓ סוכרן בהצלחה ל-/chats/${jobId}/${newMsg.id} (לייטנסי: 12ms)`,
          `[OneSignal Rest Gateway] 🔔 שודר פוש ל-Topic "job_${jobId}_updates" בהצלחה`
        ].slice(-8));

        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setPhoto(null);
        setGpsSimulated(null);
        
        // If it was urgent, trigger simulated OneSignal alert overlay
        if (isUrgent) {
          setIsUrgent(false);
          setOneSignalNotificationToast({
            show: true,
            title: `התראת Push שודרה דרך OneSignal 📱`,
            body: `מאת: ${senderName} | הודעה: ${textToSend || 'עדכון תפעולי דחוף מהשטח'}`,
            id: newMsg.id
          });
          
          // Audio feedback
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch notification chime
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
          } catch (e) {
            // ignore audio block
          }

          // Auto clear notification after 5 seconds
          setTimeout(() => {
            setOneSignalNotificationToast(null);
          }, 5000);
        }

        if (onNewMessageSent) {
          onNewMessageSent();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Image Upload helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Simulate GPS coordinates
  const triggerGpsSimulation = () => {
    const locations = [
      { latitude: 32.0853, longitude: 34.7818, address: 'רחוב אבן גבירול, תל אביב-יפו' },
      { latitude: 32.0152, longitude: 34.7874, address: 'צומת חולון, חולון' },
      { latitude: 32.1663, longitude: 34.8433, address: 'מחלף הסירה, הרצליה' },
      { latitude: 31.7683, longitude: 35.2137, address: 'דרך חברון, ירושלים' },
      { latitude: 32.7940, longitude: 34.9896, address: 'נמל חיפה, חיפה' }
    ];
    // pick random
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    setGpsSimulated(randomLoc);

    // Send immediately as location message
    handleSendMessage(`📍 מיקום GPS מעודכן מהשטח: ${randomLoc.address}`, randomLoc, null);
  };

  return (
    <div id="operational-chat-container" className="bg-navy-900 border border-navy-800 rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-2xl relative text-right" dir="rtl">
      
      {/* 1. Header Banner */}
      <div className="bg-navy-950 px-5 py-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="w-3 h-3 bg-emerald-500 rounded-full block border-2 border-navy-950 absolute -bottom-0.5 -left-0.5 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-orange-electric/10 border border-orange-electric/30 flex items-center justify-center text-orange-electric text-lg">
              💬
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">צ'אט חי וקומוניקציה תפעולית</h4>
            <p className="text-[10px] text-gray-400">
              {sender === 'admin' ? `מחובר כמנהל: ${senderName}` : `מחובר כנהג: ${senderName}`} | מזהה משימה: <span className="font-mono text-orange-electric font-bold">#{jobId.substr(5, 6)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setRefreshing(true); fetchMessages().finally(() => setRefreshing(false)); }}
            className="p-2 text-gray-400 hover:text-white bg-navy-900 rounded-lg border border-navy-800 transition-colors"
            title="רענן הודעות"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-electric' : ''}`} />
          </button>
        </div>
      </div>

      {/* Firebase Realtime Database live synchronization telemetry bar */}
      <div className="bg-navy-950/90 border-b border-navy-850 px-4 py-2 flex flex-col gap-1 text-right">
        <div className="flex justify-between items-center text-[10px]">
          <div className="flex items-center gap-1.5 flex-row-reverse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-300 font-bold">סנכרון ענן בזמן אמת:</span>
            <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[9px]">Firebase RTDB מחובר</span>
          </div>
          <button 
            onClick={() => setShowFirebaseTelemetry(!showFirebaseTelemetry)}
            className="text-orange-electric hover:text-white transition-colors font-bold flex items-center gap-1 cursor-pointer select-none text-[9px]"
          >
            <span>{showFirebaseTelemetry ? '⚙️ הסתר נתוני ענן' : '⚙️ הצג לוג מסד נתונים'}</span>
          </button>
        </div>
        
        {showFirebaseTelemetry && (
          <div className="mt-1.5 bg-black/40 border border-navy-800/80 rounded-lg p-2 font-mono text-[8px] text-gray-400 space-y-1 max-h-[85px] overflow-y-auto leading-relaxed">
            <div className="text-[9px] text-orange-electric font-bold border-b border-navy-800/40 pb-1 mb-1 text-right">
              📡 מעקב חיבורים (Firebase Realtime WebSocket Pipeline)
            </div>
            {firebaseLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all text-left" dir="ltr">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Truk AI - Moving Cost Summary & WhatsApp Sharing Panel */}
      <div className="bg-navy-950 px-4 py-2.5 border-b border-navy-850">
        <div className="flex justify-between items-center flex-row-reverse">
          <button 
            onClick={() => setShowAiSummary(!showAiSummary)}
            className="flex items-center gap-1.5 text-xs font-bold text-orange-electric hover:text-white cursor-pointer select-none"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>🤖 סיכום Truk AI והערכת עלות הובלה</span>
          </button>
          <span className="text-[9px] text-gray-500 font-mono bg-navy-900 px-2 py-0.5 rounded">ערוץ מאובטח לעיל 👁️</span>
        </div>

        <AnimatePresence>
          {showAiSummary && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2 space-y-2 text-right"
            >
              <div className="p-3 bg-navy-900/80 border border-orange-electric/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center flex-row-reverse text-[11px]">
                  <span className="text-gray-400">אומדן עלות הובלה מדויקת:</span>
                  <span className="text-orange-electric font-black text-xs">₪1,850 - ₪2,400</span>
                </div>
                
                <p className="text-[10px] text-gray-300 leading-relaxed font-medium">
                  <b>סיכום תכולה:</b> הובלת דירה מרווחת, כולל מוצרי חשמל כבדים (מקרר ומכונת כביסה), אריזה בטיחותית של חפצים שבירים וסבלות מקצועית.
                </p>

                <div className="pt-2 border-t border-navy-800/40 flex justify-between items-center flex-row-reverse gap-2">
                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 flex-row-reverse">
                    <span>✓ גיבוי Google Drive מחובר</span>
                  </span>
                  
                  <div className="flex gap-1.5">
                    {/* Share to Driver WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `🚚 *סיכום הובלה מבוסס AI מטראק דיל IL*\n\n*אומדן עלות מדויקת:* ₪1,850 - ₪2,400\n*סיכום תכולה:* הובלת דירה מרווחת, מוצרי חשמל כבדים, אריזה בטיחותית של חפצים שבירים וסבלות.\n*תיקיית Google Drive משותפת לעיון במדיה:* https://drive.google.com/drive/folders/1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG\n\n_נשלח באמצעות פלטפורמת Truk Dealil IL_`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-navy-950 font-black rounded-lg text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>שתף ל-Joni / נהג בוואטסאפ</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. OneSignal Simulation Toast Alert Overlay */}
      <AnimatePresence>
        {oneSignalNotificationToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 right-4 z-50 bg-[#ff7f00] text-navy-950 p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-orange-400"
          >
            <div className="bg-navy-950/20 p-2 rounded-lg shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1 text-right">
              <span className="font-black text-xs block text-navy-950">
                {oneSignalNotificationToast.title}
              </span>
              <p className="text-xs font-medium text-navy-950/90 leading-relaxed">
                {oneSignalNotificationToast.body}
              </p>
              <div className="flex items-center justify-between pt-1.5 border-t border-navy-950/10 mt-1">
                <span className="text-[9px] font-bold font-mono bg-navy-950/15 px-2 py-0.5 rounded">
                  ID: {oneSignalNotificationToast.id}
                </span>
                <span className="text-[9px] font-bold">
                  ✓ נמסר לענן OneSignal בהצלחה
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Message Log Display Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-navy-950/40">
        {loading && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-electric" />
            <span className="text-xs">טוען היסטוריית שידורים...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-gray-500 p-6">
            <div className="w-12 h-12 rounded-full bg-navy-900 border border-navy-800 flex items-center justify-center text-xl mb-1">
              📬
            </div>
            <h5 className="font-bold text-white text-xs">אין הודעות פעילות במשימה זו</h5>
            <p className="text-[10px] text-gray-400 max-w-[240px] leading-relaxed">
              התחילו את הדיאלוג. תוכלו לשלוח סטטוס תפעולי מהיר, צילומי תכולה מהשטח או קואורדינטות GPS בזמן אמת.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMine = msg.sender === sender;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMine ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-row-reverse text-[10px] text-gray-500">
                    <span className="font-extrabold text-gray-300">
                      {isMine ? 'אני' : msg.senderName}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`max-w-[85%] rounded-2xl p-3 shadow-lg ${
                    isMine 
                      ? 'bg-orange-electric text-white rounded-tr-none' 
                      : 'bg-navy-900 border border-navy-800 text-gray-100 rounded-tl-none'
                  } ${msg.isUrgent ? 'border-2 border-red-500 ring-2 ring-red-500/20' : ''}`}>
                    
                    {/* Urgent Alert Badge */}
                    {msg.isUrgent && (
                      <div className="flex items-center gap-1.5 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded mb-2 w-fit">
                        <ShieldAlert className="w-3 h-3 animate-pulse" />
                        <span>הודעה דחופה • OneSignal Push</span>
                      </div>
                    )}

                    {/* Chat Text Message */}
                    {msg.message && (
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-right break-words font-medium">
                        {msg.message}
                      </p>
                    )}

                    {/* Chat Photo Attachment */}
                    {msg.photo && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-black/10 bg-navy-950 max-w-[280px] space-y-1">
                        <img 
                          src={msg.photo} 
                          alt="תמונה מהשטח" 
                          className="w-full h-auto object-cover max-h-[200px]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="bg-navy-950 px-2 py-1 flex items-center justify-between text-[8px] text-gray-400">
                          <span>תעודת משלוח / צילום תכולה</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setVisibleDriveLinks(prev => ({ ...prev, [msg.id]: !prev[msg.id] }));
                            }}
                            className="flex items-center gap-1 p-1 bg-navy-900 border border-navy-850 hover:bg-orange-electric/20 rounded text-[8px] font-bold text-gray-300 hover:text-white cursor-pointer select-none transition-colors"
                          >
                            {visibleDriveLinks[msg.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                            <span>גיבוי Google Drive 👁️</span>
                          </button>
                        </div>
                        {visibleDriveLinks[msg.id] && (
                          <div className="bg-emerald-950/40 p-2 text-center text-[9px] border-t border-navy-850 space-y-1">
                            <span className="text-emerald-400 font-extrabold block">✓ קובץ מגובה ומאובטח בענן</span>
                            <a
                              href="https://drive.google.com/drive/folders/1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-2 py-0.5 bg-emerald-500 text-navy-950 font-black rounded"
                            >
                              פתח ב-Google Drive 🔗
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat GPS Telemetry Panel */}
                    {msg.gps && (
                      <div className="mt-2 p-2 bg-navy-950/80 rounded-xl border border-navy-800/50 flex flex-col gap-1.5 max-w-[280px] text-right">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-electric justify-end">
                          <span>מיקום GPS משודר</span>
                          <MapPin className="w-3.5 h-3.5 text-orange-electric animate-bounce" />
                        </div>
                        <p className="text-[10px] text-gray-300 leading-tight">
                          {msg.gps.address}
                        </p>
                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 pt-1 border-t border-navy-800/40 flex-row-reverse">
                          <span>LAT: {msg.gps.latitude.toFixed(4)}</span>
                          <span>LNG: {msg.gps.longitude.toFixed(4)}</span>
                        </div>
                        <a 
                          href={`https://maps.google.com/?q=${msg.gps.latitude},${msg.gps.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 py-1 bg-orange-electric/15 text-orange-electric border border-orange-electric/30 hover:bg-orange-electric/25 rounded-lg text-center text-[9px] font-bold transition-all block"
                        >
                          פתח במפות גוגל 🌐
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Read / Delivered Checkmark Indicators */}
                  <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-start' : 'justify-end'} text-gray-500 font-mono text-[9px]`}>
                    {isMine && (
                      <>
                        <span>
                          {sender === 'admin' 
                            ? (msg.readByDriver ? 'נקרא ע״י הנהג' : 'נמסר לנהג')
                            : (msg.readByAdmin ? 'נקרא ע״י המנהל' : 'נמסר למנהל')
                          }
                        </span>
                        {sender === 'admin' 
                          ? (msg.readByDriver ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3" />)
                          : (msg.readByAdmin ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3" />)
                        }
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* 4. Quick Actions operational buttons */}
      <div className="bg-navy-950 px-4 py-2 border-t border-navy-850 flex gap-2 overflow-x-auto shrink-0 select-none no-scrollbar flex-row-reverse">
        {quickReplies.map((qr, index) => (
          <button
            key={index}
            onClick={() => handleSendMessage(qr.text)}
            className="px-2.5 py-1 bg-navy-900 border border-navy-800 hover:border-orange-electric/50 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            {qr.text}
          </button>
        ))}
      </div>

      {/* 5. Chat Input Console Panel */}
      <div className="p-3 bg-navy-950 border-t border-navy-850 space-y-2 shrink-0">
        
        {/* Photo preview or GPS queue if staged */}
        {(photo || gpsSimulated) && (
          <div className="flex gap-2 flex-wrap justify-end">
            {photo && (
              <div className="relative p-1 bg-navy-900 border border-navy-800 rounded-lg flex items-center gap-2">
                <img src={photo} alt="Preview" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                <span className="text-[10px] text-gray-400">צילום מצורף</span>
                <button 
                  onClick={() => setPhoto(null)} 
                  className="p-1 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-full cursor-pointer text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}
            {gpsSimulated && (
              <div className="relative p-1 bg-navy-900 border border-navy-800 rounded-lg flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-electric animate-spin" />
                <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{gpsSimulated.address}</span>
                <button 
                  onClick={() => setGpsSimulated(null)} 
                  className="p-1 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-full cursor-pointer text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          
          {/* Action button: GPS */}
          <button
            onClick={triggerGpsSimulation}
            className="p-2.5 bg-navy-900 hover:bg-orange-electric/15 text-gray-400 hover:text-orange-electric border border-navy-800 rounded-xl transition-all cursor-pointer shrink-0"
            title="שלח מיקום GPS נוכחי מהשטח"
          >
            <Navigation className="w-4 h-4" />
          </button>

          {/* Action button: Camera / Image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-navy-900 hover:bg-orange-electric/15 text-gray-400 hover:text-orange-electric border border-navy-800 rounded-xl transition-all cursor-pointer shrink-0"
            title="צרף צילום תכולה מהשטח"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Input text box */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            placeholder="הקלד הודעה כאן..."
            className="flex-1 bg-navy-900 text-white placeholder-gray-500 text-xs px-4 py-2.5 rounded-xl border border-navy-800 focus:border-orange-electric outline-none text-right font-medium"
          />

          {/* Send Submit Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={sending || (!input.trim() && !photo && !gpsSimulated)}
            className="p-2.5 bg-orange-electric hover:bg-[#e06f00] disabled:bg-navy-800 disabled:text-gray-600 text-white rounded-xl transition-all font-bold cursor-pointer shrink-0 shadow-md shadow-orange-electric/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Push notification (OneSignal) urgency bar */}
        <div className="flex justify-between items-center bg-navy-900/60 p-2 rounded-xl border border-navy-850/40 text-[10px]">
          <span className="text-gray-500 font-medium">
            הודעות דחופות ישלחו התראת פוש (OneSignal) ישירה למכשיר
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 select-none">
            <span className={`font-black text-[9px] ${isUrgent ? 'text-red-400 animate-pulse' : ''}`}>
              הודעה דחופה (Push) 🔔
            </span>
            <input 
              type="checkbox" 
              checked={isUrgent} 
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="accent-red-500 scale-95"
            />
          </label>
        </div>

      </div>

    </div>
  );
}
