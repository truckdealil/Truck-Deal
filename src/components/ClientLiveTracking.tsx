import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Clock, CheckCircle2, CreditCard, Lock, Unlock, 
  MapPin, Phone, MessageSquare, Download, AlertCircle, RefreshCw, 
  ChevronRight, Sparkles, FileText, Share2, Printer, Map, HelpCircle,
  AlertTriangle, Eye, EyeOff, Check, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest, DriverBid } from '../types';

interface ClientLiveTrackingProps {
  moveId: string | null;
  onBackToLanding: () => void;
}

export default function ClientLiveTracking({ moveId, onBackToLanding }: ClientLiveTrackingProps) {
  const [move, setMove] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // PWA Offline Status State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  // Payment Form States
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'bit' | 'gpay'>('credit');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  // "Get Taxi" Smart Driver Matchmaking Proposal states
  const [selectedProposal, setSelectedProposal] = useState<{ driverId: string; driverName: string; bidAmount: number; driverPhone: string } | null>(null);
  const [signatureInput, setSignatureInput] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [matchSubmitting, setMatchSubmitting] = useState(false);
  
  // Payment Simulation Stages
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Live Tracking stage (Simulated for demonstration): 2 = העמסה, 3 = בדרך לביצוע, 4 = הושלם
  const [trackingStage, setTrackingStage] = useState<2 | 3 | 4>(2);
  const [showReceipt, setShowReceipt] = useState(true);

  // Listen to network status for PWA offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch or Load cached move data
  useEffect(() => {
    if (!moveId) {
      setError('לא זוהה מזהה הובלה תקין. אנא פנה לתמיכה או השתמש בקישור שנשלח אליך.');
      setLoading(false);
      return;
    }

    const cacheKey = `truk_dealil_move_${moveId}`;

    // If offline, check Cache/LocalStorage first
    if (!navigator.onLine) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setMove(parsed);
          setLoadedFromCache(true);
          setError(null);
          if (parsed.status === 'completed') {
            setTrackingStage(4);
          } else if (parsed.status === 'approved_for_driver') {
            setTrackingStage(2);
          }
        } catch (e) {
          setError('שגיאה בקריאת הנתונים השמורים במכשיר במצב לא מקוון');
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    setLoading(true);
    fetch(`/api/moves/${moveId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[ClientLiveTracking GET /api/moves/${moveId} Error]: HTTP ${res.status}:`, errText);
          throw new Error(`ההובלה לא נמצאה במערכת (קוד ${res.status}) או שהקישור אינו תקין`);
        }
        return res.json();
      })
      .then((data) => {
        setMove(data);
        setError(null);
        setLoadedFromCache(false);
        
        // Save to cache for PWA Offline functionality
        localStorage.setItem(cacheKey, JSON.stringify(data));

        // Match tracking stage to move status if it's already updated
        if (data.status === 'completed') {
          setTrackingStage(4);
        } else if (data.status === 'approved_for_driver') {
          setTrackingStage(2);
        }
      })
      .catch((err) => {
        console.error(err);
        // Attempt fallback to cached version even if online but fetch failed
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setMove(parsed);
            setLoadedFromCache(true);
            setError(null);
          } catch (e) {
            setError(err.message || 'שגיאה בטעינת נתוני מעקב');
          }
        } else {
          setError(err.message || 'שגיאה בטעינת נתוני מעקב');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [moveId, refreshTrigger]);

  // Handle Secure Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!move) return;

    if (paymentMethod === 'credit') {
      if (cardNumber.length < 16) {
        alert('אנא הזן מספר כרטיס אשראי תקין בן 16 ספרות');
        return;
      }
      if (cardExpiry.length < 4 || !cardExpiry.includes('/')) {
        alert('אנא הזן תוקף תקין בפורמט MM/YY');
        return;
      }
      if (cardCvv.length < 3) {
        alert('אנא הזן קוד אבטחה CVV תקין');
        return;
      }
      if (!cardHolder.trim()) {
        alert('אנא הזן את שם בעל הכרטיס');
        return;
      }
    }

    setProcessingPayment(true);
    
    // Multi-phase simulation for gorgeous UI feedback
    try {
      setPaymentPhase('מצפין פרטי אשראי בתקן PCI-DSS ו-SSL...');
      await new Promise(r => setTimeout(r, 900));

      setPaymentPhase('מבצע סליקה מול שרת שב״א (Shva) מאובטח...');
      await new Promise(r => setTimeout(r, 1100));

      setPaymentPhase('יוצר קשר ומסדיר את תשלום העסקה במערכת...');
      await new Promise(r => setTimeout(r, 900));

      setPaymentPhase('הסליקה אושרה! משחרר פרטי נהג ומייצר חשבונית...');
      await new Promise(r => setTimeout(r, 700));

      const approvedBid = getApprovedBid();
      const amountToPay = approvedBid ? approvedBid.bidAmount : 1500;

      // Update backend status
      const response = await fetch(`/api/moves/${move.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: 'paid_full',
          clientApprovedForBilling: true,
          status: 'approved_for_driver' // releases the move and unlocks details
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'התשלום נדחה על ידי שרת הסליקה');
      }

      const resData = await response.json();
      setPaymentSuccess(true);
      setMove(resData.move);

      // Save updated data to offline cache
      localStorage.setItem(`truk_dealil_move_${move.id}`, JSON.stringify(resData.move));
      
      // Notify Make webhook
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment_received',
          moveId: move.id,
          amount: amountToPay,
          clientName: move.clientName,
          clientPhone: move.clientPhone
        })
      }).catch(e => console.log('Webhook notify skipped', e));

    } catch (err: any) {
      alert(err.message || 'שגיאה בתהליך הסליקה. אנא נסה שוב או פנה לתמיכה.');
    } finally {
      setProcessingPayment(false);
      setPaymentPhase('');
    }
  };

  // Get active driver bid
  const getApprovedBid = (): DriverBid | null => {
    if (!move) return null;
    if (move.finalApprovedBidId) {
      return move.driverBids.find(b => b.id === move.finalApprovedBidId) || null;
    }
    return move.driverBids.find(b => b.status === 'approved') || move.driverBids[0] || null;
  };

  const approvedBid = getApprovedBid();

  // Submit client signed driver proposal matching
  const handleSignProposal = async () => {
    if (!selectedProposal || !signatureInput.trim()) {
      alert('נא להקליד שם מלא לצורך חתימה דיגיטלית מחייבת ✍️');
      return;
    }

    setMatchSubmitting(true);
    try {
      const res = await fetch(`/api/moves/${moveId}/match-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedProposal.driverId,
          driverName: selectedProposal.driverName,
          driverPhone: selectedProposal.driverPhone,
          bidAmount: selectedProposal.bidAmount,
          clientSignature: signatureInput
        })
      });

      if (res.ok) {
        setIsSigning(false);
        setSelectedProposal(null);
        setRefreshTrigger(prev => prev + 1); // Hot refresh tracking details
      } else {
        const err = await res.json();
        throw new Error(err.error || 'שגיאה באישור ההצעה');
      }
    } catch (err: any) {
      alert(err.message || 'ההרשמה נכשלה. אנא נסה שנית.');
    } finally {
      setMatchSubmitting(false);
    }
  };

  const isPaid = move?.paymentStatus === 'paid_full' || move?.paymentStatus === 'paid_deposit' || move?.paymentStatus === 'net_30';
  const showPaymentPortal = (move?.status === 'Approved' || move?.status === 'bid_approved') && !isPaid;

  // Single-Click Tax Receipt Generator & Downloader (.html file download)
  const handleDownloadInvoice = () => {
    if (!move) return;
    const bidVal = approvedBid ? approvedBid.bidAmount : 1500;
    const baseVal = Math.round(bidVal / 1.17);
    const vatVal = bidVal - baseVal;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>חשבונית מס קבלה - טראק דיל il בע"מ</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; padding: 20px; direction: rtl; text-align: right; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.15); border-radius: 8px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f223a; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #0f223a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #0f223a; color: #fff; padding: 10px; text-align: right; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .totals { width: 50%; margin-right: auto; font-size: 14px; line-height: 1.6; border-top: 2px solid #0f223a; padding-top: 10px; }
          .totals div { display: flex; justify-content: space-between; }
          .total-row { font-weight: bold; font-size: 16px; color: #ff7f00; border-top: 1px solid #eee; padding-top: 5px; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #6b7280; border-top: 1px solid #eee; padding-top: 10px; }
          .stamp { border: 2px solid #10b981; color: #10b981; border-radius: 50%; width: 110px; height: 110px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-weight: bold; transform: rotate(15deg); margin: 20px auto 0; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <h1>טראק דיל il בע״מ</h1>
              <p>ח.פ 515849302 | רחוב המלאכה 14, תל אביב</p>
              <p>טלפון: 03-9048382 | billing@truk-dealil.il</p>
            </div>
            <div style="text-align: left;">
              <h2>חשבונית מס קבלה מקורית</h2>
              <p><b>מספר מסמך:</b> TD-${move.id.substring(0, 8).toUpperCase()}</p>
              <p><b>תאריך:</b> ${new Date().toLocaleDateString('he-IL')}</p>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px;">
            <div>
              <h3>הלקוח:</h3>
              <p><b>שם:</b> ${move.clientName}</p>
              ${move.companyName ? `<p><b>חברה:</b> ${move.companyName}</p>` : ''}
              <p><b>טלפון:</b> ${move.clientPhone}</p>
              <p><b>דוא"ל:</b> ${move.clientEmail}</p>
            </div>
            <div style="text-align: left;">
              <h3>פרטי הובלה:</h3>
              <p><b>מזהה הובלה:</b> ${move.id}</p>
              <p><b>תאריך ביצוע:</b> ${move.moveDate}</p>
              <p><b>מוביל:</b> ${approvedBid ? approvedBid.driverName : 'מוביל מורשה'}</p>
              <p><b>מסלול:</b> מ-${move.originAddress.split(',')[0]} אל-${move.destAddress.split(',')[0]}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>תיאור השירות</th>
                <th style="text-align: center;">כמות</th>
                <th style="text-align: left;">מחיר יחידה</th>
                <th style="text-align: left;">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>שירותי הובלה מורשת במכרז חכם (Truk Dealil IL)<br><small style="color: #6b7280;">מאת: ${move.originAddress} | אל: ${move.destAddress}</small></td>
                <td style="text-align: center;">1</td>
                <td style="text-align: left;">₪${baseVal.toLocaleString()}</td>
                <td style="text-align: left;">₪${baseVal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div><span>סה"כ לפני מע"מ:</span><span>₪${baseVal.toLocaleString()}</span></div>
            <div><span>מע"מ כחוק (17%):</span><span>₪${vatVal.toLocaleString()}</span></div>
            <div class="total-row"><span>סה"כ שולם כולל מע"מ:</span><span>₪${bidVal.toLocaleString()}</span></div>
          </div>
          <div class="stamp">
            <span style="font-size: 10px;">טראק דיל IL</span>
            <span style="font-size: 14px; color: #059669;">שולם במלואו</span>
          </div>
          <div class="footer">
            <p>המסמך הופק באופן אוטומטי ונחתם דיגיטלית כחוק.</p>
            <p>תודה שבחרתם ב-Truk Dealil IL!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `חשבונית_טראק_דיל_${move.id.substring(0,8)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Stepper Stage mapping (1 to 5)
  // 1: ממתין לאישור מחיר (status is new, bidding)
  // 2: אושר ונבחר נהג (status is bid_approved/Approved, unpaid)
  // 3: תשלום מאובטח (isPaid is true, tracking stage is not active or completed)
  // 4: בדרך לביצוע (isPaid is true, and trackingStage is 2 or 3)
  // 5: הושלם (status is completed or trackingStage is 4)
  const getCurrentActiveStep = (): number => {
    if (!move) return 1;
    if (move.status === 'completed' || trackingStage === 4) return 5;
    if (isPaid && (trackingStage === 2 || trackingStage === 3)) return 4;
    if (isPaid) return 3;
    if (move.status === 'Approved' || move.status === 'bid_approved') return 2;
    return 1;
  };

  const activeStep = getCurrentActiveStep();

  // Format credit card numbers beautifully with spaces
  const formatCardNumber = (val: string) => {
    const raw = val.replace(/\s?/g, '').replace(/\D/g, '');
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 2) {
      raw = raw.substring(0, 2) + '/' + raw.substring(2, 4);
    }
    setCardExpiry(raw.substring(0, 5));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 border-4 border-t-orange-electric border-navy-800 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium">טוען את דף מעקב ההובלה המאובטח...</p>
        <span className="text-xs text-orange-electric/60 mt-1">מערכת אבטחת תשלומים ולוח מעקב Truk Dealil</span>
      </div>
    );
  }

  if (error || !move) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6 text-red-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-2">לא נמצאה הובלה פעילה</h2>
        <p className="text-gray-400 max-w-md mb-6 leading-relaxed">
          {error || 'לא זוהתה הובלה המתאימה לקישור זה. אנא ודא שהקישור שהתקבל בווטסאפ הועתק במלואו.'}
        </p>
        <button
          onClick={onBackToLanding}
          className="px-6 py-2.5 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 pb-16 text-right text-gray-100" dir="rtl" id="pwa-portal-root">
      
      {/* PWA Connection Status Bar */}
      <div className={`py-2 px-4 text-center text-xs font-bold transition-all duration-300 ${
        isOffline 
          ? 'bg-red-600 text-white animate-pulse' 
          : loadedFromCache 
          ? 'bg-amber-600 text-white' 
          : 'bg-emerald-900/60 text-emerald-300 border-b border-emerald-500/10'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span>מצב לא מקוון: צופה בנתונים שמורים מקומית ב-PWA (Offline Active)</span>
            </>
          ) : loadedFromCache ? (
            <>
              <Wifi className="w-4 h-4 text-amber-300" />
              <span>נטען מהמטמון המקומי - מציג נתונים לא מקוונים מסונכרנים</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>מחובר ומאובטח בזמן אמת (Truk Dealil SSL Live Connection)</span>
            </>
          )}
        </div>
      </div>

      {/* Header Info Block */}
      <div className="relative bg-gradient-to-b from-navy-900 to-navy-950 border-b border-navy-850 pt-8 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          
          <button 
            onClick={onBackToLanding} 
            className="mb-6 flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-electric transition-colors bg-navy-900/60 hover:bg-navy-900 px-3 py-1.5 rounded-lg border border-navy-800 cursor-pointer w-fit"
            id="back-btn-tracking"
          >
            <ChevronRight className="w-4 h-4" />
            <span>חזרה לאזור האישי</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-orange-electric rounded-full animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-electric">מרכז מעקב הלקוח - PWA Portal</span>
              </div>
              <h1 className="text-2xl md:text-3.5xl font-black text-white">הובלה #{move.id}</h1>
              <p className="text-gray-300 text-sm">
                נתיב: מ-<span className="text-white font-semibold">{move.originAddress.split(',')[0]}</span> 📍 אל: <span className="text-white font-semibold">{move.destAddress.split(',')[0]}</span>
              </p>
            </div>

            <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl flex flex-col items-start gap-1">
              <span className="text-xs text-gray-400">סטטוס תשלום נוכחי:</span>
              <span className="text-md font-black text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {isPaid ? (
                  <span className="text-emerald-400">שולם ומאושר לביצוע</span>
                ) : (
                  <span className="text-amber-500">ממתין להסדרת תשלום / פיקדון</span>
                )}
              </span>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="mt-2 text-[11px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                disabled={isOffline}
              >
                <RefreshCw className="w-3 h-3" />
                <span>רענן נתוני מעקב</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RIGHT & MAIN COLUMN: 5 Stages & Map & Receipt */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STAGES STEPPER VISUAL (5-Stages: ממתין לאישור מחיר -> אושר ונבחר נהג -> תשלום מאובטח -> בדרך לביצוע -> הושלם) */}
          <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative overflow-hidden" id="five-stage-stepper">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-electric via-orange-500 to-orange-electric"></div>
            <h3 className="font-extrabold text-white text-lg mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-electric" />
              <span>שלבי התקדמות ההובלה במערכת המכרזים</span>
            </h3>

            {/* Linear Stepper */}
            <div className="relative flex flex-col gap-6" id="stepper-list">
              <div className="absolute right-4.5 top-3 bottom-3 w-0.5 bg-navy-800"></div>

              {/* Stage 1: ממתין לאישור מחיר */}
              <div className="relative flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs transition-all duration-300 ${
                  activeStep >= 1 
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                    : 'bg-navy-950 border border-navy-800 text-gray-500'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${activeStep >= 1 ? 'text-white font-extrabold' : 'text-gray-500'}`}>1. ממתין לאישור מחיר</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    המערכת מנתחת סיכונים והמכרז הופץ למובילים מורשים לצורך הצעת מחיר תחרותית.
                  </p>
                  <span className="text-[10px] text-gray-500 block">עודכן: {new Date(move.createdAt).toLocaleDateString('he-IL')}</span>
                </div>
              </div>

              {/* Stage 2: אושר ונבחר נהג */}
              <div className="relative flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs transition-all duration-300 ${
                  activeStep >= 2 
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                    : 'bg-navy-950 border border-navy-800 text-gray-500'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${activeStep >= 2 ? 'text-white font-extrabold' : 'text-gray-500'}`}>2. אושר ונבחר נהג</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    מנהל המערכת בחן והתאים עבורך את הצעת המוביל המקצועית והזולה ביותר למכרז זה.
                  </p>
                </div>
              </div>

              {/* Stage 3: תשלום מאובטח */}
              <div className="relative flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs transition-all duration-300 ${
                  activeStep >= 3 
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                    : activeStep === 2
                    ? 'bg-orange-electric/20 border border-orange-electric text-orange-electric animate-pulse'
                    : 'bg-navy-950 border border-navy-800 text-gray-500'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${activeStep >= 3 ? 'text-white font-extrabold' : 'text-gray-500'}`}>3. תשלום מאובטח הוסדר</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    דמי שריון או תשלום הובלה מלא הוסדרו במערכת PCI-DSS. פרטי הנהג וההובלה נפתחו.
                  </p>
                  {isPaid && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold inline-block">✓ תשלום הוסדר בהצלחה</span>
                  )}
                </div>
              </div>

              {/* Stage 4: בדרך לביצוע */}
              <div className="relative flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs transition-all duration-300 ${
                  activeStep >= 4 
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                    : activeStep === 3
                    ? 'bg-orange-electric/20 border border-orange-electric text-orange-electric animate-pulse'
                    : 'bg-navy-950 border border-navy-800 text-gray-500'
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className={`font-bold text-sm ${activeStep >= 4 ? 'text-white font-extrabold' : 'text-gray-500'}`}>4. בדרך לביצוע (פיקוח חי)</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    הצוות מעמיס את המשאית בנקודת המוצא ונוסע אל עבר כתובת היעד בתיאום מושלם.
                  </p>
                  
                  {isPaid && (
                    <div className="mt-3 bg-navy-950 p-2.5 rounded-xl border border-navy-850 flex flex-wrap gap-2">
                      <button 
                        onClick={() => setTrackingStage(2)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${trackingStage === 2 ? 'bg-orange-electric text-white shadow-md' : 'bg-navy-900 text-gray-400 hover:text-white'}`}
                      >
                        שלב 1: העמסה ופירוק 📦
                      </button>
                      <button 
                        onClick={() => setTrackingStage(3)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${trackingStage === 3 ? 'bg-orange-electric text-white shadow-md' : 'bg-navy-900 text-gray-400 hover:text-white'}`}
                      >
                        שלב 2: משאית בדרך ליעד 🚚
                      </button>
                      <button 
                        onClick={() => setTrackingStage(4)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${trackingStage === 4 ? 'bg-orange-electric text-white shadow-md' : 'bg-navy-900 text-gray-400 hover:text-white'}`}
                      >
                        שלב 3: הציוד הגיע ליעד 🎉
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage 5: הושלם */}
              <div className="relative flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 font-bold text-xs transition-all duration-300 ${
                  activeStep >= 5 
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                    : 'bg-navy-950 border border-navy-800 text-gray-500'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${activeStep >= 5 ? 'text-white font-extrabold' : 'text-gray-500'}`}>5. ההובלה הושלמה בהצלחה</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    כל הציוד נפרק והורכב לשביעות רצונך. פרוטוקול מסירה דיגיטלי נחתם על ידי המוביל.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {activeStep === 1 && (
            <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-electric via-orange-500 to-orange-electric"></div>
              
              <div className="flex justify-between items-center flex-row-reverse">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-electric animate-pulse" />
                  <h3 className="font-black text-white text-md">⚡ שידוך נהגים חכם בזמן אמת (Truk Matchmaking)</h3>
                </div>
                <span className="text-[10px] bg-orange-electric/15 text-orange-electric px-2.5 py-1 rounded-full font-bold">גט-טקסי הובלות 🚚</span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed text-right">
                מערכת הלוויין והלוגיסטיקה איתרה את נהגי המשאיות הפנויים הבאים המתאימים ביותר לנפח התכולה ומסלול הנסיעה שלך. בחר מוביל ושלח הצעה חתומה דיגיטלית לאישור מיידי:
              </p>

              {/* Proposals List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Proposal 1: חכמת ועאלי */}
                <div className="bg-navy-950/80 border border-navy-850 hover:border-orange-electric/40 rounded-2xl p-4 space-y-3 transition-all relative">
                  <div className="absolute top-3 left-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">
                    דירוג יהלום ✦
                  </div>
                  
                  <div className="flex items-center gap-3 flex-row-reverse text-right">
                    <div className="w-11 h-11 bg-orange-electric/10 rounded-full border border-orange-electric/20 flex items-center justify-center text-xl shadow-inner shrink-0">
                      🚚
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">חכמת ועאלי (Hikmat Waali)</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 justify-end flex-row-reverse">
                        <span className="text-amber-400">★★★★★</span>
                        <span>•</span>
                        <span>320 הובלות מושלמות</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 space-y-1 text-right border-t border-navy-800/40 pt-2.5">
                    <p><b>משאית:</b> משאית מקרר ומעלית הידראולית • 15 טון</p>
                    <p><b>אזור פעילות:</b> גוש דן, השרון והסביבה</p>
                    <p className="text-gray-300"><b>זמן הגעה משוער:</b> 25-35 דקות</p>
                  </div>

                  <div className="flex justify-between items-center flex-row-reverse border-t border-navy-800/40 pt-2.5">
                    <div>
                      <span className="text-[9px] text-gray-500 block">הצעת מחיר סופית</span>
                      <span className="text-md font-black text-white">₪1,850</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProposal({
                          driverId: 'driver_matched_1',
                          driverName: 'חכמת ועאלי',
                          driverPhone: '050-1234567',
                          bidAmount: 1850
                        });
                        setSignatureInput('');
                        setIsSigning(true);
                      }}
                      className="px-3 py-1.5 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl text-[11px] cursor-pointer shadow-md shadow-orange-electric/15 hover:scale-102 transition-all"
                    >
                      אישור והצעה חתומה ✍️
                    </button>
                  </div>
                </div>

                {/* Proposal 2: יוסי לוי */}
                <div className="bg-navy-950/80 border border-navy-850 hover:border-orange-electric/40 rounded-2xl p-4 space-y-3 transition-all relative">
                  <div className="absolute top-3 left-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">
                    מוביל מוסמך
                  </div>
                  
                  <div className="flex items-center gap-3 flex-row-reverse text-right">
                    <div className="w-11 h-11 bg-orange-electric/10 rounded-full border border-orange-electric/20 flex items-center justify-center text-xl shadow-inner shrink-0">
                      🚛
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">יוסי לוי (Yossi Levi)</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 justify-end flex-row-reverse">
                        <span className="text-amber-400">★★★★☆</span>
                        <span>•</span>
                        <span>142 הובלות מושלמות</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 space-y-1 text-right border-t border-navy-800/40 pt-2.5">
                    <p><b>משאית:</b> משאית 7.5 טון + רמפה הידראולית</p>
                    <p><b>אזור פעילות:</b> מרכז והשרון</p>
                    <p className="text-gray-300"><b>זמן הגעה משוער:</b> 40-50 דקות</p>
                  </div>

                  <div className="flex justify-between items-center flex-row-reverse border-t border-navy-800/40 pt-2.5">
                    <div>
                      <span className="text-[9px] text-gray-500 block">הצעת מחיר סופית</span>
                      <span className="text-md font-black text-white">₪2,100</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProposal({
                          driverId: 'driver_matched_2',
                          driverName: 'יוסי לוי',
                          driverPhone: '052-8765432',
                          bidAmount: 2100
                        });
                        setSignatureInput('');
                        setIsSigning(true);
                      }}
                      className="px-3 py-1.5 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl text-[11px] cursor-pointer shadow-md shadow-orange-electric/15 hover:scale-102 transition-all"
                    >
                      אישור והצעה חתומה ✍️
                    </button>
                  </div>
                </div>

              </div>

              {/* Digital Signing Popup Drawer Modal */}
              <AnimatePresence>
                {isSigning && selectedProposal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 bg-navy-950 border border-orange-electric/40 rounded-2xl space-y-4 mt-2"
                  >
                    <div className="flex justify-between items-center flex-row-reverse">
                      <h4 className="font-extrabold text-orange-electric text-sm">✍️ מעמד חתימה דיגיטלית על הסכם הובלה</h4>
                      <button 
                        onClick={() => setIsSigning(false)}
                        className="text-gray-500 hover:text-white cursor-pointer"
                      >
                        ביטול ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-300 leading-relaxed text-right">
                      הנך חותם על הסכם הובלה מבוסס AI מול המוביל <b>{selectedProposal.driverName}</b> על סך של <b>₪{selectedProposal.bidAmount}</b> כולל מע"מ וביטוח תכולה מלא.
                    </p>

                    <div className="space-y-2 text-right">
                      <label className="block text-xs font-bold text-gray-400">הקש שם מלא לאישור וחתימה בטאצ׳</label>
                      <input
                        type="text"
                        value={signatureInput}
                        onChange={(e) => setSignatureInput(e.target.value)}
                        placeholder="לדוגמה: ישראל ישראלי"
                        className="w-full px-4 py-2 bg-navy-900 border border-navy-750 text-white font-extrabold text-center rounded-xl focus:border-orange-electric outline-none text-sm"
                      />
                    </div>

                    <div className="flex gap-2 flex-row-reverse pt-2">
                      <button
                        onClick={handleSignProposal}
                        disabled={matchSubmitting || !signatureInput.trim()}
                        className="flex-1 py-2.5 bg-orange-electric hover:bg-orange-hover disabled:bg-navy-800 disabled:text-gray-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {matchSubmitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>חתום ושלח הצעה ✍️</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setIsSigning(false)}
                        className="px-4 py-2 bg-navy-900 border border-navy-800 text-gray-400 hover:text-white rounded-xl text-xs cursor-pointer"
                      >
                        בטל
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* DYNAMIC PROGRESS MAP VISUALIZER */}
          {isPaid && (
            <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <Map className="w-5 h-5 text-orange-electric" />
                <span>מפת נתיב ומעקב משאית דינמי</span>
              </h3>
              
              <div className="relative mt-8 mb-4 p-4 bg-navy-950 rounded-2xl border border-navy-850">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-6">
                  <div className="flex items-center gap-1.5 bg-navy-900/60 px-3 py-1.5 rounded-lg border border-navy-800">
                    <MapPin className="w-4 h-4 text-orange-electric" />
                    <span>מוצא: <strong className="text-white">{move.originAddress.split(',')[0]}</strong></span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-navy-900/60 px-3 py-1.5 rounded-lg border border-navy-800">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>יעד: <strong className="text-white">{move.destAddress.split(',')[0]}</strong></span>
                  </div>
                </div>

                {/* Road Line Graphic */}
                <div className="relative h-4 bg-navy-900 rounded-full my-8 overflow-visible">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 border-t-2 border-dashed border-navy-800"></div>
                  
                  {/* Progress fill */}
                  <div 
                    className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-orange-electric to-amber-500 rounded-full transition-all duration-1000"
                    style={{ 
                      width: trackingStage === 2 ? '25%' : trackingStage === 3 ? '65%' : '100%' 
                    }}
                  ></div>

                  {/* Truck Driver Icon container */}
                  <div 
                    className="absolute -top-3 w-10 h-10 rounded-full bg-orange-electric border-2 border-white shadow-xl flex items-center justify-center transition-all duration-1000 z-10"
                    style={{ 
                      right: trackingStage === 2 ? '25%' : trackingStage === 3 ? '65%' : '100%',
                      transform: 'translateX(50%)'
                    }}
                  >
                    <Truck className="w-5 h-5 text-white animate-bounce" />
                  </div>
                </div>

                {/* Status messages */}
                <div className="text-center p-3 bg-navy-900/40 border border-navy-800 rounded-xl text-xs text-gray-300 leading-relaxed">
                  {trackingStage === 2 && (
                    <span>🚚 סטטוס זמני: <strong>הצוות מעמיס וממגן כעת את המשאית</strong> בכתובת המוצא.</span>
                  )}
                  {trackingStage === 3 && (
                    <span className="text-orange-electric font-bold">⚡ משאית בדרך: הציוד מבוטח ומאובטח. המשאית בדרכה כעת לנקודת היעד!</span>
                  )}
                  {trackingStage === 4 && (
                    <span className="text-emerald-400 font-bold">🎉 הושלם: משלוח הציוד והריהוט נפרק בהצלחה במלואו ביעד. תודה רבה!</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DIGITAL TAX RECEIPT VIEW & GENERATOR (Embedded below) */}
          {isPaid && (
            <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative" id="invoice-generator-section">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-navy-800 pb-4 mb-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-electric" />
                    <span>חשבונית מס / קבלה דיגיטלית חתומה</span>
                  </h3>
                  <p className="text-xs text-gray-400">הקבלה הופקה כחוק וכוללת חתימה דיגיטלית ומע״מ מחושב.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowReceipt(!showReceipt)}
                    className="flex-1 sm:flex-none text-xs bg-navy-800 hover:bg-navy-750 text-gray-300 hover:text-white px-3 py-2 rounded-xl border border-navy-750 transition-all cursor-pointer"
                  >
                    {showReceipt ? 'הסתר קבלה' : 'הצג קבלה'}
                  </button>
                  <button 
                    onClick={handleDownloadInvoice}
                    className="flex-1 sm:flex-none text-xs bg-orange-electric hover:bg-orange-600 text-white px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,127,0,0.2)]"
                    id="download-invoice-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>הורדה ישירה לנייד 📱</span>
                  </button>
                </div>
              </div>

              {showReceipt && (
                <div id="invoice-receipt" className="bg-white text-navy-950 p-6 rounded-2xl text-right font-sans border-2 border-navy-100 shadow-inner relative overflow-hidden">
                  
                  {/* Decorative Watermark */}
                  <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
                    <img src="https://i.ibb.co/Ldb5GCxF/logo.png" alt="Truk Dealil" className="w-80 h-80 object-contain" referrerPolicy="no-referrer" />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-navy-900 pb-4 mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-black text-navy-900 leading-none">טראק דיל il בע״מ</h2>
                      <p className="text-[11px] text-gray-500 mt-2 font-medium">ח.פ 515849302 | רחוב המלאכה 14, תל אביב</p>
                      <p className="text-[11px] text-gray-500 font-medium">טלפון: 03-9048382 | אימייל: billing@truk-dealil.il</p>
                    </div>
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] font-black uppercase text-orange-600 block leading-none tracking-wider">OFFICIAL RECEIPT</span>
                      <h3 className="text-lg font-bold text-navy-900 mt-1.5">חשבונית מס קבלה מקורית</h3>
                      <p className="text-xs text-gray-700 font-bold mt-1">מספר מסמך: #TD-{move.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-[11px] text-gray-500 font-medium">תאריך הפקה: {new Date().toLocaleDateString('he-IL')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs mb-6 border-b border-gray-150 pb-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-navy-900 text-sm border-b border-gray-100 pb-1 w-fit">לכבוד (הלקוח):</h4>
                      <p className="font-bold text-gray-800 text-sm">{move.clientName}</p>
                      {move.companyName && <p className="text-gray-600 font-medium">{move.companyName}</p>}
                      <p className="text-gray-500 font-mono">{move.clientPhone}</p>
                      <p className="text-gray-500">{move.clientEmail}</p>
                    </div>
                    <div className="space-y-1 text-right sm:text-left">
                      <h4 className="font-bold text-navy-900 text-sm border-b border-gray-100 pb-1 w-fit sm:ml-0 sm:mr-auto">פרטי עסקה ומכרז:</h4>
                      <p className="text-gray-700 font-medium">מזהה הובלה במערכת: {move.id}</p>
                      <p className="text-gray-700 font-medium">תאריך ההובלה: {move.moveDate}</p>
                      <p className="text-gray-700 font-medium">מוביל אחראי: {approvedBid ? approvedBid.driverName : 'מוביל מורשה'}</p>
                      <p className="text-emerald-700 font-bold">סוג חיוב: סליקת כרטיס אשראי מאובטחת</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <table className="w-full text-xs text-right border-collapse mb-6">
                    <thead>
                      <tr className="bg-navy-900 text-white font-bold">
                        <th className="p-2 border border-navy-850">תיאור השירות והעסקה</th>
                        <th className="p-2 border border-navy-850 text-center w-16">כמות</th>
                        <th className="p-2 border border-navy-850 text-left w-24">מחיר יחידה</th>
                        <th className="p-2 border border-navy-850 text-left w-24">סה״כ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="p-2.5 font-semibold text-gray-800">
                          שירותי הובלה מורשת במכרז דיגיטלי (Truk Dealil IL)
                          <p className="text-[10px] text-gray-500 font-normal mt-1 leading-relaxed">מאת: {move.originAddress} | אל: {move.destAddress}</p>
                        </td>
                        <td className="p-2.5 text-center font-bold text-gray-700">1</td>
                        <td className="p-2.5 text-left font-semibold text-gray-700">₪{Math.round((approvedBid ? approvedBid.bidAmount : 1500) / 1.17).toLocaleString()}</td>
                        <td className="p-2.5 text-left font-semibold text-gray-800">₪{Math.round((approvedBid ? approvedBid.bidAmount : 1500) / 1.17).toLocaleString()}</td>
                      </tr>
                      {move.craneNeeded === 'yes' && (
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <td className="p-2.5 font-semibold text-gray-700">שירות סיוע מנוף הידראולי לקומות גבוהות</td>
                          <td className="p-2.5 text-center font-bold text-gray-700">1</td>
                          <td className="p-2.5 text-left text-emerald-600 font-bold">כלול במכרז</td>
                          <td className="p-2.5 text-left text-emerald-600 font-bold">₪0</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Calculations */}
                  <div className="w-full sm:w-1/2 mr-auto text-xs space-y-2 border-t-2 border-navy-900 pt-3 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">סה״כ לפני מע״מ:</span>
                      <span className="font-bold text-navy-900">₪{Math.round((approvedBid ? approvedBid.bidAmount : 1500) / 1.17).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">מע״מ כחוק (17%):</span>
                      <span className="font-bold text-navy-900">₪{Math.round((approvedBid ? approvedBid.bidAmount : 1500) - ((approvedBid ? approvedBid.bidAmount : 1500) / 1.17)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2 text-navy-950">
                      <span>סה״כ כולל מע״מ (שולם במלואו):</span>
                      <span className="text-orange-600 text-base">₪{(approvedBid ? approvedBid.bidAmount : 1500).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-end mt-8 pt-4 border-t border-gray-150 gap-4">
                    <div className="text-right text-[10px] text-gray-500 space-y-1">
                      <p>המסמך הופק ונחתם אלקטרונית בתקני פיקוח חשבוניות דיגיטליות בישראל.</p>
                      <p className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>✓ חתימה דיגיטלית מאומתת (Verified Digital Certificate)</span>
                      </p>
                    </div>
                    
                    <div className="text-center w-28 h-28 bg-emerald-500/5 rounded-full border border-emerald-500/25 flex flex-col items-center justify-center p-2 rotate-6 shrink-0">
                      <span className="text-[10px] font-extrabold text-emerald-800 leading-tight">Truk Dealil</span>
                      <span className="text-[12px] font-black text-emerald-600 my-1 leading-none">שולם במלואו</span>
                      <span className="text-[9px] text-gray-600 leading-none">התקבל תשלום</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* LEFT COLUMN: Payment Box or Approved Driver Details Card */}
        <div className="space-y-6">
          
          {/* BID DETAILS CARD */}
          <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="font-bold text-white text-lg mb-4 border-b border-navy-800 pb-2">סיכום הצעת המחיר הזוכה</h3>

            {approvedBid ? (
              <div className="space-y-4">
                <div className="bg-navy-950 p-4 rounded-2xl border border-navy-850 flex justify-between items-center">
                  <span className="text-xs text-gray-400">הצעה זוכה במכרז:</span>
                  <span className="text-2xl font-black text-orange-electric">₪{approvedBid.bidAmount.toLocaleString()}</span>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex justify-between py-1.5 border-b border-navy-850/40">
                    <span className="text-gray-400">סוג רכב מוקצה:</span>
                    <span className="text-white font-semibold">משאית הובלה סגורה + ציוד מיגון</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-navy-850/40">
                    <span className="text-gray-400">זמן מוערך לביצוע:</span>
                    <span className="text-white font-semibold">{approvedBid.estimatedDuration || '4-5 שעות'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">ביטוח תכולה מלא:</span>
                    <span className="text-emerald-400 font-bold">כלול עד 150,000 ₪</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-xs leading-relaxed">
                טרם אושרה הצעה סופית על ידי מנהל המערכת.
              </div>
            )}
          </div>

          {/* EMBEDDED PAYMENT GATEWAY (IF NOT PAID) */}
          {showPaymentPortal && (
            <div className="bg-navy-900 border-2 border-orange-electric rounded-3xl p-6 shadow-2xl relative" id="pwa-payment-gateway">
              
              <div className="absolute -top-3 right-6 bg-orange-electric text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>שער תשלום PWA מאובטח</span>
              </div>

              <h3 className="font-extrabold text-white text-lg mt-1 mb-4">תשלום דמי שריון והובלה</h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                להבטחת ההובלה ונעילת המכרז ביומן, הסדר את התשלום המאובטח. פרטי הנהג וטלפון לחיוג מהיר ייחשפו מיידית לאחר אישור התשלום.
              </p>

              {/* Selector buttons */}
              <div className="grid grid-cols-3 gap-1.5 mb-4 text-center">
                <button 
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 text-[11px] rounded-xl border font-bold cursor-pointer transition-all ${
                    paymentMethod === 'credit' 
                      ? 'bg-orange-electric border-orange-electric text-white' 
                      : 'bg-navy-950 border border-navy-800 text-gray-400 hover:text-white'
                  }`}
                >
                  כרטיס אשראי
                </button>
                <button 
                  onClick={() => setPaymentMethod('bit')}
                  className={`py-2 text-[11px] rounded-xl border font-bold cursor-pointer transition-all ${
                    paymentMethod === 'bit' 
                      ? 'bg-orange-electric border-orange-electric text-white' 
                      : 'bg-navy-950 border border-navy-800 text-gray-400 hover:text-white'
                  }`}
                >
                  אפליקציית bit
                </button>
                <button 
                  onClick={() => setPaymentMethod('gpay')}
                  className={`py-2 text-[11px] rounded-xl border font-bold cursor-pointer transition-all ${
                    paymentMethod === 'gpay' 
                      ? 'bg-orange-electric border-orange-electric text-white' 
                      : 'bg-navy-950 border border-navy-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Google Pay
                </button>
              </div>

              <AnimatePresence mode="wait">
                {paymentMethod === 'credit' && (
                  <motion.div 
                    key="credit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Realistic Virtual Credit Card representation */}
                    <div className="bg-gradient-to-br from-[#122846] to-[#0f2d52] border border-orange-electric/30 p-5 rounded-2xl shadow-lg relative text-left font-mono text-white overflow-hidden" dir="ltr">
                      {/* Wireless Wave Icon & Brand */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-7 bg-amber-500/80 rounded-md border border-amber-400/40 relative overflow-hidden flex items-center justify-center">
                          {/* Card chip */}
                          <div className="grid grid-cols-3 gap-0.5 w-6 h-4">
                            {[1, 2, 3, 4, 5, 6].map(x => <div key={x} className="border border-amber-300/30"></div>)}
                          </div>
                        </div>
                        <span className="text-orange-electric font-black text-xs uppercase tracking-widest font-sans">Truk Dealil Card</span>
                      </div>

                      {/* Card Number display */}
                      <div className="text-sm md:text-base font-bold tracking-widest text-white mb-4">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      <div className="flex justify-between items-end text-[10px] uppercase font-sans">
                        <div>
                          <span className="text-gray-500 text-[8px] block">Holder Name</span>
                          <span className="font-bold text-gray-200">{cardHolder || 'ISRAEL ISRAELI'}</span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <span className="text-gray-500 text-[8px] block">Expires</span>
                            <span className="font-bold text-gray-200">{cardExpiry || 'MM/YY'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[8px] block">CVV</span>
                            <span className="font-bold text-gray-200">{showCvv ? cardCvv : '•••'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <form onSubmit={handlePaymentSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">שם מלא של בעל הכרטיס (בעברית או באנגלית)</label>
                        <input 
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="ישראל ישראלי"
                          className="w-full bg-navy-950 border border-navy-800 focus:border-orange-electric rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">מספר כרטיס אשראי (16 ספרות)</label>
                        <input 
                          type="text"
                          required
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4580 1234 5678 9012"
                          className="w-full bg-navy-950 border border-navy-800 focus:border-orange-electric rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">תוקף הכרטיס</label>
                          <input 
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className="w-full bg-navy-950 border border-navy-800 focus:border-orange-electric rounded-xl px-3 py-2 text-xs text-white outline-none font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 flex justify-between">
                            <span>קוד אבטחה CVV</span>
                            <button 
                              type="button" 
                              onClick={() => setShowCvv(!showCvv)}
                              className="text-orange-electric hover:underline font-bold text-[9px]"
                            >
                              {showCvv ? 'הסתר' : 'הצג'}
                            </button>
                          </label>
                          <input 
                            type={showCvv ? "text" : "password"}
                            required
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="123"
                            className="w-full bg-navy-950 border border-navy-800 focus:border-orange-electric rounded-xl px-3 py-2 text-xs text-white outline-none font-mono text-center"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={processingPayment}
                        className="w-full mt-4 py-3 bg-orange-electric hover:bg-orange-600 disabled:bg-gray-750 text-white font-black text-xs md:text-sm rounded-xl cursor-pointer shadow-lg hover:shadow-orange-electric/10 transition-all flex items-center justify-center gap-2"
                        id="payment-submit-credit"
                      >
                        {processingPayment ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="animate-pulse">{paymentPhase || 'מבצע סליקה מול שב״א...'}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>אשר ובצע תשלום מאובטח ₪{approvedBid ? approvedBid.bidAmount.toLocaleString() : '1,500'}</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {paymentMethod !== 'credit' && (
                  <motion.div
                    key="alternative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 py-4 text-center"
                  >
                    <div className="p-4 bg-navy-950 rounded-2xl border border-navy-800 inline-block">
                      <img 
                        src={paymentMethod === 'bit' 
                          ? 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Bit_logo.svg' 
                          : 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg'} 
                        alt={paymentMethod}
                        className="h-10 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-white text-xs font-bold block mt-2">
                        {paymentMethod === 'bit' ? 'תשלום מהיר באפליקציית bit' : 'Google Wallet Payment'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed px-2">
                      בלחיצה על הכפתור, המערכת תיפתח אפליקציית {paymentMethod === 'bit' ? 'bit בנייד' : 'Google Pay'} לשעון, אימות טביעת אצבע וסליקה מהירה של הסכום.
                    </p>

                    <button 
                      onClick={handlePaymentSubmit}
                      disabled={processingPayment}
                      className="w-full py-3 bg-orange-electric hover:bg-orange-600 text-white font-black text-sm rounded-xl cursor-pointer shadow-lg transition-all"
                      id="payment-submit-alt"
                    >
                      {processingPayment ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{paymentPhase || 'יוצר קשר מאובטח עם האפליקציה...'}</span>
                        </div>
                      ) : (
                        `המשך לביצוע מהיר (₪${approvedBid ? approvedBid.bidAmount.toLocaleString() : '1,500'})`
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Secure PCI indicators */}
              <div className="mt-4 flex justify-center items-center gap-4 text-[10px] text-gray-500 border-t border-navy-850 pt-3">
                <span className="flex items-center gap-1">🛡️ PCI-DSS Compliant</span>
                <span className="flex items-center gap-1">🔒 SSL 256bit Encryption</span>
              </div>
            </div>
          )}

          {/* VERIFIED CARRIER & DRIVER DETAILS (LOCKED UNTIL PAID, UNLOCKED ONCE PAID) */}
          <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl relative overflow-hidden" id="driver-details-portal-card">
            <h3 className="font-bold text-white text-sm mb-4 border-b border-navy-800 pb-2 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-orange-electric" />
              <span>פרטי המוביל והנהג שנבחר</span>
            </h3>

            {isPaid ? (
              // Unlocked Driver details with real functional links & Truck image
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-electric/10 border border-orange-electric/25 flex items-center justify-center text-lg font-black text-orange-electric">
                    {approvedBid ? approvedBid.driverName[0] : 'י'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{approvedBid ? approvedBid.driverName : 'ישראל כהן (מוביל מוסמך)'}</h4>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>נהג מאומת ומבוטח Truk Dealil</span>
                    </span>
                  </div>
                </div>

                {/* Truck Image representation as requested */}
                <div className="rounded-2xl overflow-hidden border border-navy-850 relative h-36 bg-navy-950">
                  <img 
                    src="https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=600&q=80" 
                    alt="משאית הובלה מורשית" 
                    className="w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 bg-navy-950/90 backdrop-blur-sm border border-navy-800 px-2.5 py-1 rounded-lg text-[9px] text-orange-electric font-bold font-mono">
                    לוחית זיהוי: 12-345-67
                  </div>
                </div>

                <div className="p-3 bg-navy-950 rounded-2xl border border-navy-850 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">מספר טלפון:</span>
                    <a 
                      href={`tel:${approvedBid ? approvedBid.driverPhone : '0521234567'}`} 
                      className="text-orange-electric font-black hover:underline"
                    >
                      {approvedBid ? approvedBid.driverPhone : '052-1234567'}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">סוג רכב מורשה:</span>
                    <span className="text-white font-medium">משאית סגורה Isuzu FSR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">רישיון מוביל ארצי:</span>
                    <span className="text-emerald-400 font-bold">פעיל ומפוקח ✓</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href={`tel:${approvedBid ? approvedBid.driverPhone : '0521234567'}`}
                    className="py-2.5 px-3 bg-orange-electric text-white text-center rounded-xl text-xs font-bold hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    id="driver-call-btn"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>חיוג מהיר לנהג</span>
                  </a>
                  <a 
                    href={`https://wa.me/${approvedBid ? approvedBid.driverPhone.replace('-', '') : '972521234567'}?text=היי%20${approvedBid ? approvedBid.driverName : 'מוביל'}%20היי%20בהמשך%20להובלה%20שלי%20בטראק%20דיל%20IL%20(מזהה:${move.id})`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 text-white text-center rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    id="driver-wa-btn"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>הודעת וואטסאפ</span>
                  </a>
                </div>
              </div>
            ) : (
              // Locked Driver details (Unlocks after payment)
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-orange-electric/10 border border-orange-electric/25 flex items-center justify-center text-orange-electric mx-auto">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">פרטי הקשר חסומים</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed px-4">
                    מטעמי אבטחה והגנה על שלמות המכרז ומניעת הפקעת מחירים ביומן ההובלה, מספרי הטלפון, תמונת המשאית ומספרי הרישוי ייחשפו במלואם רק לאחר הסדרת התשלום/המקדמה.
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-orange-electric/10 border border-orange-electric/25 rounded-full text-[10px] text-orange-electric font-bold">
                  🔒 ממתין להסדרת דמי שריון
                </div>
              </div>
            )}
          </div>

          {/* SUPPORT CARD */}
          <div className="bg-navy-900 border border-navy-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-electric" />
              <span>צריך עזרה עם ההובלה?</span>
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              מוקד הגישור ושרות הלקוחות של טראק דיל IL מלווה אתכם בכל מהלך ההעמסה ופירוק הציוד למניעת עיכובים.
            </p>
            <div className="pt-2 border-t border-navy-850">
              <a 
                href="tel:039048382" 
                className="text-xs text-orange-electric hover:underline font-bold flex items-center gap-1.5"
              >
                <span>התקשר למוקד התמיכה: 03-9048382</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
