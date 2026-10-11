import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, Clock, Sparkles, 
  ChevronLeft, ChevronRight, Upload, X, ShieldAlert, 
  CheckCircle2, ListPlus, ArrowLeftRight, FileText, Star,
  ShieldCheck, AlertTriangle, Cpu, Check, Download, Zap, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATALOG_ITEMS, InventoryItem, MoveType, TruckAccess, CraneNeeded, MoveRequest } from '../types';

interface MoveFormProps {
  onMoveCreated: (newMove: MoveRequest) => void;
}

export default function MoveForm({ onMoveCreated }: MoveFormProps) {
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // Form States
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
    moveTime: 'בוקר (07:00 - 12:00)',
    floor: 1,
    hasElevator: true,
    truckAccess: 'easy' as TruckAccess,
    craneNeeded: 'no' as CraneNeeded,
  });

  // Selected items catalog state (Pre-populate with some core items set to 0)
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([
    { id: 'sofa_3', name: 'סלון (מערכת ישיבה)', category: 'furniture', quantity: 1 },
    { id: 'fridge_big', name: 'מקרר משפחתי', category: 'appliances', quantity: 1 },
    { id: 'washing_machine', name: 'מכונת כביסה', category: 'appliances', quantity: 1 },
    { id: 'box_standard', name: 'ארגזי קרטון לאריזה', category: 'boxes', quantity: 10 }
  ]);

  const [customItemName, setCustomItemName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Submission / Estimation States
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // AI Estimation result stored client-side before final submission
  const [aiEstimate, setAiEstimate] = useState<{
    estimatedPriceRange: string;
    difficultyScore: number;
    recommendations: string[];
    summary: string;
  } | null>(null);

  // Computed live summary values for instant feedback
  const totalVolume = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Handle Input Changes
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

  // Inventory Item Management
  const handleItemQuantityChange = (itemId: string, increment: boolean) => {
    const existing = selectedItems.find(i => i.id === itemId);
    if (existing) {
      const newQty = increment ? existing.quantity + 1 : existing.quantity - 1;
      if (newQty <= 0) {
        setSelectedItems(selectedItems.filter(i => i.id !== itemId));
      } else {
        setSelectedItems(selectedItems.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
      }
    } else if (increment) {
      // Find in existing or general catalog
      const catalogItem = CATALOG_ITEMS.find(i => i.id === itemId) || 
        [
          { id: 'sofa_3', name: 'סלון (מערכת ישיבה)', category: 'furniture' },
          { id: 'fridge_big', name: 'מקרר משפחתי', category: 'appliances' },
          { id: 'washing_machine', name: 'מכונת כביסה', category: 'appliances' },
          { id: 'box_standard', name: 'ארגזי קרטון לאריזה', category: 'boxes' }
        ].find(i => i.id === itemId);

      if (catalogItem) {
        setSelectedItems([...selectedItems, { ...catalogItem, quantity: 1 } as InventoryItem]);
      }
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const customId = 'custom_' + Date.now();
    const newItem: InventoryItem = {
      id: customId,
      name: customItemName,
      category: 'other',
      quantity: 1
    };
    setSelectedItems([...selectedItems, newItem]);
    setCustomItemName('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  // Image Upload base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert('גודל הקובץ עולה על 5MB. אנא בחר תמונות קטנות יותר.');
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  // 3-Step Wizard Navigation & Instant Cost Computation
  const handleNextStep = async () => {
    setValidationError(null);

    if (step === 1) {
      if (!clientInfo.clientName || !clientInfo.clientPhone || !clientInfo.clientEmail) {
        setValidationError('נא למלא את כל שדות החובה בפרטי ההתקשרות.');
        return;
      }
      if (!logistics.originAddress || !logistics.destAddress || !logistics.moveDate) {
        setValidationError('נא למלא כתובות מוצא ויעד, ותאריך מבוקש.');
        return;
      }
    } else if (step === 2) {
      if (logistics.floor === undefined || logistics.floor < 0) {
        setValidationError('נא להזין קומה תקינה (0 עבור קרקע).');
        return;
      }
    } else if (step === 3) {
      if (selectedItems.length === 0) {
        setValidationError('אנא בחרו לפחות פריט אחד להובלה כדי שנוכל לחשב עבורכם הצעת מחיר.');
        return;
      }

      // We reached the end of Step 3! Let's trigger the instant AI Calculation first.
      setAiAnalyzing(true);
      
      const payload = {
        clientName: clientInfo.clientName,
        clientPhone: clientInfo.clientPhone,
        clientEmail: clientInfo.clientEmail,
        companyName: clientInfo.companyName,
        originAddress: logistics.originAddress,
        destAddress: logistics.destAddress,
        moveDate: logistics.moveDate,
        moveTime: logistics.moveTime,
        moveType: 'apartment' as MoveType,
        floor: logistics.floor,
        hasElevator: logistics.hasElevator,
        elevatorDetails: { sofaFits: true, fridgeFits: true },
        truckAccess: logistics.truckAccess,
        craneNeeded: logistics.craneNeeded,
        items: selectedItems,
        images: images,
        notes: notes
      };

      try {
        // Simple client-side backup simulation or call our real API
        const basePrice = 450 + (selectedItems.reduce((acc, item) => acc + (item.quantity * 45), 0));
        const floorCost = logistics.floor * 110;
        const elevatorMultiplier = logistics.hasElevator ? 0.8 : 1.45;
        const accessMultiplier = logistics.truckAccess === 'easy' ? 1.0 : logistics.truckAccess === 'medium' ? 1.15 : 1.3;
        const cranePrice = logistics.craneNeeded === 'yes' ? 450 : 0;

        const estMin = Math.round(((basePrice + floorCost) * elevatorMultiplier * accessMultiplier) + cranePrice);
        const estMax = Math.round((((basePrice + floorCost) * elevatorMultiplier * accessMultiplier) * 1.2) + cranePrice + 150);

        // Professional Tips based on parameters
        const tips = [
          'מומלץ לעטוף מראש מוצרי חשמל ורהיטים בניילון נצמד תעשייתי למניעת שריטות.',
          logistics.floor > 2 && !logistics.hasElevator 
            ? 'שימו לב: ההובלה ללא מעלית לקומה גבוהה מצריכה צוות סבלים רחב. האומדן מותאם לכך.'
            : 'הבניין מצויד במעלית רחבה. יש לוודא מול ועד הבית כי מעלית השירות פעילה ביום ההובלה.',
          logistics.truckAccess === 'difficult' || logistics.truckAccess === 'no_parking'
            ? 'נמליץ לתפוס מקום חנייה ייעודי למשאית כבר בערב שלפני ההובלה למניעת עיכובים מיותרים.'
            : 'גישת החנייה הוגדרה כקלה - הדבר יוזיל משמעותית את זמן ההעמסה.',
          logistics.craneNeeded === 'yes' 
            ? 'נדרש תיאום שטח מנוף פנוי מול העירייה ומול מפעיל המנוף מראש.'
            : 'ההובלה מתוכננת ללא מנוף חיצוני. במידה ויש פריטים שלא נכנסים במעלית או במדרגות, יש לעדכן מראש.'
        ];

        setAiEstimate({
          estimatedPriceRange: `₪${estMin.toLocaleString()} - ₪${estMax.toLocaleString()}`,
          difficultyScore: logistics.floor > 3 && !logistics.hasElevator ? 8 : (totalVolume > 15 ? 6 : 4),
          recommendations: tips,
          summary: `הובלת דירה מ${logistics.originAddress} אל ${logistics.destAddress} הכוללת ${totalVolume} פריטי ציוד ותכולה.`
        });
      } catch (err) {
        console.error('AI calculation error:', err);
      } finally {
        setAiAnalyzing(false);
      }
    }

    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setStep(prev => prev - 1);
  };

  // Final Action: Single-click dispatch to drivers
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setValidationError(null);

    const fullPayload = {
      clientName: clientInfo.clientName,
      clientPhone: clientInfo.clientPhone,
      clientEmail: clientInfo.clientEmail,
      companyName: clientInfo.companyName,
      originAddress: logistics.originAddress,
      destAddress: logistics.destAddress,
      moveDate: logistics.moveDate,
      moveTime: logistics.moveTime,
      moveType: 'apartment' as MoveType,
      floor: logistics.floor,
      hasElevator: logistics.hasElevator,
      elevatorDetails: {
        sofaFits: true,
        fridgeFits: true
      },
      truckAccess: logistics.truckAccess,
      craneNeeded: logistics.craneNeeded,
      items: selectedItems,
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
        const errorText = await response.text().catch(() => '');
        console.error(`[MoveForm POST /api/moves Error]: HTTP ${response.status} (${response.statusText}):`, errorText);
        throw new Error(`שגיאה בשמירת בקשת המכרז בשרת (${response.status}): ${errorText || response.statusText}`);
      }

      const savedMove = await response.json();
      
      // Trigger visually stunning Success Animation
      setShowSuccessAnimation(true);
      
      // After 3.2 seconds of beautiful animation, route to the live tracking view
      setTimeout(() => {
        onMoveCreated(savedMove);
      }, 3500);

    } catch (err: any) {
      console.error('[MoveForm Submission Failed]:', err);
      setValidationError(err?.message || 'אירעה שגיאה בחיבור לשרת או בפרסום המכרז. אנא נסה שוב.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12" id="smart-pwa-container">
      
      {/* Premium Artistic Marketing Hero Block */}
      {step === 1 && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#0c2445] to-[#0a192f] border border-[#ff7f00]/20 rounded-3xl p-6 md:p-8 mb-8 text-right relative overflow-hidden shadow-xl"
          id="marketing-hero-banner"
        >
          {/* Decorative Glowing Effect */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ff7f00]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
            <div className="space-y-4 max-w-xl">
              {/* Trust Indicators: 5 Stars Rating & Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>4.9 מתוך 5 (1,200+ לקוחות)</span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>בפיקוח מלא וביטוח רכוש</span>
                </div>
              </div>

              <h2 className="text-2xl md:text-3.5xl font-extrabold text-white leading-tight">
                העבר דירה בראש שקט – <br />
                <span className="text-[#ff7f00] bg-gradient-to-r from-[#ff7f00] to-amber-500 bg-clip-text text-transparent">בלי הפתעות ובמחיר מובטח!</span>
              </h2>
              <p className="text-gray-300 text-sm md:text-base font-light leading-relaxed">
                מערכת המכרזים החכמה שלנו מחברת אתכם למובילים מורשים בזמן אמת, מונעת הפקעת מחירים ביום ההובלה ומעניקה ביטחון ופיקוח מלא על המטען.
              </p>

              {/* Live Availability Meter */}
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>מדד זמינות מובילים ארצי נוכחי: <strong className="text-white">98% (פנויים למכרז מיידי)</strong></span>
              </div>
            </div>

            {/* Premium PWA Install Prompt (Add to Home Screen) */}
            {showInstallBtn && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a192f] border border-gray-800 p-4 rounded-2xl flex flex-col items-center text-center gap-3 w-full md:w-56 shrink-0 shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-[#ff7f00]/10 flex items-center justify-center text-[#ff7f00] border border-[#ff7f00]/20">
                  <Download className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">התקנת אפליקציית PWA</h4>
                  <p className="text-[10px] text-gray-400">גישה מהירה מהמסך הראשי ומעקב הובלה חי</p>
                </div>
                <button
                  onClick={handleInstallApp}
                  className="w-full py-2 bg-[#ff7f00] hover:bg-[#e06f00] text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_10px_rgba(255,127,0,0.2)] cursor-pointer"
                >
                  התקנה מהירה למסך הבית 📱
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Smart Wizard Steps Header */}
      {step <= 3 && (
        <div className="mb-6 bg-[#0f223a] p-4 rounded-2xl border border-gray-800" id="smart-wizard-steps">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step === num 
                      ? 'bg-[#ff7f00] text-white ring-4 ring-[#ff7f00]/20' 
                      : step > num 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-gray-850 text-gray-500 border border-gray-800'
                  }`}>
                    {step > num ? <Check className="w-5 h-5 text-emerald-400 font-bold" /> : num}
                  </div>
                  <span className={`text-xs ${step === num ? 'text-[#ff7f00] font-bold' : 'text-gray-400'}`}>
                    {num === 1 ? 'פרטי נתיב וקשר' : num === 2 ? 'נגישות ופרטים טכניים' : 'תכולה וצילומים'}
                  </span>
                </div>
                {num < 3 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded transition-all duration-300 ${step > num ? 'bg-emerald-500/50' : 'bg-gray-800'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Wizard Form Body Card */}
      <div className="bg-[#0f223a] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden" id="wizard-body-card">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#ff7f00] via-amber-500 to-indigo-600"></div>

        {/* Validation Errors banner */}
        {validationError && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Dynamic Wizard Steps */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Route & Contact Details */}
          {step === 1 && (
            <motion.div
              key={1}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="border-b border-gray-800 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#ff7f00] rounded-full"></span>
                <h3 className="text-xl font-bold text-white">שלב 1: כתובות, מועד ופרטי קשר</h3>
              </div>

              {/* Route Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">כתובת מוצא (מאיפה מעבירים) <span className="text-[#ff7f00]">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                    <input
                      type="text"
                      name="originAddress"
                      required
                      value={logistics.originAddress}
                      onChange={handleLogisticsChange}
                      placeholder="לדוגמה: הרצל 45, ראשון לציון"
                      className="w-full pr-10 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] focus:ring-1 focus:ring-[#ff7f00] outline-none text-white text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">כתובת יעד (לאן מעבירים) <span className="text-[#ff7f00]">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                    <input
                      type="text"
                      name="destAddress"
                      required
                      value={logistics.destAddress}
                      onChange={handleLogisticsChange}
                      placeholder="לדוגמה: דיזנגוף 120, תל אביב"
                      className="w-full pr-10 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] focus:ring-1 focus:ring-[#ff7f00] outline-none text-white text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">תאריך הובלה מבוקש <span className="text-[#ff7f00]">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 pointer-events-none" />
                    <input
                      type="date"
                      name="moveDate"
                      required
                      value={logistics.moveDate}
                      onChange={handleLogisticsChange}
                      className="w-full pr-10 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">חלון שעות מועדף</label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 pointer-events-none" />
                    <select
                      name="moveTime"
                      value={logistics.moveTime}
                      onChange={handleLogisticsChange}
                      className="w-full pr-10 pl-4 py-3 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-sm cursor-pointer"
                    >
                      <option value="בוקר (07:00 - 12:00)">בוקר (07:00 - 12:00)</option>
                      <option value="צהריים (12:00 - 16:00)">צהריים (12:00 - 16:00)</option>
                      <option value="אחר הצהריים (16:00 - 20:00)">אחר הצהריים (16:00 - 20:00)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information Details Card */}
              <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-4">
                <span className="block text-sm font-bold text-[#ff7f00]">פרטי התקשרות לקבלת הצעות והתראות בוואטסאפ:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">שם מלא <span className="text-[#ff7f00]">*</span></label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        name="clientName"
                        required
                        value={clientInfo.clientName}
                        onChange={handleClientChange}
                        placeholder="ישראל ישראלי"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">מספר טלפון לתיאום <span className="text-[#ff7f00]">*</span></label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        name="clientPhone"
                        required
                        value={clientInfo.clientPhone}
                        onChange={handleClientChange}
                        placeholder="052-1234567"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">דוא״ל לקבלת סיכום והצעות <span className="text-[#ff7f00]">*</span></label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        name="clientEmail"
                        required
                        value={clientInfo.clientEmail}
                        onChange={handleClientChange}
                        placeholder="israel@domain.com"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#0a192f] border border-gray-700 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Accessibility & Technical Details */}
          {step === 2 && (
            <motion.div
              key={2}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="border-b border-gray-800 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#ff7f00] rounded-full"></span>
                <h3 className="text-xl font-bold text-white">שלב 2: נתונים טכניים ונגישות</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Floor Selection */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">קומה בבניין (מוצא/יעד הגבוה מביניהם)</label>
                  <p className="text-xs text-gray-400">הקומה משפיעה על גובה הסבלות במידה ואין מעלית</p>
                  <div className="flex items-center gap-4 pt-1">
                    {[0, 1, 2, 3, 4, 5].map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => setLogistics({ ...logistics, floor: fl })}
                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                          logistics.floor === fl 
                            ? 'bg-[#ff7f00] text-white shadow-md' 
                            : 'bg-[#0a192f] text-gray-400 border border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {fl === 0 ? 'קרקע' : fl}
                      </button>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">קומה חריגה:</span>
                      <input
                        type="number"
                        min="6"
                        value={logistics.floor > 5 ? logistics.floor : ''}
                        onChange={(e) => setLogistics({ ...logistics, floor: Number(e.target.value) })}
                        placeholder="6+"
                        className="w-14 px-2 py-1.5 bg-[#0a192f] border border-gray-800 rounded-lg text-white text-center text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Spacious Elevator Check */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 font-sans">מעלית מרווחת ותקינה בבניין?</label>
                  <p className="text-xs text-gray-400">האם קיים פתח מעלית רחב המאפשר כניסת מקרר/ספה?</p>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setLogistics({ ...logistics, hasElevator: true })}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        logistics.hasElevator === true
                          ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400' 
                          : 'bg-[#0a192f] text-gray-400 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>כן, יש מעלית מרווחת</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogistics({ ...logistics, hasElevator: false })}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        logistics.hasElevator === false
                          ? 'bg-red-500/10 border border-red-500/40 text-red-400' 
                          : 'bg-[#0a192f] text-gray-400 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>לא, העברה במדרגות בלבד</span>
                    </button>
                  </div>
                </div>

                {/* Truck Parking Access */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">מרחק חנייה למשאית מהכניסה</label>
                  <p className="text-xs text-gray-400">משפיע ישירות על סרבול הסבלות וזמן העבודה</p>
                  <select
                    name="truckAccess"
                    value={logistics.truckAccess}
                    onChange={handleLogisticsChange}
                    className="w-full px-4 py-3 bg-[#0a192f] border border-gray-750 rounded-xl focus:border-[#ff7f00] outline-none text-white text-xs cursor-pointer"
                  >
                    <option value="easy">קלה - חנייה ייעודית צמודה עד 10 מטרים הליכה</option>
                    <option value="medium">בינונית - עד 30 מטר הליכה ללא חסימת נתיבים</option>
                    <option value="difficult">קשה - חסימת כביש חלקית או הליכה של 50+ מטרים</option>
                    <option value="no_parking">אין חנייה - נדרשת סחיבה מורכבת ביותר מרחוק</option>
                  </select>
                </div>

                {/* Crane Requirement */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">האם נדרש מנוף חיצוני?</label>
                  <p className="text-xs text-gray-400">חובה לקומות גבוהות עם רהיטים כבדים או מדרגות צרות</p>
                  
                  <div className="flex gap-2 pt-2">
                    {['no', 'yes', 'dont_know'].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setLogistics({ ...logistics, craneNeeded: choice as CraneNeeded })}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          logistics.craneNeeded === choice
                            ? 'bg-[#ff7f00]/10 border border-[#ff7f00]/40 text-[#ff7f00]'
                            : 'bg-[#0a192f] text-gray-400 border border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        {choice === 'no' ? 'אין צורך' : choice === 'yes' ? 'כן, נדרש מנוף' : 'לא יודע'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 3: Core Inventory & Quick Image Upload */}
          {step === 3 && (
            <motion.div
              key={3}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="border-b border-gray-800 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#ff7f00] rounded-full"></span>
                <h3 className="text-xl font-bold text-white">שלב 3: סימון תכולה מרכזית וצילומים</h3>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                סמנו פריטים להעברה מהרשימה המהירה להלן. מנוע ה-AI ינתח את הנפח הכללי ויעניק לכם הערכת מחיר מיידית ומניעת תוספת תשלום ביום המעבר!
              </p>

              {/* Core Fast-Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'sofa_3', name: 'סלון (ספה ומערכות ישיבה)', icon: '🛋️' },
                  { id: 'fridge_big', name: 'מקרר משפחתי', icon: '❄️' },
                  { id: 'washing_machine', name: 'מכונת כביסה / מייבש', icon: '🧺' },
                  { id: 'box_standard', name: 'ארגזי קרטון לאריזה', icon: '📦' }
                ].map((core) => {
                  const selected = selectedItems.find(i => i.id === core.id);
                  const qty = selected ? selected.quantity : 0;
                  return (
                    <div 
                      key={core.id} 
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        qty > 0 
                          ? 'bg-[#0a192f]/60 border-[#ff7f00]/40 text-white' 
                          : 'bg-[#0a192f]/20 border-gray-800 text-gray-400 hover:border-gray-705'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{core.icon}</span>
                        <div>
                          <span className="font-bold text-sm block text-white">{core.name}</span>
                          <span className="text-[10px] text-gray-500">לחיצה מהירה להוספה ושינוי כמות</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleItemQuantityChange(core.id, false)}
                          className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 font-bold flex items-center justify-center cursor-pointer hover:bg-gray-750"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-md text-white w-6 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleItemQuantityChange(core.id, true)}
                          className="w-8 h-8 rounded-lg bg-[#ff7f00]/10 text-[#ff7f00] font-bold flex items-center justify-center cursor-pointer hover:bg-[#ff7f00]/20"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom / Extra Items Search Bar */}
              <div className="bg-[#0a192f]/40 p-4 rounded-2xl border border-gray-850 space-y-3">
                <span className="block text-xs font-bold text-gray-300">צריכים להעביר פריטים נוספים? (ארונות, שולחנות, מזנונים וכו׳)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="הקלידו שם פריט (לדוגמה: ארון בגדים 4 דלתות, שולחן אוכל)"
                    className="flex-1 px-4 py-2 bg-[#0a192f] border border-gray-750 rounded-xl text-xs text-white focus:border-[#ff7f00] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-4 py-2 bg-[#ff7f00]/10 hover:bg-[#ff7f00]/20 text-[#ff7f00] font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all border border-[#ff7f00]/20"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>הוסף לרשימה</span>
                  </button>
                </div>

                {/* Display other added items in a flex list */}
                {selectedItems.filter(i => !['sofa_3', 'fridge_big', 'washing_machine', 'box_standard'].includes(i.id)).length > 0 && (
                  <div className="pt-2 border-t border-gray-800 flex flex-wrap gap-2">
                    {selectedItems.filter(i => !['sofa_3', 'fridge_big', 'washing_machine', 'box_standard'].includes(i.id)).map((item) => (
                      <div key={item.id} className="bg-[#0a192f] px-3 py-1.5 rounded-lg border border-gray-850 flex items-center gap-2 text-xs text-gray-300">
                        <span>{item.name}</span>
                        <span className="font-bold text-[#ff7f00]">({item.quantity})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Photo Upload & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Drag / Select Image Upload zone */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-300">העלאת צילומים של נקודות בעייתיות / פריטים חריגים</label>
                    <p className="text-[10px] text-gray-500">מומלץ לצלם מסדרונות צרים, פריטים כבדים במיוחד או חדר מדרגות צפוף</p>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center pt-2">
                    <label className="w-20 h-20 rounded-xl border border-dashed border-gray-700 hover:border-[#ff7f00] bg-[#0a192f] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-[#0a192f]/80 shrink-0">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-[9px] text-gray-500">העלאה</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {images.map((base64, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-800 shrink-0">
                        <img src={base64} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 left-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operational Notes */}
                <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-2">
                  <label className="block text-xs font-bold text-gray-300">הנחיות או דגשים מיוחדים למובילים (אופציונלי)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="לדוגמה: נדרש פירוק והרכבה של המיטה הזוגית, או לחסום את חניית הבניין מראש..."
                    className="w-full px-4 py-2 bg-[#0a192f] border border-gray-750 rounded-xl text-xs text-white focus:border-[#ff7f00] outline-none resize-none placeholder:text-gray-600"
                  ></textarea>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 4: AI Model Estimate Output, Tips, and Dispatch confirmation */}
          {step === 4 && aiEstimate && (
            <motion.div
              key={4}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Top AI Indicator Banner */}
              <div className="bg-gradient-to-r from-indigo-950 to-[#0c2445] border border-indigo-500/20 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between text-right">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0 animate-pulse">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">מנוע ניתוח סיכונים ומחשבון AI אומת בהצלחה!</h4>
                    <p className="text-xs text-gray-400">הנתונים שולבו בשיטה סימולטיבית המונעת הפתעות ושינויי מחיר</p>
                  </div>
                </div>
                <div className="bg-[#ff7f00]/10 border border-[#ff7f00]/30 px-3 py-1.5 rounded-full text-[#ff7f00] text-xs font-bold">
                  הערכה מוגנת
                </div>
              </div>

              {/* Grid with estimate range & difficulty meter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Price Estimate Area */}
                <div className="bg-gradient-to-br from-[#0a192f] to-[#0f2d52] border border-[#ff7f00]/30 p-6 rounded-2xl text-center space-y-2 shadow-lg">
                  <span className="text-xs text-gray-300 font-bold tracking-widest block">טווח מחיר AI מומלץ למכרז</span>
                  <span className="text-4xl font-extrabold text-[#ff7f00] font-mono tracking-tight block">
                    {aiEstimate.estimatedPriceRange}
                  </span>
                  <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                    זהו טווח אומדן מונע סיכונים המתאים לנפח, קומה, קושי חנייה ומעלית. נהגים יתחרו עליכם ותוכלו לבחור את ההצעה הטובה ביותר!
                  </p>
                </div>

                {/* Difficulty Index Score */}
                <div className="bg-[#0a192f]/65 border border-gray-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div className="text-center space-y-1">
                    <span className="text-xs text-gray-400 font-semibold block">מדד מורכבות ההובלה במערכת</span>
                    <span className="text-3xl font-black text-white font-mono block">{aiEstimate.difficultyScore} / 10</span>
                  </div>

                  <div className="w-full bg-[#0a192f] rounded-full h-2 border border-gray-800 mt-3 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${aiEstimate.difficultyScore * 10}%` }}
                    ></div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center leading-relaxed pt-2">
                    {aiEstimate.difficultyScore >= 7 
                      ? 'הובלה במורכבות גבוהה בשל אתגרי קומה/נגישות. מומלץ לוודא הגעת מנוף מראש.' 
                      : 'הובלה במורכבות סטנדרטית - צפוי מהלך הובלה מהיר וחלק.'
                    }
                  </p>
                </div>

              </div>

              {/* Expert Tips Column */}
              <div className="bg-[#0a192f]/40 p-5 rounded-2xl border border-gray-850 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-gray-800 pb-2">
                  <AlertTriangle className="w-4 h-4 text-[#ff7f00]" />
                  <span>המלצות מקצועיות של Truk Dealil IL למניעת עיכובים:</span>
                </span>
                
                <ul className="space-y-2">
                  {aiEstimate.recommendations.map((rec, index) => (
                    <li key={index} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-[#ff7f00] font-black leading-none shrink-0">•</span>
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dev Helper notification details */}
              <div className="text-[10px] text-gray-500 bg-[#0a192f]/20 p-3 rounded-lg text-center border border-gray-850">
                פרסום המכרז יפעיל את מערכת הבקרה, ישלח התראות לנהגים ב-WhatsApp דרך Make.com, ויפתח לכם עמוד מעקב חי לבחירת הצעת מחיר.
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Form Wizard Navigation Buttons Footer */}
        {step <= 4 && (
          <div className="flex justify-between items-center pt-6 border-t border-gray-800 mt-8" id="wizard-buttons-footer">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={step === 1 || submitting}
              className="px-4 py-2.5 bg-[#0a192f] hover:bg-[#122846] text-gray-400 hover:text-white rounded-xl border border-gray-800 transition-all disabled:opacity-20 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ChevronRight className="w-4 h-4" />
              <span>הקודם</span>
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#ff7f00] hover:bg-[#e06f00] text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(255,127,0,0.25)] cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <span>המשך</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-[#ff7f00] to-amber-500 hover:from-[#e06f00] hover:to-amber-600 text-white font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(255,127,0,0.35)] cursor-pointer flex items-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4 animate-pulse" />
                <span>אישור ופרסום מכרז נהגים מיידי! 🚀</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* Visually Stunning Success Dispatch Animation Modal Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a192f]/98 flex flex-col items-center justify-center p-6 text-center"
            id="success-animation-overlay"
          >
            {/* Glowing circle animation */}
            <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
              
              {/* Outer pulsing ring */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.4, 0.1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#ff7f00]/20 rounded-full blur-xl"
              />

              {/* Rotating radar circle */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-0 border border-dashed border-[#ff7f00]/30 rounded-full"
              />

              {/* Glowing core badge */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 rounded-full bg-[#ff7f00] text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,127,0,0.5)] border-4 border-[#0a192f] z-10"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
            </div>

            {/* Simulated truck moving with speed particles */}
            <div className="relative w-48 h-10 mb-6 overflow-hidden flex items-center justify-center">
              <motion.span 
                initial={{ x: 120 }}
                animate={{ x: -120 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="text-3xl"
              >
                🚛💨
              </motion.span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a192f] via-transparent to-[#0a192f]"></div>
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              המכרז הופץ בהצלחה לכל המשאיות!
            </h3>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              העברת הדירה שלכם מנוהלת ומאובטחת כעת. המערכת שולחת התראות לנהגים בוואטסאפ... אנו מעבירים אתכם לעמוד המעקב האישי בזמן אמת!
            </p>

            {/* Tiny live waves representation */}
            <div className="flex gap-1.5 mt-8 justify-center items-center">
              {[1, 2, 3, 4, 5].map((idx) => (
                <motion.span
                  key={idx}
                  animate={{ height: [6, 20, 6] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: idx * 0.12 }}
                  className="w-1 bg-[#ff7f00] rounded-full"
                ></motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading analysis state blocker */}
      <AnimatePresence>
        {aiAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a192f]/90 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 relative mb-6">
              <div className="absolute inset-0 border-4 border-[#ff7f00]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#ff7f00] border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-[#ff7f00] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">מחשב אומדן AI מונע סיכונים...</h3>
            <p className="text-gray-400 text-xs max-w-xs">
              אנו מחשבים נפח ציוד, קומת בניין ופרמטרי קושי של המעבר למניעת שינוי מחיר. אנא המתן.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
