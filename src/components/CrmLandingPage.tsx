import React, { useState, useEffect } from 'react';
import { 
  Shield, Truck, Clock, Sparkles, Send, CheckCircle2, 
  AlertCircle, Phone, Mail, Building, FileText, User, 
  ChevronLeft, ChevronRight, Upload, X, Star, MapPin, 
  Calendar, HelpCircle, ArrowLeftRight, Users, ShieldCheck,
  Award, Zap, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveType, TruckAccess, CraneNeeded, MoveRequest } from '../types';
import trac1Img from '../assets/images/trac.jpg';
import trac2Img from '../assets/images/trac2.jpg';
import trac3Img from '../assets/images/trac3.jpg';
const truckImg = '/src/assets/images/logistic_truck_highway_1784514374249.jpg';
const techImg = '/src/assets/images/tracking_dashboard_tech_1784514388814.jpg';
const teamImg = '/src/assets/images/professional_moving_team_1784514402333.jpg';
const trac1Img = '/src/assets/images/trac.jpg';
const trac2Img = '/src/assets/images/trac2.jpg';
const trac3Img = '/src/assets/images/trac3.jpg';


interface CrmLandingPageProps {
  onNavigateToQuote: () => void;
  onNavigateToDriverRegister?: () => void;
}

export default function CrmLandingPage({ onNavigateToQuote, onNavigateToDriverRegister }: CrmLandingPageProps) {
  // Hero Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
const slides = [
    {
      image: truckImg,
      title: "צי משאיות מתקדם בפריסה ארצית",
      description: "שינוע מהיר ובטוח לכל חלקי הארץ עם משאיות חדישות המותאמות לכל נפח מטען"
    },
    {
      image: techImg,
      title: "טכנולוגיית מעקב ואבטחה במעגל סגור",
      description: "שקיפות מלאה מול הלקוח עם מערכת ניתוח קושי AI וסנכרון ישיר ל-WhatsApp"
    },
    {
      image: teamImg,
      title: "צוות מובילים וסבלים מורשים",
      description: "הקפדה יתרה על שלמות התכולה, עמידה קפדנית בזמנים וטיפול מקצועי בציוד רגיש"
    },
    {
      image: trac1Img,
      title: "פתרונות שינוע ולוגיסטיקה מתקדמים",
      description: "מערך ארצי חכם המנוהל דיגיטלית בסטנדרט העולמי הגבוה ביותר"
    },
    {
      image: trac2Img,
      title: "צי משאיות חדיש ובקרת לוויין",
      description: "כל הובלה מבוקרת 24/7 ומנווטת בבטחה ישירות אל היעד"
    },
    {
      image: trac3Img,
      title: "שירות בפריסה ארצית רחבה",
      description: "מענה מושלם להובלות דירה יוקרתיות ולוגיסטיקה עסקית מורכבת"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Google Reviews Data
  const googleReviews = [
    {
      name: "מיכל כהן",
      type: "לקוחה פרטית",
      initials: "מכ",
      gradient: "from-orange-500 to-amber-500",
      content: "העברת דירה לחו״ל מתקתקת בלי שום הפתעות. מדויקים בזמנים, שירות מעל הכל!",
      date: "לפני שבועיים"
    },
    {
      name: "קרן אברהם",
      type: "מנהלת משרד",
      initials: "קא",
      gradient: "from-blue-500 to-indigo-600",
      content: "חברת Truk Dealil מנהלים לנו את ההפצות העסקיות ברמה הגבוהה ביותר. פשוט ראש שקט.",
      date: "לפני חודש"
    },
    {
      name: "ח. סבן חומרי בניין",
      type: "לקוח עסקי",
      initials: "חס",
      gradient: "from-emerald-500 to-teal-600",
      content: "עבודה מדויקת, עמידה קפדנית בזמנים ופרגון ענק לאיש הסידור שלנו שמתאם הכל פיקס.",
      date: "לפני 3 ימים"
    },
    {
      name: "דניאל לוי",
      type: "לקוח פרטי",
      initials: "דל",
      gradient: "from-pink-500 to-rose-500",
      content: "הגיעו בדיוק בשעה שנקבעה, טיפלו בציוד הרגיש בזהירות מקסימלית. ממליץ בחום!",
      date: "לפני שבוע"
    },
    {
      name: "רונית שקד",
      type: "ניהול פרויקטים",
      initials: "רש",
      gradient: "from-purple-500 to-fuchsia-600",
      content: "מקצועיות ללא פשרות, מערכת מעקב מושלמת ושקיפות מלאה לכל אורך הדרך.",
      date: "לפני חודש"
    }
  ];

  // B2C / B2B Quote Form State
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [formStep, setFormStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [quoteResult, setQuoteResult] = useState<MoveRequest | null>(null);

  // Form Fields State
  const [clientInfo, setClientInfo] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    companyName: ''
  });

  const [logistics, setLogistics] = useState({
    originAddress: '',
    destAddress: '',
    moveDate: '',
    moveTime: '',
    floor: 0,
    hasElevator: true,
    sofaFits: true,
    fridgeFits: true,
    truckAccess: 'easy' as TruckAccess,
    craneNeeded: 'dont_know' as CraneNeeded
  });

  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientInfo({ ...clientInfo, [e.target.name]: e.target.value });
  };

  const handleLogisticsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setLogistics({ ...logistics, [name]: checked });
    } else if (name === 'floor') {
      setLogistics({ ...logistics, floor: Number(value) });
    } else {
      setLogistics({ ...logistics, [name]: value });
    }
  };

  // Image upload base64 converter
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert('גודל הקובץ עולה על 5MB. נא לבחור תמונות קטנות יותר.');
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const validateStep = (stepNum: number) => {
    setErrorMsg(null);
    if (stepNum === 1) {
      if (!clientInfo.clientName || !clientInfo.clientPhone || !clientInfo.clientEmail) {
        setErrorMsg('נא למלא את כל שדות החובה בפרטי ההתקשרות.');
        return false;
      }
      if (clientType === 'b2b' && !clientInfo.companyName) {
        setErrorMsg('נא למלא את שם החברה עבור לוגיסטיקה עסקית.');
        return false;
      }
    } else if (stepNum === 2) {
      if (!logistics.originAddress || !logistics.destAddress || !logistics.moveDate || !logistics.moveTime) {
        setErrorMsg('נא למלא כתובות מוצא ויעד, תאריך ושעות מבוקשים.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(formStep)) {
      setFormStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setFormStep((prev) => prev - 1);
  };

  // Form Submission
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAiAnalyzing(true);
    setErrorMsg(null);

    // Assemble dummy catalog items or a generic commercial cargo item based on client type
    const defaultItems = clientType === 'b2b' 
      ? [{ id: 'b2b_cargo', name: 'תכולת משרד / לוגיסטיקה מסחרית', category: 'appliances', quantity: 1 }]
      : [{ id: 'b2c_household', name: 'תכולת דירה כללית', category: 'furniture', quantity: 1 }];

    const fullPayload = {
      clientName: clientInfo.clientName,
      clientPhone: clientInfo.clientPhone,
      clientEmail: clientInfo.clientEmail,
      companyName: clientType === 'b2b' ? clientInfo.companyName : '',
      originAddress: logistics.originAddress,
      destAddress: logistics.destAddress,
      moveDate: logistics.moveDate,
      moveTime: logistics.moveTime,
      moveType: clientType === 'b2b' ? ('office' as MoveType) : ('apartment' as MoveType),
      floor: logistics.floor,
      hasElevator: logistics.hasElevator,
      elevatorDetails: {
        sofaFits: logistics.sofaFits,
        fridgeFits: logistics.fridgeFits
      },
      truckAccess: logistics.truckAccess,
      craneNeeded: logistics.craneNeeded,
      items: defaultItems,
      images: images,
      notes: notes
    };

    try {
      const response = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[CrmLandingPage POST /api/moves Error]: HTTP ${response.status} (${response.statusText}):`, errText);
        throw new Error(`שגיאה בשמירת הבקשה במערכת (${response.status}): ${errText || response.statusText}`);
      }

      const savedMove = await response.json();
      setQuoteResult(savedMove);
    } catch (err: any) {
      console.error('[CrmLandingPage Quote Error]:', err);
      setErrorMsg(err?.message || 'אירעה שגיאה בשמירת הנתונים או בניתוח ה-AI. אנא נסו שוב.');
    } finally {
      setSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  const resetQuoteForm = () => {
    setQuoteResult(null);
    setFormStep(1);
    setClientInfo({ clientName: '', clientPhone: '', clientEmail: '', companyName: '' });
    setLogistics({
      originAddress: '',
      destAddress: '',
      moveDate: '',
      moveTime: '',
      floor: 0,
      hasElevator: true,
      sofaFits: true,
      fridgeFits: true,
      truckAccess: 'easy',
      craneNeeded: 'dont_know'
    });
    setImages([]);
    setNotes('');
  };

  return (
    <div id="landing-container" className="min-h-screen bg-[#0a192f] text-gray-100 overflow-x-hidden">
      
      {/* 1. Hero Section (אזור ראשי) */}
      <section id="hero-carousel-section" className="relative h-[550px] md:h-[650px] overflow-hidden flex items-center justify-center">
        {/* Carousel Background Images */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
            />
          </AnimatePresence>
          {/* Overlays to make text highly legible */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] via-[#0a192f]/70 to-[#0a192f]/50" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Content Box */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a192f]/95 border border-[#ff7f00]/30 text-[#ff7f00] text-xs md:text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(255,127,0,0.15)] mx-auto"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-[#ff7f00]" />
            <span>טכנולוגיית הלוגיסטיקה המתקדמת בישראל</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight"
          >
            מהירות, ביטחון ושליטה מלאה <br />
            <span className="text-[#ff7f00] bg-gradient-to-r from-[#ff7f00] to-amber-500 bg-clip-text text-transparent">בכל הובלה</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-md md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light"
          >
            פלטפורמת Truk Dealil IL מחברת אתכם ישירות לנהגי משאיות מורשים, עם מחשבון אומדן מבוסס בינה מלאכותית, סנכרון WhatsApp ומערכת אבטחה פיננסית.
          </motion.p>

          {/* Slider Indicators */}
          <div className="flex justify-center gap-3 pt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-[#ff7f00] w-8' : 'bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <button
              onClick={onNavigateToQuote}
              className="px-8 py-4 bg-[#ff7f00] hover:bg-[#e06f00] text-white font-bold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-[0_0_25px_rgba(255,127,0,0.35)] flex items-center justify-center gap-2 text-lg cursor-pointer"
            >
              <Truck className="w-5 h-5" />
              <span>מחשבון ומכרז הובלה חכם</span>
            </button>
            {onNavigateToDriverRegister && (
              <button
                onClick={onNavigateToDriverRegister}
                className="px-6 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-lg cursor-pointer shadow-md"
              >
                <span>רישום נהגים ומנופים 🚜</span>
              </button>
            )}
            <a
              href="#leads-join-section"
              className="px-8 py-4 bg-[#0a192f]/90 hover:bg-[#122846] border border-gray-700 hover:border-[#ff7f00] text-gray-200 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-lg"
            >
              <span>יצירת קשר ושותפויות</span>
            </a>
          </motion.div>
        </div>

        {/* Next/Prev Navigation Arrows */}
        <button
          onClick={handlePrevSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-[#ff7f00]/80 text-white rounded-full transition-colors z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <button
          onClick={handleNextSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-[#ff7f00]/80 text-white rounded-full transition-colors z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </section>

      {/* Trust Counters / Statistics Bar */}
      <section id="stats-banner" className="bg-[#122846]/60 border-y border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-mono">100%</span>
            <span className="text-xs text-gray-400 block font-semibold">נהגים מורשים ומבוטחים</span>
          </div>
          <div className="space-y-1 border-r border-gray-800">
            <span className="text-3xl md:text-4xl font-extrabold text-[#ff7f00] font-mono">₪250K</span>
            <span className="text-xs text-gray-400 block font-semibold">ביטוח תכולה מלא לכל סבלות</span>
          </div>
          <div className="space-y-1 border-r border-gray-800">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-mono">24/7</span>
            <span className="text-xs text-gray-400 block font-semibold">סנכרון מלא והפצת מכרזים</span>
          </div>
          <div className="space-y-1 border-r border-gray-800">
            <span className="text-3xl md:text-4xl font-extrabold text-[#ff7f00] font-mono">15+ דק׳</span>
            <span className="text-xs text-gray-400 block font-semibold">זמן ממוצע לקבלת הצעה ראשונה</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive B2C / B2B Quote Form Section */}
      <section id="quote-form-section" className="py-24 max-w-5xl mx-auto px-4 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-xs text-[#ff7f00] font-bold tracking-widest uppercase block mb-2">חישוב מהיר ומניעת סיכונים</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">מחשבון הצעת מחיר חכם ומכרז נהגים</h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto text-sm md:text-base font-light">
            מלאו את פרטי ההובלה הבאים. מערכת הבינה המלאכותית תחשב עבורכם את טווח המחיר המוגן והמומלץ, והמכרז יפורסם ישירות לקהילת הנהגים המורשים.
          </p>
        </div>

        {/* Customer Type Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#122846] p-1.5 rounded-2xl border border-gray-800 flex gap-1 shadow-lg max-w-md w-full">
            <button
              onClick={() => { setClientType('b2c'); resetQuoteForm(); }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                clientType === 'b2c' ? 'bg-[#ff7f00] text-white shadow-md shadow-[#ff7f00]/15' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>הובלה פרטית (B2C)</span>
            </button>
            <button
              onClick={() => { setClientType('b2b'); resetQuoteForm(); }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                clientType === 'b2b' ? 'bg-[#ff7f00] text-white shadow-md shadow-[#ff7f00]/15' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>לוגיסטיקה עסקית (B2B)</span>
            </button>
          </div>
        </div>

        {/* Main Interactive Form Card */}
        <div className="bg-[#0f223a] border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff7f00]/5 rounded-full blur-3xl pointer-events-none"></div>

          <AnimatePresence mode="wait">
            {!quoteResult ? (
              <form onSubmit={handleSubmitQuote} className="space-y-8">
                
                {/* Step indicators */}
                <div className="flex items-center justify-between mb-6 max-w-lg mx-auto">
                  {[1, 2, 3].map((num) => (
                    <React.Fragment key={num}>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          formStep === num 
                            ? 'bg-[#ff7f00] text-white ring-4 ring-[#ff7f00]/20' 
                            : formStep > num 
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-gray-850 text-gray-500 border border-gray-800'
                        }`}>
                          {formStep > num ? <Check className="w-4 h-4" /> : num}
                        </div>
                        <span className={`text-[10px] ${formStep === num ? 'text-[#ff7f00] font-bold' : 'text-gray-500'}`}>
                          {num === 1 ? 'פרטי לקוח' : num === 2 ? 'פרטי נתיב ונגישות' : 'קבצים והערות'}
                        </span>
                      </div>
                      {num < 3 && (
                        <div className={`flex-1 h-0.5 mx-2 rounded ${formStep > num ? 'bg-emerald-500/40' : 'bg-gray-800'}`}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {errorMsg && (
                  <div className="p-4 bg-red-950/40 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* STEP 1: CONTACT INFO */}
                {formStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">שם מלא / איש קשר לקבוצה <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            name="clientName"
                            required
                            placeholder="ישראל ישראלי"
                            value={clientInfo.clientName}
                            onChange={handleClientChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">מספר טלפון לתיאום <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="tel"
                            name="clientPhone"
                            required
                            placeholder="05x-xxxxxxx"
                            value={clientInfo.clientPhone}
                            onChange={handleClientChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">אימייל לקבלת סיכום <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="email"
                            name="clientEmail"
                            required
                            placeholder="name@domain.com"
                            value={clientInfo.clientEmail}
                            onChange={handleClientChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          {clientType === 'b2b' ? (
                            <span>שם החברה / ארגון <span className="text-[#ff7f00]">*</span></span>
                          ) : (
                            <span>שם חברה (אופציונלי להפקת חשבונית)</span>
                          )}
                        </label>
                        <div className="relative">
                          <Building className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            name="companyName"
                            required={clientType === 'b2b'}
                            placeholder="לוגיסטיקה בע״מ / פרטי"
                            value={clientInfo.companyName}
                            onChange={handleClientChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: LOGISTICS & PHYSICAL SPECS */}
                {formStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">כתובת מוצא (מאיפה מעבירים) <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            name="originAddress"
                            required
                            placeholder="עיר, רחוב ומספר בית"
                            value={logistics.originAddress}
                            onChange={handleLogisticsChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">כתובת יעד (לאן מעבירים) <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            name="destAddress"
                            required
                            placeholder="עיר, רחוב ומספר בית"
                            value={logistics.destAddress}
                            onChange={handleLogisticsChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">תאריך הובלה מועדף <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                          <input
                            type="date"
                            name="moveDate"
                            required
                            value={logistics.moveDate}
                            onChange={handleLogisticsChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">טווח שעות מבוקש <span className="text-[#ff7f00]">*</span></label>
                        <div className="relative">
                          <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                          <select
                            name="moveTime"
                            required
                            value={logistics.moveTime}
                            onChange={handleLogisticsChange}
                            className="w-full pr-11 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white cursor-pointer"
                          >
                            <option value="">בחר שעות</option>
                            <option value="בוקר (07:00 - 12:00)">בוקר (07:00 - 12:00)</option>
                            <option value="צהריים (12:00 - 16:00)">צהריים (12:00 - 16:00)</option>
                            <option value="אחר הצהריים (16:00 - 20:00)">אחר הצהריים (16:00 - 20:00)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">קומה בדירת מוצא</label>
                        <input
                          type="number"
                          name="floor"
                          min="0"
                          value={logistics.floor}
                          onChange={handleLogisticsChange}
                          className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-[#0a192f]/50 p-5 rounded-2xl border border-gray-800 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">גישה ונגישות חניית משאית</label>
                          <select
                            name="truckAccess"
                            value={logistics.truckAccess}
                            onChange={handleLogisticsChange}
                            className="w-full px-4 py-2.5 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white"
                          >
                            <option value="easy">קלה (חנייה צמודה מוסדרת)</option>
                            <option value="medium">בינונית (עד 30 מטר הליכה)</option>
                            <option value="difficult">קשה (חסימת כביש, הליכה מרובה)</option>
                            <option value="no_parking">אין חנייה קרובה כלל</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">האם נדרש מנוף חיצוני?</label>
                          <select
                            name="craneNeeded"
                            value={logistics.craneNeeded}
                            onChange={handleLogisticsChange}
                            className="w-full px-4 py-2.5 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white"
                          >
                            <option value="dont_know">לא יודע / החלטת סבל בשטח</option>
                            <option value="no">אין צורך במנוף</option>
                            <option value="yes">כן, נדרש מנוף בוודאות</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-6">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            name="hasElevator"
                            checked={logistics.hasElevator}
                            onChange={handleLogisticsChange}
                            className="w-5 h-5 rounded border-gray-700 text-[#ff7f00] focus:ring-[#ff7f00] bg-[#0a192f]"
                          />
                          <span className="text-sm text-gray-300 font-semibold">יש מעלית תקינה בבניין</span>
                        </label>

                        {logistics.hasElevator && (
                          <>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                name="sofaFits"
                                checked={logistics.sofaFits}
                                onChange={handleLogisticsChange}
                                className="w-5 h-5 rounded border-gray-700 text-[#ff7f00] focus:ring-[#ff7f00] bg-[#0a192f]"
                              />
                              <span className="text-xs text-gray-400">ספה גדולה נכנסת במעלית</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                name="fridgeFits"
                                checked={logistics.fridgeFits}
                                onChange={handleLogisticsChange}
                                className="w-5 h-5 rounded border-gray-700 text-[#ff7f00] focus:ring-[#ff7f00] bg-[#0a192f]"
                              />
                              <span className="text-xs text-gray-400">מקרר נכנס במעלית</span>
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: FILE UPLOAD & CONFIRM */}
                {formStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        העלאת תצלומים, מפרט תכולה או מסמכי מכרז (מגבלת 5MB)
                      </label>
                      <div className="flex flex-wrap gap-4 items-center">
                        <label className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-700 hover:border-[#ff7f00] bg-[#0a192f] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] text-gray-500">בחירת קובץ</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>

                        {images.map((base64, index) => (
                          <div key={index} className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-800">
                            <img src={base64} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 left-1 p-1 bg-red-600 hover:bg-red-750 text-white rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500">הקבצים יישמרו ישירות בתיקיית Google Drive המאובטחת (Drive Folder ID: 1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">הערות נוספות ודרישות אריזה מיוחדות</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="רשמו כאן דגשים, פריטים כבדים במיוחד או שבירים הדורשים טיפול מיוחד..."
                        className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm resize-none"
                      ></textarea>
                    </div>
                  </motion.div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={formStep === 1}
                    className="px-5 py-2.5 bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-700 transition-colors disabled:opacity-30 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>הקודם</span>
                  </button>

                  {formStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 bg-[#ff7f00] hover:bg-[#e06f00] text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1 text-xs shadow-[0_0_15px_rgba(255,127,0,0.2)]"
                    >
                      <span>המשך</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3 bg-gradient-to-r from-[#ff7f00] to-amber-500 hover:from-[#e06f00] hover:to-amber-600 text-white font-bold rounded-xl transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(255,127,0,0.3)]"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>חשב מחיר AI והגש למכרז</span>
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Success & AI Smart Quotation Output Block */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-right"
              >
                <div className="text-center pb-6 border-b border-gray-800 space-y-2">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">המכרז ובקשת ההובלה נוצרו בהצלחה!</h3>
                  <p className="text-gray-400 text-xs md:text-sm">
                    הנתונים והקבצים הועלו ל-Google Drive בתיקייה (ID: 1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG) וסונכרנו ל-CRM.
                  </p>
                </div>

                {quoteResult.aiAnalysis && (
                  <div className="bg-gradient-to-br from-[#0a192f] to-[#0f223a] border border-[#ff7f00]/30 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 px-3 py-1 bg-[#ff7f00] text-white text-[10px] font-bold rounded-br-xl flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span>ניתוח לוגיסטי AI</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      <div className="bg-[#0f223a]/90 p-4 rounded-xl border border-gray-800 text-center">
                        <span className="text-gray-400 text-[11px] block">אומדן מחיר מוצע לקוח</span>
                        <span className="text-2xl md:text-3xl font-black text-[#ff7f00] font-mono mt-1 block">
                          {quoteResult.aiAnalysis.estimatedPriceRange}
                        </span>
                      </div>

                      <div className="bg-[#0f223a]/90 p-4 rounded-xl border border-gray-800 text-center">
                        <span className="text-gray-400 text-[11px] block">מדד קושי הובלה מחושב</span>
                        <span className="text-2xl md:text-3xl font-black text-white font-mono mt-1 block">
                          {quoteResult.aiAnalysis.difficultyScore} / 10
                        </span>
                      </div>

                      <div className="bg-[#0f223a]/90 p-4 rounded-xl border border-gray-800">
                        <span className="text-gray-400 text-[11px] block">סיכום אפיון טכנולוגי</span>
                        <p className="text-gray-300 text-xs leading-relaxed mt-1">{quoteResult.aiAnalysis.summary}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800/80">
                      <span className="text-gray-400 text-xs font-bold block mb-2">הנחיות עבודה והמלצות מניעת סיכון:</span>
                      <ul className="space-y-1">
                        {quoteResult.aiAnalysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <span className="text-[#ff7f00]">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Simulated testing link */}
                <div className="bg-[#0a192f] border border-blue-500/20 p-5 rounded-2xl text-center space-y-3">
                  <h4 className="text-sm font-bold text-blue-400">הדמיית מכרז והגשת הצעה (כלי בדיקה לנהגים)</h4>
                  <p className="text-xs text-gray-400">
                    הדמיון כיצד נהג משאית מורשה מקבל את הקישור ב-WhatsApp ומציע מחיר עבור הובלה זו בזמן אמת.
                  </p>
                  <div className="flex justify-center">
                    <a 
                      href={`?view=driver&moveId=${quoteResult.id}`}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      כניסה לפורטל נהגים והגשת הצעת מחיר 🚚
                    </a>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={resetQuoteForm}
                    className="px-6 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-300"
                  >
                    חשב הצעת מחיר חדשה
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Analysis Overlay Loader */}
        <AnimatePresence>
          {aiAnalyzing && (
            <div className="fixed inset-0 bg-[#0a192f]/90 z-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 border-4 border-[#ff7f00]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#ff7f00] border-t-transparent rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-[#ff7f00] absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
              </div>
              <h3 className="text-lg font-bold text-white">מפעיל מנוע ניתוח AI לסיכול סיכונים...</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                מחשב נפחים, משקלים, נגישות חנייה וקומות לייצור טווח מחיר אופטימלי להגנה על תקציבכם. אנא המתינו.
              </p>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. Google Style Reviews Section (סקשן ביקורות אמינות) */}
      <section id="google-reviews-section" className="py-24 bg-[#0f223a]/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs text-[#ff7f00] font-bold tracking-widest uppercase block mb-2">אמינות וביטחון מוכח</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>לקוחות ממליצים ב-Google Reviews</span>
            </h2>
            
            {/* Google Rating badge */}
            <div className="flex items-center justify-center gap-2 mt-4 bg-[#0a192f] px-5 py-2.5 rounded-full border border-gray-800 inline-flex">
              {/* Fake Google Logo colors */}
              <span className="text-md font-bold text-white flex items-center gap-1 font-sans">
                <span className="text-blue-500">G</span>
                <span className="text-red-500">o</span>
                <span className="text-yellow-500">o</span>
                <span className="text-blue-500">g</span>
                <span className="text-green-500">l</span>
                <span className="text-red-500">e</span>
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-gray-300 font-bold font-mono">4.9 / 5.0 (240+ ביקורות מאומתות)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {googleReviews.map((review, idx) => (
              <div 
                key={idx}
                className="bg-[#0a192f] border border-gray-800/80 hover:border-[#ff7f00]/40 p-6 rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative group"
              >
                {/* Google 'G' watermark icon */}
                <div className="absolute top-4 left-4 text-gray-800/20 group-hover:text-[#ff7f00]/10 transition-colors pointer-events-none">
                  <span className="text-3xl font-black font-sans">G</span>
                </div>

                <div className="flex gap-3 items-center mb-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center font-bold text-white text-xs shadow-md`}>
                    {review.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{review.name}</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="לקוח מאומת"></span>
                    </h4>
                    <span className="text-[11px] text-gray-400 font-medium">{review.type}</span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-light mb-4">
                  "{review.content}"
                </p>

                {/* Meta details */}
                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-3 border-t border-gray-800/50">
                  <span>✓ ביקורת מאומתת</span>
                  <span>{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Features / Premium Technology Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-xs text-[#ff7f00] font-bold tracking-widest uppercase block mb-2">פתרונות לוגיסטיקה כוללים</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">בקרת איכות ואחריות קפדנית</h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto text-sm">התשובה המושלמת לניהול הובלות מסחריות, העברות דירה, והפצות ארציות.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#122846]/40 border border-gray-800 p-8 rounded-2xl space-y-4 hover:border-gray-700 transition-all">
            <div className="w-12 h-12 bg-[#ff7f00]/10 text-[#ff7f00] rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">מנגנון אבטחה כספי תפעולי</h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              הובלות אינן מאושרות לשינוע אלא אם כן עברו אישור תקציבי על ידי מנהל מערכת. המערכת מגנה עליכם מפני הפתעות תשלום או סחטנות.
            </p>
          </div>

          <div className="bg-[#122846]/40 border border-gray-800 p-8 rounded-2xl space-y-4 hover:border-gray-700 transition-all">
            <div className="w-12 h-12 bg-[#ff7f00]/10 text-[#ff7f00] rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">גיבוי וביטוח מקצועי</h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              כל הובלה מבוטחת בכיסוי נזקים מקיף של עד ₪250,000. הנהגים שלנו נבחרים בפינצטה ומחזיקים בכל ההיתרים והביטוחים הדרושים בחוק.
            </p>
          </div>

          <div className="bg-[#122846]/40 border border-gray-800 p-8 rounded-2xl space-y-4 hover:border-gray-700 transition-all">
            <div className="w-12 h-12 bg-[#ff7f00]/10 text-[#ff7f00] rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-white">אינטגרציה ל-WhatsApp</h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              שיגור אוטומטי של המכרז לקהילות נהגים מורשים וסנכרון מלא מול הלקוח. תוכלו לקבל עדכונים שוטפים ישירות לנייד ללא מאמץ.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CRM Leads / Join Form Section */}
      <section id="leads-join-section" className="py-24 max-w-4xl mx-auto px-4 scroll-mt-20">
        <div className="bg-gradient-to-b from-[#122846]/80 to-[#0a192f] border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff7f00]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">פנייה לנציג עסקי / הצטרפות כשותף</h2>
            <p className="text-gray-400 text-xs md:text-sm mt-1">השאירו פרטים ונציג לוגיסטיקה בכיר מטעמנו יחזור אליכם בהקדם האפשרי.</p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const name = (target.elements.namedItem('fullName') as HTMLInputElement).value;
              const phone = (target.elements.namedItem('phone') as HTMLInputElement).value;
              const email = (target.elements.namedItem('email') as HTMLInputElement).value;
              const company = (target.elements.namedItem('companyName') as HTMLInputElement).value;
              const notesVal = (target.elements.namedItem('notes') as HTMLTextAreaElement).value;

              const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: name, phone, email, companyName: company, notes: notesVal })
              });
              if (response.ok) {
                alert('פנייתכם התקבלה בהצלחה ב-CRM! ניצור קשר בהקדם.');
                target.reset();
              } else {
                const errText = await response.text().catch(() => '');
                console.error(`[CrmLandingPage POST /api/leads Error]: HTTP ${response.status} (${response.statusText}):`, errText);
                alert(`שגיאה ברישום הליד (${response.status}). אנא נסו שוב.`);
              }
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">שם מלא <span className="text-[#ff7f00]">*</span></label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="ישראל ישראלי"
                  className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">מספר טלפון <span className="text-[#ff7f00]">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="05x-xxxxxxx"
                  className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">אימייל <span className="text-[#ff7f00]">*</span></label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300">שם חברה / ארגון</label>
                <input
                  type="text"
                  name="companyName"
                  placeholder="חברה בע״מ / פרטי"
                  className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300">הערות ובקשות מיוחדות</label>
              <textarea
                name="notes"
                rows={4}
                placeholder="כתבו לנו כאן כיצד נוכל לעזור לכם בניהול ההפצה והשינוע..."
                className="w-full px-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#ff7f00] hover:bg-[#e06f00] text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,127,0,0.25)] flex items-center justify-center gap-2 text-xs"
            >
              <Send className="w-4 h-4" />
              <span>שלח פנייה לנציג לוגיסטיקה</span>
            </button>
          </form>
        </div>
      </section>

      {/* Footnote Trust list */}
      <section className="py-12 bg-[#0a192f] border-t border-gray-900 text-center text-[11px] text-gray-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-6">
          <span>✓ מאות הובלות מאושרות</span>
          <span>✓ מערכת בקרת כספים מאובטחת</span>
          <span>✓ פריסה ארצית מקצה לקצה</span>
          <span>✓ אינטגרציה רשמית ל-Drive ו-WhatsApp</span>
        </div>
      </section>

    </div>
  );
}
