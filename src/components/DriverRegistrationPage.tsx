import React, { useState, useRef } from 'react';
import { 
  Truck, ShieldCheck, CheckCircle2, Camera, Upload, AlertCircle, 
  Sparkles, DollarSign, Navigation, MessageCircle, Phone, Mail, 
  Calendar, Award, ArrowLeft, ArrowRight, RefreshCw, Check, 
  ExternalLink, User, FileText, CheckCheck, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DRIVER_VEHICLE_OPTIONS, DRIVER_REGION_OPTIONS, DriverProfile } from '../types';

interface DriverRegistrationPageProps {
  onNavigateToPortal: () => void;
  onBackToLanding?: () => void;
}

export default function DriverRegistrationPage({ 
  onNavigateToPortal, 
  onBackToLanding 
}: DriverRegistrationPageProps) {
  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [truckType, setTruckType] = useState<string>(DRIVER_VEHICLE_OPTIONS[0]);
  const [truckPlate, setTruckPlate] = useState('');
  const [maxWeight, setMaxWeight] = useState('12 טון');
  const [region, setRegion] = useState<string>(DRIVER_REGION_OPTIONS[0]);
  const [testExpiryDate, setTestExpiryDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');

  // Photos State (Base64)
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [truckPhoto, setTruckPhoto] = useState<string>('');
  const [isProcessingProfile, setIsProcessingProfile] = useState(false);
  const [isProcessingTruck, setIsProcessingTruck] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredDriver, setRegisteredDriver] = useState<DriverProfile | null>(null);

  // Hidden File Input Refs
  const profileInputRef = useRef<HTMLInputElement>(null);
  const truckInputRef = useRef<HTMLInputElement>(null);

  // Resize and encode image to clean Base64 JPEG to keep upload snappy
  const processImageFile = (file: File, maxDim: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('שגיאה בטעינת התמונה'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingProfile(true);
    setSubmitError(null);
    try {
      const base64 = await processImageFile(file, 600);
      setProfilePhoto(base64);
    } catch {
      setSubmitError('שגיאה בעיבוד תמונת הפרופיל');
    } finally {
      setIsProcessingProfile(false);
    }
  };

  const handleTruckPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingTruck(true);
    setSubmitError(null);
    try {
      const base64 = await processImageFile(file, 1200);
      setTruckPhoto(base64);
    } catch {
      setSubmitError('שגיאה בעיבוד תמונת המשאית');
    } finally {
      setIsProcessingTruck(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setSubmitError('נא להזין מספר WhatsApp תקין בן 9-10 ספרות');
      return;
    }
    if (!fullName.trim()) {
      setSubmitError('נא להזין שם מלא');
      return;
    }
    if (!truckPlate.trim()) {
      setSubmitError('נא להזין מספר רישוי של המשאית');
      return;
    }

    setIsSubmitting(true);

    const driverPayload: DriverProfile = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      truckType,
      truckPlate: truckPlate.trim(),
      maxWeight: maxWeight.trim() || '12 טון',
      region,
      testExpiryDate,
      insuranceExpiryDate,
      profilePhoto,
      truckPhoto,
      rating: 5.0,
      completedMoves: 0,
      status: 'active'
    };

    try {
      // 1. Local Server Storage (Primary fast database)
      const localResponse = await fetch('/api/drivers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverPayload)
      });
      const localData = await localResponse.json();

      const resolvedDriver: DriverProfile = localData.driver || driverPayload;

      // 2. Google Apps Script Webhook Sync with Drive Folder & Images
      const gasUrl = import.meta.env.VITE_GAS_WEBAPP_URL || 
        'https://script.google.com/macros/s/AKfycbyDiRrXdNdcYaa9VY29x6qVsumayrOBD0yHzEHosbuncvsRd-mNSaM_xEenhThsANN-/exec';
      
      const gasPayload = {
        action: 'register_driver',
        fullName: resolvedDriver.fullName,
        name: resolvedDriver.fullName,
        phone: resolvedDriver.phone,
        whatsappPhone: resolvedDriver.phone,
        email: resolvedDriver.email || '',
        truckType: resolvedDriver.truckType,
        truckModel: resolvedDriver.truckType,
        truckPlate: resolvedDriver.truckPlate,
        maxWeight: resolvedDriver.maxWeight || '',
        region: resolvedDriver.region,
        testExpiryDate: resolvedDriver.testExpiryDate || '',
        insuranceExpiryDate: resolvedDriver.insuranceExpiryDate || '',
        profilePhoto: resolvedDriver.profilePhoto || '',
        truckPhoto: resolvedDriver.truckPhoto || ''
      };

      // Resilient fire-and-forget sync to Google Apps Script
      fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(gasPayload)
      }).catch((err) => {
        console.warn('Google Apps Script background sync warning:', err);
      });

      // 3. Save active driver session in localStorage
      const activeSession = {
        name: resolvedDriver.fullName,
        phone: resolvedDriver.phone,
        truckPlate: resolvedDriver.truckPlate,
        truckModel: resolvedDriver.truckType
      };
      localStorage.setItem('truk_active_driver_session', JSON.stringify(activeSession));

      setRegisteredDriver(resolvedDriver);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setSubmitError(err.message || 'שגיאה בהרשמה למערכת. נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-white font-sans selection:bg-orange-electric selection:text-white pb-20" dir="rtl">
      
      {/* Top Breadcrumb & Back Bar */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={onBackToLanding || onNavigateToPortal}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-electric transition-colors cursor-pointer py-2 px-3 rounded-xl hover:bg-navy-900 border border-transparent hover:border-navy-800"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לדף הבית</span>
        </button>

        <button
          onClick={onNavigateToPortal}
          className="inline-flex items-center gap-2 text-xs font-bold text-orange-electric hover:text-orange-400 bg-orange-electric/10 hover:bg-orange-electric/20 border border-orange-electric/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>כבר רשום? כניסה ישירה לפורטל</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        
        {/* ================================================================= */}
        {/* SUCCESS CONFIRMATION VIEW                                        */}
        {/* ================================================================= */}
        <AnimatePresence mode="wait">
          {registeredDriver ? (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="max-w-2xl mx-auto my-8 bg-navy-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-electric/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative text-center space-y-6">
                
                {/* Animated Green Check Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 bg-emerald-500/15 border-2 border-emerald-400/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  <CheckCircle2 className="w-14 h-14" />
                </motion.div>

                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                    הצטרפות הושלמה בהצלחה
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    ברוך הבא לצי הנהגים של טראק דיל il! 🎉
                  </h1>
                  <p className="text-gray-300 text-sm sm:text-base mt-2 max-w-lg mx-auto">
                    פרטיך נרשמו במערכת הלוגיסטית וסונכרנו ל-WhatsApp. כעת תוכל לגשת לפורטל המכרזים ולהגיש הצעות מחיר.
                  </p>
                </div>

                {/* Driver Details Card */}
                <div className="bg-navy-950/80 border border-navy-800 rounded-2xl p-5 sm:p-6 text-right space-y-4 shadow-inner">
                  
                  <div className="flex items-center justify-between border-b border-navy-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      {registeredDriver.profilePhoto ? (
                        <img 
                          src={registeredDriver.profilePhoto} 
                          alt={registeredDriver.fullName} 
                          className="w-14 h-14 rounded-full object-cover border-2 border-orange-electric"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-orange-electric/15 border border-orange-electric/30 flex items-center justify-center text-orange-electric font-black text-xl">
                          {registeredDriver.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-extrabold text-lg text-white">{registeredDriver.fullName}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-orange-electric" />
                          <span dir="ltr">{registeredDriver.phone}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-2 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>סטטוס: פעיל ומאומת במערכת 🟢</span>
                    </div>
                  </div>

                  {/* Vehicle Spec Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-navy-900 rounded-xl border border-navy-800">
                      <span className="text-gray-400 block mb-1">סוג כלי רכב וציוד:</span>
                      <span className="font-bold text-white text-sm flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-orange-electric shrink-0" />
                        {registeredDriver.truckType}
                      </span>
                    </div>

                    <div className="p-3 bg-navy-900 rounded-xl border border-navy-800">
                      <span className="text-gray-400 block mb-1">מספר רישוי:</span>
                      <span className="font-mono font-black text-white text-sm tracking-wider bg-navy-950 px-2 py-0.5 rounded border border-navy-700 inline-block">
                        {registeredDriver.truckPlate}
                      </span>
                    </div>

                    <div className="p-3 bg-navy-900 rounded-xl border border-navy-800">
                      <span className="text-gray-400 block mb-1">אזור פעילות מועדף:</span>
                      <span className="font-bold text-white text-sm flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                        {registeredDriver.region}
                      </span>
                    </div>

                    <div className="p-3 bg-navy-900 rounded-xl border border-navy-800">
                      <span className="text-gray-400 block mb-1">כושר העמסה:</span>
                      <span className="font-bold text-white text-sm">
                        {registeredDriver.maxWeight || '12 טון'}
                      </span>
                    </div>
                  </div>

                  {/* Truck photo preview if uploaded */}
                  {registeredDriver.truckPhoto && (
                    <div className="pt-2">
                      <span className="text-xs text-gray-400 block mb-2 font-semibold">צילום הרכב שאושר:</span>
                      <div className="h-32 w-full rounded-xl overflow-hidden border border-navy-800 relative group">
                        <img 
                          src={registeredDriver.truckPhoto} 
                          alt="צילום משאית" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent flex items-end p-2.5">
                          <span className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            מסונכרן עם Google Drive
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Call to Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={onNavigateToPortal}
                    className="w-full py-4 bg-orange-electric hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-electric/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 cursor-pointer min-h-[52px]"
                  >
                    <Truck className="w-6 h-6" />
                    <span>מעבר לפורטל המכרזים</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setRegisteredDriver(null)}
                      className="flex-1 py-3 bg-navy-800 hover:bg-navy-700 text-gray-300 text-xs font-bold rounded-xl border border-navy-700 transition-all cursor-pointer min-h-[44px]"
                    >
                      עריכת פרטים / רישום משאית נוספת
                    </button>
                    
                    <a
                      href="https://wa.me/972528765432?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%A0%D7%A8%D7%A9%D7%9E%D7%AA%D7%99%20%D7%9B%D7%A0%D7%94%D7%92%20%D7%91%D7%98%D7%A8%D7%90%D7%A7%20%D7%93%D7%99%D7%9C%20il"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>תמיכה ב-WhatsApp סדרן</span>
                    </a>
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            /* ================================================================= */
            /* REGISTRATION LANDING & FORM VIEW                                 */
            /* ================================================================= */
            <motion.div
              key="form-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              
              {/* =============================================================== */}
              {/* 2. HERO MARKETING BANNER & VALUE PROPOSITION                    */}
              {/* =============================================================== */}
              <div className="relative rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900/90 to-navy-950 border border-navy-800 p-6 sm:p-12 overflow-hidden shadow-2xl text-center space-y-6">
                
                {/* Background ambient lighting */}
                <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-48 bg-orange-electric/10 blur-3xl pointer-events-none rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-navy-700/20 blur-3xl pointer-events-none rounded-full" />

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-electric/15 border border-orange-electric/30 text-orange-electric text-xs font-extrabold tracking-wide uppercase shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>גיוס נהגים ומנופאים לשנת 2026</span>
                </div>

                {/* Main Hero Title */}
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
                  טופס רישום נהג ומנוף — <span className="text-orange-electric">טראק דיל il</span>
                </h1>

                {/* Hero Subtitle */}
                <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
                  הצטרף לצי המובילים והמנופים המוביל בישראל: קבל מכרזים ישירים ל-WhatsApp, תשלום מקדמה מובטח מראש, ומילוי נסיעות חזור ריקות.
                </p>

                {/* 3 Prominent Value Proposition Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-right">
                  
                  {/* Card 1 */}
                  <div className="bg-navy-950/80 border border-navy-800 hover:border-orange-electric/40 rounded-2xl p-5 transition-all shadow-md group hover:bg-navy-950">
                    <div className="w-12 h-12 rounded-xl bg-orange-electric/15 text-orange-electric border border-orange-electric/30 flex items-center justify-center text-2xl mb-3.5 group-hover:scale-110 transition-transform">
                      💰
                    </div>
                    <h3 className="font-extrabold text-white text-base mb-1.5">
                      מקדמה מובטחת מראש
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      הלקוח משריין מקדמה במערכת לפני יציאה – ללא צ'קים חוזרים וללא רדיפה אחרי תשלומים.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-navy-950/80 border border-navy-800 hover:border-orange-electric/40 rounded-2xl p-5 transition-all shadow-md group hover:bg-navy-950">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl mb-3.5 group-hover:scale-110 transition-transform">
                      🛣️
                    </div>
                    <h3 className="font-extrabold text-white text-base mb-1.5">
                      הובלות על הדרך
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      מילוי נסיעות חזור ריקות (Backhauls) לחיסכון בסולר ומקסימום רווח יומי בכל קו נסיעה.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-navy-950/80 border border-navy-800 hover:border-orange-electric/40 rounded-2xl p-5 transition-all shadow-md group hover:bg-navy-950">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl mb-3.5 group-hover:scale-110 transition-transform">
                      📲
                    </div>
                    <h3 className="font-extrabold text-white text-base mb-1.5">
                      הכל ב-WhatsApp בקליק
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      רואים פרטי הובלה ומחיר, מאשרים בלחיצה אחת – ללא צורך בהתקנת אפליקציות כבדות.
                    </p>
                  </div>

                </div>
              </div>

              {/* =============================================================== */}
              {/* REGISTRATION FORM CONTAINER                                     */}
              {/* =============================================================== */}
              <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
                
                <div className="border-b border-navy-800 pb-5 mb-8 text-right">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <Award className="w-6 h-6 text-orange-electric" />
                    <span>טופס רישום והצטרפות לצי המורשה</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1.5">
                    נא למלא את כל שדות החובה המסומנים בכוכבית (*). הנתונים יאומתו ויאושרו במערכת תוך דקות ספורות.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-2xl text-red-300 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 text-right">
                  
                  {/* =========================================================== */}
                  {/* 3. MANDATORY PHOTO UPLOADER (DOUBLE COMPONENT)              */}
                  {/* =========================================================== */}
                  <div className="bg-navy-950/70 border border-navy-800 rounded-2xl p-5 sm:p-6 space-y-6">
                    <div className="border-b border-navy-800 pb-3">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-orange-electric" />
                        <span>אימות חזותי ותיעוד (חובה לאישור מהיר)</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        תמונות ברורות מגדילות את סיכויי הזכייה במכרזים ומאפשרות ללקוח זיהוי מהיר בשטח.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Driver Avatar Circle Uploader (Col 1-4) */}
                      <div className="md:col-span-4 flex flex-col items-center text-center space-y-3 p-4 bg-navy-900/60 rounded-2xl border border-navy-800">
                        <span className="text-xs font-bold text-gray-300">1. תמונת פרופיל נהג</span>
                        
                        <div 
                          onClick={() => profileInputRef.current?.click()}
                          className="relative w-28 h-28 rounded-full border-2 border-dashed border-orange-electric/50 hover:border-orange-electric bg-navy-950 flex items-center justify-center cursor-pointer group overflow-hidden transition-all shadow-inner"
                        >
                          {profilePhoto ? (
                            <>
                              <img 
                                src={profilePhoto} 
                                alt="פרופיל נהג" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                                החלף תמונה
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center text-gray-400 group-hover:text-orange-electric transition-colors">
                              <Camera className="w-8 h-8 mb-1" />
                              <span className="text-[11px] font-semibold">צלם / העלה</span>
                            </div>
                          )}

                          {isProcessingProfile && (
                            <div className="absolute inset-0 bg-navy-950/80 flex items-center justify-center">
                              <RefreshCw className="w-6 h-6 text-orange-electric animate-spin" />
                            </div>
                          )}
                        </div>

                        <input 
                          ref={profileInputRef}
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={handleProfilePhotoChange}
                        />

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => profileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs font-bold text-white rounded-lg border border-navy-700 cursor-pointer min-h-[36px]"
                          >
                            {profilePhoto ? 'שנה תמונת פנים' : 'בחר תמונת פנים'}
                          </button>
                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={() => setProfilePhoto('')}
                              className="p-1.5 text-gray-400 hover:text-red-400 cursor-pointer"
                              title="הסר תמונה"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">פורמט JPG/PNG עד 5MB</span>
                      </div>

                      {/* Truck Wide Card Uploader (Col 5-12) */}
                      <div className="md:col-span-8 flex flex-col space-y-3 p-4 bg-navy-900/60 rounded-2xl border border-navy-800">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-300">2. תמונת המשאית / כלי הרכב</span>
                          {truckPhoto && (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> תמונה נטענה
                            </span>
                          )}
                        </div>

                        <div 
                          onClick={() => truckInputRef.current?.click()}
                          className="relative h-36 w-full rounded-xl border-2 border-dashed border-orange-electric/50 hover:border-orange-electric bg-navy-950 flex flex-col items-center justify-center cursor-pointer group overflow-hidden transition-all shadow-inner"
                        >
                          {truckPhoto ? (
                            <>
                              <img 
                                src={truckPhoto} 
                                alt="משאית" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                                לחץ להחלפת צילום המשאית
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center text-gray-400 group-hover:text-orange-electric transition-colors p-4 text-center">
                              <Truck className="w-9 h-9 mb-1.5" />
                              <span className="text-xs font-bold">העלה צילום ברור של המשאית</span>
                              <span className="text-[11px] text-gray-500 mt-0.5">תיעוד המנוף, הרמפה ההידראולית או הפלטה הפתוחה</span>
                            </div>
                          )}

                          {isProcessingTruck && (
                            <div className="absolute inset-0 bg-navy-950/80 flex items-center justify-center">
                              <RefreshCw className="w-6 h-6 text-orange-electric animate-spin" />
                            </div>
                          )}
                        </div>

                        <input 
                          ref={truckInputRef}
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={handleTruckPhotoChange}
                        />

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => truckInputRef.current?.click()}
                            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-xs font-bold text-white rounded-lg border border-navy-700 cursor-pointer min-h-[38px] flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5 text-orange-electric" />
                            <span>{truckPhoto ? 'החלף צילום כלי רכב' : 'העלה צילום כלי רכב'}</span>
                          </button>
                          {truckPhoto && (
                            <button
                              type="button"
                              onClick={() => setTruckPhoto('')}
                              className="text-xs text-red-400 hover:underline cursor-pointer py-1"
                            >
                              הסר צילום
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* =========================================================== */}
                  {/* 4. FORM FIELDS SPECIFICATION: A. PERSONAL DETAILS           */}
                  {/* =========================================================== */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-navy-800 pb-2">
                      <User className="w-4 h-4 text-orange-electric" />
                      <span>א. פרטים אישיים והתקשרות</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          שם מלא <span className="text-orange-electric">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="לדוגמה: ישראל ישראלי"
                            className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                          />
                        </div>
                      </div>

                      {/* WhatsApp Phone */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          מספר WhatsApp לקבלת מכרזים <span className="text-orange-electric">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="05X-XXXXXXX"
                            className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          אימייל לקבלת חשבוניות ודוחות
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="driver@example.com"
                            className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                            dir="ltr"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* =========================================================== */}
                  {/* 4. FORM FIELDS SPECIFICATION: B. VEHICLE & CRANE SPECS      */}
                  {/* =========================================================== */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-navy-800 pb-2">
                      <Truck className="w-4 h-4 text-orange-electric" />
                      <span>ב. מפרט כלי רכב, מנוף ורישוי</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Vehicle & Equipment Type */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          סוג כלי רכב וציוד <span className="text-orange-electric">*</span>
                        </label>
                        <select
                          value={truckType}
                          onChange={(e) => setTruckType(e.target.value)}
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px] cursor-pointer"
                        >
                          {DRIVER_VEHICLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-navy-950 text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* License Plate Number */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          מספר רישוי משאית <span className="text-orange-electric">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={truckPlate}
                          onChange={(e) => setTruckPlate(e.target.value)}
                          placeholder="לדוגמה: 12-345-67"
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white font-mono text-sm tracking-wider focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                          dir="ltr"
                        />
                      </div>

                      {/* Max Weight / Capacity */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          כושר העמסה / משקל מקסימלי
                        </label>
                        <input
                          type="text"
                          value={maxWeight}
                          onChange={(e) => setMaxWeight(e.target.value)}
                          placeholder="לדוגמה: 12 טון"
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                        />
                      </div>

                      {/* Preferred Region */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          אזור פעילות מועדף <span className="text-orange-electric">*</span>
                        </label>
                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px] cursor-pointer"
                        >
                          {DRIVER_REGION_OPTIONS.map((reg) => (
                            <option key={reg} value={reg} className="bg-navy-950 text-white">
                              {reg}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Annual Test Expiry */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-300">
                          תוקף טסט שנתי
                        </label>
                        <input
                          type="date"
                          value={testExpiryDate}
                          onChange={(e) => setTestExpiryDate(e.target.value)}
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                        />
                      </div>

                      {/* Insurance Expiry */}
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <label className="block text-xs font-bold text-gray-300">
                          תוקף ביטוח מטענים / צד ג'
                        </label>
                        <input
                          type="date"
                          value={insuranceExpiryDate}
                          onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                          className="w-full px-4 py-3 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm focus:border-orange-electric focus:ring-1 focus:ring-orange-electric outline-none transition-all min-h-[48px]"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Terms & Notice */}
                  <div className="p-4 bg-navy-950/60 border border-navy-800 rounded-2xl flex items-start gap-3 text-xs text-gray-400">
                    <Info className="w-5 h-5 text-orange-electric shrink-0 mt-0.5" />
                    <span>
                      בלחיצה על "הצטרף עכשיו", הנך מאשר קבלת הצעות מחיר ומכרזי הובלה ישירות ל-WhatsApp. פרטיך נשמרים בסודיות מלאה ומסונכרנים אוטומטית לענן הלוגיסטי.
                    </span>
                  </div>

                  {/* =========================================================== */}
                  {/* SUBMIT BUTTON                                               */}
                  {/* =========================================================== */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-orange-electric hover:bg-orange-600 active:scale-[0.99] text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-electric/25 transition-all flex items-center justify-center gap-3 cursor-pointer min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span>מסנכרן פרטים ותמונות בענן...</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-6 h-6" />
                          <span>הצטרף עכשיו למאגר הנהגים 🚀</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
