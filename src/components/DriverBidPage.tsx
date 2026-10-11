import React, { useState, useEffect } from 'react';
import { 
  Truck, ShieldCheck, Clock, MapPin, Calendar, 
  Sparkles, CheckCircle2, DollarSign, Send, User, 
  Phone, FileText, AlertCircle, Eye, Edit2, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest, DriverBid } from '../types';
import DigitalDeliveryNote from './DigitalDeliveryNote';
import DriverFieldApp from './DriverFieldApp';
import MoveCountdownTimer from './MoveCountdownTimer';

interface DriverBidPageProps {
  initialMoveId: string | null;
  onBidSubmitted: () => void;
}

export default function DriverBidPage({ initialMoveId, onBidSubmitted }: DriverBidPageProps) {
  const [moveId, setMoveId] = useState<string | null>(initialMoveId);
  const [move, setMove] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeliveryNote, setShowDeliveryNote] = useState(false);
  const [driverMode, setDriverMode] = useState<'bidding' | 'dispatch'>('bidding');

  // PIN Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Driver input states
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('3-4 שעות');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load move details if ID is present
  useEffect(() => {
    if (moveId) {
      fetchMoveDetails(moveId);
    }
  }, [moveId]);

  const fetchMoveDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/moves/${id}`);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[DriverBidPage GET /api/moves/${id} Error]: HTTP ${response.status}:`, errText);
        throw new Error(`לא נמצאה הובלה התואמת למזהה זה (קוד ${response.status})`);
      }
      const data = await response.json();
      setMove(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פרטי ההובלה');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!move) return;
    if (!driverName || !driverPhone || !bidAmount) {
      setError('אנא מלא את כל שדות החובה להגשת ההצעה');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      driverName,
      driverPhone,
      bidAmount: Number(bidAmount),
      estimatedDuration,
      notes
    };

    try {
      const response = await fetch(`/api/moves/${move.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(async () => ({ error: await response.text().catch(() => '') }));
        console.error(`[DriverBidPage POST /api/moves/${move.id}/bids Error]: HTTP ${response.status}:`, errData);
        throw new Error(errData.error || `שגיאה בהגשת הצעת המחיר (${response.status})`);
      }

      setSuccess(true);
      onBidSubmitted();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההצעה בשרת');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-navy-900 border border-navy-800 rounded-3xl shadow-2xl text-right space-y-6" dir="rtl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-orange-electric/10 text-orange-electric border border-orange-electric/30 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>
          <h3 className="font-black text-white text-md">שומר סף פורטל נהגים</h3>
          <p className="text-xs text-gray-400">
            הקש קוד PIN תקין בן 4 ספרות (לדוגמה: 1983 או 2026) כדי לפתוח את פורטל הניהול והצ׳אטים של נהגי המערכת.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400">קוד PIN בן 4 ספרות</label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setPinError('');
              }}
              placeholder="••••"
              className="w-full text-center tracking-[1em] text-lg font-black py-3 bg-navy-950 border border-navy-700 rounded-xl text-orange-electric focus:border-orange-electric outline-none"
            />
          </div>

          {pinError && (
            <div className="text-red-400 text-xs font-bold flex items-center gap-1.5 justify-end">
              <span>{pinError}</span>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
          )}

          <button
            onClick={() => {
              if (pin === '1983' || pin === '2026') {
                setIsAuthenticated(true);
              } else {
                setPinError('קוד PIN שגוי! נא להקליד 1983 או 2026.');
              }
            }}
            className="w-full py-3 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            אימות קוד וכניסה לפורטל 🔓
          </button>
        </div>
      </div>
    );
  }

  if (driverMode === 'dispatch') {
    return (
      <DriverFieldApp 
        initialMoveId={moveId} 
        onBackToBidding={() => setDriverMode('bidding')} 
      />
    );
  }

  if (!moveId) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        {/* Toggle Mode for Dispatcher PWA */}
        <div className="flex bg-navy-900 border border-navy-800 p-1 rounded-xl mb-4">
          <button
            onClick={() => setDriverMode('bidding')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              driverMode === 'bidding' ? 'bg-orange-electric text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            מכרזים פתוחים
          </button>
          <button
            onClick={() => setDriverMode('dispatch')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              driverMode === 'dispatch' ? 'bg-orange-electric/20 border border-orange-electric/30 text-orange-electric' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>לוח משימות שטח (PWA)</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          </button>
        </div>

        <Truck className="w-16 h-16 text-orange-electric mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-white">פורטל הצעות מחיר לנהגי משאיות</h2>
        <p className="text-gray-400 text-sm">
          כניסה לדף זה מתבצעת בדרך כלל דרך קישור ייעודי הנשלח ב-WhatsApp לנהג לאחר פרסום מכרז הובלה חדש.
        </p>
        <div className="p-4 bg-navy-900 border border-navy-800 rounded-xl space-y-3">
          <p className="text-xs text-gray-500">לצורך בדיקה וסומילציה, הזן מזהה הובלה תקין:</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="מזהה הובלה (למשל: move_xyz)" 
              id="simulate-move-id"
              className="flex-1 px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-sm text-white"
            />
            <button
              onClick={() => {
                const val = (document.getElementById('simulate-move-id') as HTMLInputElement)?.value;
                if (val) setMoveId(val);
              }}
              className="px-4 py-2 bg-orange-electric hover:bg-orange-hover text-white rounded-lg font-semibold text-sm cursor-pointer"
            >
              טען
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-orange-electric border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 text-sm">טוען את פרטי ההובלה והניתוח הלוגיסטי...</p>
      </div>
    );
  }

  if (error || !move) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4 bg-navy-900 rounded-2xl border border-red-500/20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">שגיאה בטעינת המכרז</h3>
        <p className="text-gray-400 text-sm">{error || 'מכרז זה אינו קיים במערכת'}</p>
        <button
          onClick={() => setMoveId(null)}
          className="px-5 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-gray-300 rounded-xl font-semibold text-sm cursor-pointer"
        >
          חזרה לבחירת מזהה
        </button>
      </div>
    );
  }

  if (showDeliveryNote && move) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <DigitalDeliveryNote
          move={move}
          onSuccess={(updatedMove) => {
            setMove(updatedMove);
          }}
          onBack={() => setShowDeliveryNote(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Workspace Switcher Tabs */}
      <div className="flex bg-navy-900 border border-navy-800 p-1 rounded-xl max-w-md" id="driver-portal-workspace-tabs">
        <button
          onClick={() => setDriverMode('bidding')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
            driverMode === 'bidding' ? 'bg-orange-electric text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          הגשת הצעת מחיר במכרז 💰
        </button>
        <button
          onClick={() => setDriverMode('dispatch')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            driverMode === 'dispatch' ? 'bg-orange-electric text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>משימות וניווט שטח (PWA)</span>
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
        </button>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-navy-800">
        <div>
          <span className="text-xs text-orange-electric font-bold tracking-wider block mb-1">פורטל נהגי משאיות מורשים</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-sans">
            מכרז הובלה חכם #{move.id.substr(5, 6)}
          </h2>
        </div>
        <div className="flex gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            move.status === 'new' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
            move.status === 'bidding' ? 'bg-orange-electric/10 text-orange-electric border border-orange-electric/30' :
            move.status === 'bid_approved' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
            move.status === 'approved_for_driver' ? 'bg-orange-electric/25 text-orange-electric border border-orange-electric/40 animate-pulse' :
            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            סטטוס: {
              move.status === 'new' ? 'חדש' :
              move.status === 'bidding' ? 'בתהליך מכרז' :
              move.status === 'bid_approved' ? 'הצעה אושרה ע״י מנהל' :
              move.status === 'approved_for_driver' ? 'בדרך אל היעד 🚚' :
              'הושלם ונחתם ביעד 🏁'
            }
          </span>
          <span className="px-3 py-1 bg-navy-800 rounded-full text-xs text-gray-400 border border-navy-700">
            תאריך פרסום: {new Date(move.createdAt).toLocaleDateString('he-IL')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Move specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main info card */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2">פרטי ההובלה והנתיב</h3>

            {/* Scheduled Departure Countdown Timer */}
            <MoveCountdownTimer 
              moveDate={move.moveDate}
              moveTime={move.moveTime}
              status={move.status}
              variant="banner"
              title="ספירה לאחור לשעת ההובלה המתוכננת"
              originAddress={move.originAddress}
              showSimulateToggle={true}
            />
            
            {move.isPaymentLocked && (
              <div className="p-4 bg-orange-electric/15 border border-orange-electric/30 rounded-xl flex items-start gap-3 text-right">
                <AlertCircle className="w-5 h-5 text-orange-electric shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-orange-electric block">מצב הגנת תשלום פעיל (Payment Gate Secured)</span>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    חלקי פרטים רגישים (כגון טלפון, אימייל וכתובת מדויקת) חסומים כעת מטעמי אבטחה פיננסית. הפרטים המלאים ייחשפו בפניך ויישלחו אליך אוטומטית ברגע שהלקוח יסדיר את המקדמה או שההובלה תאושר סופית ע״י מנהל.
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-orange-electric shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-500 text-xs block">כתובת מוצא</span>
                    <span className="text-white text-sm font-semibold">{move.originAddress}</span>
                    <span className="text-gray-400 text-xs block mt-1">קומה: {move.floor} {move.hasElevator ? '(יש מעלית)' : '(אין מעלית - סחיבה ברגל)'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-500 text-xs block">כתובת יעד</span>
                    <span className="text-white text-sm font-semibold">{move.destAddress}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-r border-navy-800/80 pr-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="text-gray-500 text-xs block">תאריך הובלה</span>
                    <span className="text-white text-sm font-semibold">{move.moveDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="text-gray-500 text-xs block">טווח שעות מועדף</span>
                    <span className="text-white text-sm font-semibold">{move.moveTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Building Specs */}
            <div className="bg-navy-950 p-4 rounded-xl border border-navy-850 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-gray-500 text-xs block">סוג הובלה</span>
                <span className="text-white text-xs font-bold block mt-1">
                  {move.moveType === 'apartment' ? 'הובלת דירה' : move.moveType === 'office' ? 'משרד' : 'משלוח'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">גישת משאית</span>
                <span className="text-white text-xs font-bold block mt-1">
                  {move.truckAccess === 'easy' ? 'קלה וקרובה' :
                   move.truckAccess === 'medium' ? 'בינונית (עד 30מ)' :
                   move.truckAccess === 'difficult' ? 'קשה / חוסם כביש' : 'אין חנייה כלל'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">מנוף חיצוני</span>
                <span className="text-white text-xs font-bold block mt-1">
                  {move.craneNeeded === 'yes' ? 'נדרש בוודאות' :
                   move.craneNeeded === 'no' ? 'אין צורך' : 'לשיקול המוביל'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">מידות מעלית</span>
                <span className="text-white text-xs font-bold block mt-1">
                  {move.hasElevator 
                    ? `${move.elevatorDetails.sofaFits ? 'ספה נכנסת' : 'ספה לא'} | ${move.elevatorDetails.fridgeFits ? 'מקרר נכנס' : 'מקרר לא'}`
                    : 'אין מעלית'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Guide insights */}
          {move.aiAnalysis && (
            <div className="bg-gradient-to-br from-navy-900 to-navy-950 border border-orange-electric/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 px-3 py-1 bg-orange-electric text-white text-xs font-bold rounded-br-xl flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ניתוח לוגיסטי AI</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="bg-navy-900/40 p-4 rounded-xl border border-navy-850">
                  <span className="text-gray-500 text-xs block">מדד קושי מחושב</span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">{move.aiAnalysis.difficultyScore} / 10</span>
                  <p className="text-gray-400 text-xs mt-1">מבוסס קומה, מעלית, תכולה ונגישות דרך.</p>
                </div>

                <div className="bg-navy-900/40 p-4 rounded-xl border border-navy-850">
                  <span className="text-gray-500 text-xs block">אומדן מחיר מוצע לקוח</span>
                  <span className="text-2xl font-black text-orange-electric font-mono mt-1 block">{move.aiAnalysis.estimatedPriceRange}</span>
                  <p className="text-gray-400 text-xs mt-1">טווח מחיר בסיס מומלץ לאישור מול הלקוח.</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-navy-800 space-y-2">
                <span className="text-gray-400 text-xs font-bold block">הנחיות עבודה מונעות סיכונים:</span>
                <ul className="space-y-1">
                  {move.aiAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-orange-electric">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Cargo/Inventory List */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
            <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2 mb-4">תכולת המטען המלאה</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {move.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-navy-950 rounded-xl border border-navy-850 text-sm">
                  <span className="font-medium text-gray-200">{item.name}</span>
                  <span className="px-3 py-1 bg-orange-electric/10 text-orange-electric font-black rounded-lg text-xs">
                    כמות: {item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {move.notes && (
              <div className="mt-6 p-4 bg-navy-950/60 rounded-xl border border-navy-850">
                <span className="text-gray-500 text-xs block mb-1">הערות לקוח חשובות</span>
                <p className="text-gray-300 text-sm leading-relaxed">{move.notes}</p>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          {move.images && move.images.length > 0 && (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
              <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-electric" />
                <span>צילומים מהשטח להמחשת הנגישות</span>
              </h3>
              <div className="flex flex-wrap gap-4">
                {move.images.map((img, idx) => (
                  <div key={idx} className="w-36 h-36 rounded-xl overflow-hidden border border-navy-850 hover:scale-105 transition-transform duration-300 cursor-pointer">
                    <img src={img} alt={`Move upload ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Bid submission Form or Digital Delivery Note */}
        <div className="space-y-6">
          {move.status === 'approved_for_driver' || move.status === 'completed' ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 sticky top-8 space-y-6 text-right">
              <div className="border-b border-navy-800 pb-4">
                <span className="text-xs text-orange-electric font-bold tracking-wider block mb-1">פרוטוקול מסירה דיגיטלי</span>
                <h3 className="font-bold text-white text-lg">אישור מסירה וחתימה</h3>
              </div>

              {move.status === 'approved_for_driver' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-electric/15 border border-orange-electric/30 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-orange-electric block">🚚 הובלה משוחררת לביצוע בשטח</span>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      ההזמנה אושרה ותואמה מולך כמוביל מורשה. בסיום פריקת פריטי התכולה ביעד, לחץ על הכפתור למטה להפעלת לוח החתימה הדיגיטלי וסגירת התעודה בשטח.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDeliveryNote(true)}
                    className="w-full py-3.5 bg-orange-electric hover:bg-orange-hover text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm animate-pulse"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>✍️ פתח תעודת משלוח וחתימה</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-emerald-400 block">🏁 ההובלה הושלמה בהצלחה</span>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      הלקוח חתם על תעודת המשלוח הדיגיטלית. הסטטוס ב-Firebase עודכן ל-Completed וכל החיוויים בדשבורד הניהול המרכזי סונכרנו.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDeliveryNote(true)}
                    className="w-full py-3 bg-navy-850 hover:bg-navy-800 border border-navy-750 text-gray-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <FileText className="w-4 h-4 text-orange-electric" />
                    <span>📄 הצג תעודת מסירה חתומה</span>
                  </button>
                </div>
              )}

              {/* Delivery Details */}
              <div className="bg-navy-950 p-4 rounded-xl border border-navy-850 space-y-2.5 text-xs">
                <span className="text-gray-500 font-bold block mb-1">פרטי התיאום הסופי:</span>
                <div className="flex justify-between">
                  <span className="text-gray-400">מוביל אחראי:</span>
                  <span className="text-white font-semibold">
                    {move.driverBids.find(b => b.id === move.finalApprovedBidId || b.status === 'approved')?.driverName || 'מוביל מורשה'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">סכום מאושר:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ₪{move.driverBids.find(b => b.id === move.finalApprovedBidId || b.status === 'approved')?.bidAmount || 1500}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">תשלום מאובטח:</span>
                  <span className="text-white">
                    {move.paymentStatus === 'paid_full' ? 'שולם במלואו' : 
                     move.paymentStatus === 'paid_deposit' ? 'מקדמה שולמה' : 
                     move.paymentStatus === 'net_30' ? 'שוטף+30 (עסקי)' : 'ממתין לתשלום'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 sticky top-8">
              <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2 mb-6">הגשת הצעת מחיר</h3>

              <AnimatePresence mode="wait">
                {!success ? (
                  <form onSubmit={handleSubmitBid} className="space-y-5">
                    {/* Error if any */}
                    {error && (
                      <div className="p-3 bg-red-950/50 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Driver Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-400">שם הנהג / מוביל מורשה <span className="text-orange-electric">*</span></label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          required
                          placeholder="ישראל ישראלי"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 bg-navy-950 border border-navy-700 rounded-lg focus:border-orange-electric outline-none text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Driver Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-400">מספר טלפון לתיאום <span className="text-orange-electric">*</span></label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="tel"
                          required
                          placeholder="05x-xxxxxxx"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 bg-navy-950 border border-navy-700 rounded-lg focus:border-orange-electric outline-none text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Bid Amount */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-400">סכום ההצעה המבוקש (₪) <span className="text-orange-electric">*</span></label>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="למשל: 1500"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 bg-navy-950 border border-navy-700 rounded-lg focus:border-orange-electric outline-none text-white font-bold text-sm"
                        />
                      </div>
                    </div>

                    {/* Estimated Duration */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-400">זמן עבודה משוער</label>
                      <select
                        value={estimatedDuration}
                        onChange={(e) => setEstimatedDuration(e.target.value)}
                        className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white text-sm outline-none"
                      >
                        <option value="עד שעתיים">עד שעתיים</option>
                        <option value="2-3 שעות">2-3 שעות</option>
                        <option value="3-4 שעות">3-4 שעות</option>
                        <option value="4-5 שעות">4-5 שעות</option>
                        <option value="יום עבודה שלם">יום עבודה שלם (מעל 5 שעות)</option>
                      </select>
                    </div>

                    {/* Driver notes */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-400">הערות / הסתייגויות (לא חובה)</label>
                      <div className="relative">
                        <FileText className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                        <textarea
                          rows={3}
                          placeholder="למשל: המחיר כולל ביטוח תכולה מלא. לא כולל מנוף במידה ויידרש ברגע האחרון..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 bg-navy-950 border border-navy-700 rounded-lg focus:border-orange-electric outline-none text-white text-xs resize-none"
                        ></textarea>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-orange-electric hover:bg-orange-hover disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(255,127,0,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>הגש הצעת מחיר במכרז</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-white text-md">הצעתך נקלטה בהצלחה!</h4>
                    <p className="text-gray-400 text-xs max-w-xs mx-auto">
                      הצעת המחיר נשמרה בשרת וסונכרנה למערכת הניהול המרכזית. מנהל המערכת יבחן את הצעתך טרם שיגור האישור הסופי ללקוח ב-WhatsApp.
                    </p>
                    <div className="pt-4 flex justify-center gap-2">
                      <button
                        onClick={() => setSuccess(false)}
                        className="px-4 py-1.5 bg-navy-800 text-gray-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer border border-navy-700"
                      >
                        הגש הצעה נוספת / עדכן
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
