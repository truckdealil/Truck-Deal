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

  // Driver Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPhoneInput, setAuthPhoneInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Driver input states
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('3-4 שעות');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const savedDriver = localStorage.getItem('truk_active_driver_session');
    if (savedDriver) {
      try {
        const parsed = JSON.parse(savedDriver);
        if (parsed.phone && parsed.name) {
          setDriverName(parsed.name);
          setDriverPhone(parsed.phone);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

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
        throw new Error(`לא נמצאה הובלה התואמת למזהה זה`);
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

  const handleDriverPhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = authPhoneInput.replace(/\D/g, '');
    if (!cleanPhone) {
      setAuthError('נא להזין מספר טלפון תקין');
      return;
    }

    setAuthenticating(true);
    setAuthError('');

    try {
      // 1. Check local backend first
      const localRes = await fetch('/api/drivers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.status === 'success' && localData.driver) {
          const session = {
            name: localData.driver.name,
            phone: localData.driver.phone || authPhoneInput,
            truckPlate: localData.driver.truckPlate || '88-442-19',
            truckModel: localData.driver.truckModel || 'משאית הובלות'
          };
          localStorage.setItem('truk_active_driver_session', JSON.stringify(session));
          setDriverName(session.name);
          setDriverPhone(session.phone);
          setIsAuthenticated(true);
          return;
        } else if (localData.status === 'pending_approval') {
          setAuthError('חשבונך עדיין ממתין לאישור מנהל במערכת.');
          return;
        }
      }

      // 2. Google Apps Script fallback
      const gasUrl = import.meta.env.VITE_GAS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbyDiRrXdNdcYaa9VY29x6qVsumayrOBD0yHzEHosbuncvsRd-mNSaM_xEenhThsANN-/exec';
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'driver_login', phone: cleanPhone })
      });
      const result = await gasRes.json();

      if (result.status === 'success' && result.driver) {
        const session = {
          name: result.driver.name,
          phone: result.driver.phone || authPhoneInput,
          truckPlate: result.driver.truckPlate || '88-442-19',
          truckModel: result.driver.truckModel || 'משאית הובלות'
        };
        localStorage.setItem('truk_active_driver_session', JSON.stringify(session));
        setDriverName(session.name);
        setDriverPhone(session.phone);
        setIsAuthenticated(true);
        return;
      } else if (result.status === 'pending_approval') {
        setAuthError('חשבונך עדיין ממתין לאישור מנהל במערכת.');
        return;
      }

      setAuthError(result.message && !result.message.includes('Unknown action') ? result.message : 'מספר הטלפון אינו קיים ברשימת הנהגים המורשים.');
    } catch (err: any) {
      setAuthError('שגיאת תקשורת באימות מול השרת.');
    } finally {
      setAuthenticating(false);
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
        throw new Error('שגיאה בהגשת הצעת המחיר');
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
            🚚
          </div>
          <h3 className="font-black text-white text-md">זיהוי נהג מורשה במכרז</h3>
          <p className="text-xs text-gray-400">
            הזן את מספר הטלפון המורשה שלך כפי שנרשם בלשונית צי רכב לפתיחת המכרז.
          </p>
        </div>

        <form onSubmit={handleDriverPhoneAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400">מספר טלפון:</label>
            <input
              type="tel"
              required
              value={authPhoneInput}
              onChange={(e) => setAuthPhoneInput(e.target.value)}
              placeholder="05X-XXXXXXX"
              className="w-full text-center py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white focus:border-orange-electric outline-none text-sm"
            />
          </div>

          {authError && (
            <div className="text-red-400 text-xs font-bold flex items-center gap-1.5 justify-end">
              <span>{authError}</span>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
          )}

          <button
            type="submit"
            disabled={authenticating}
            className="w-full py-3 bg-orange-electric hover:bg-orange-600 text-white font-extrabold rounded-xl shadow-lg transition-all cursor-pointer text-sm"
          >
            {authenticating ? 'מאמת מול הגיליון...' : 'אימות כניסה למכרז 🔓'}
          </button>
        </form>
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
        <Truck className="w-16 h-16 text-orange-electric mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-white">שלום {driverName}, בחר מכרז להגשה</h2>
        <p className="text-gray-400 text-sm">
          הזן מזהה הובלה כדי לצפות בתכולה ולהגיש הצעת מחיר.
        </p>
        <div className="p-4 bg-navy-900 border border-navy-800 rounded-xl space-y-3">
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
              className="px-4 py-2 bg-orange-electric hover:bg-orange-600 text-white rounded-lg font-semibold text-sm cursor-pointer"
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
        <p className="text-gray-400 text-sm">טוען את פרטי ההובלה...</p>
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
          חזרה
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex bg-navy-900 border border-navy-800 p-1 rounded-xl max-w-md">
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
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
            driverMode === 'dispatch' ? 'bg-orange-electric text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          משימות וניווט שטח (PWA)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2">פרטי הובלה #{move.id.substr(5, 6)}</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block">מוצא:</span>
                <span className="text-white font-bold">{move.originAddress}</span>
              </div>
              <div>
                <span className="text-gray-400 block">יעד:</span>
                <span className="text-white font-bold">{move.destAddress}</span>
              </div>
              <div>
                <span className="text-gray-400 block">תאריך:</span>
                <span className="text-white font-bold">{move.moveDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block">שעה:</span>
                <span className="text-white font-bold">{move.moveTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6">
            <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2 mb-4">תכולת המטען</h3>
            <div className="grid grid-cols-2 gap-3">
              {move.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 bg-navy-950 rounded-lg text-xs">
                  <span className="text-gray-200">{item.name}</span>
                  <span className="text-orange-electric font-bold">כמות: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 sticky top-8">
            <h3 className="font-bold text-white text-lg border-b border-navy-800 pb-2 mb-4">הגשת הצעת מחיר</h3>

            {!success ? (
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div className="p-3 bg-navy-950 border border-navy-800 rounded-xl space-y-1 text-xs">
                  <span className="text-gray-400 block">נהג מחובר:</span>
                  <span className="text-white font-bold block">{driverName} ({driverPhone})</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-400">סכום ההצעה (₪) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1500"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white font-bold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-400">זמן עבודה משוער</label>
                  <select
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white text-xs"
                  >
                    <option value="עד שעתיים">עד שעתיים</option>
                    <option value="2-3 שעות">2-3 שעות</option>
                    <option value="3-4 שעות">3-4 שעות</option>
                    <option value="יום עבודה שלם">יום עבודה שלם</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-400">הערות</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white text-xs resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-xl text-sm cursor-pointer"
                >
                  {submitting ? 'שולח...' : 'הגש הצעת מחיר'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-md">הצעתך נקלטה בהצלחה!</h4>
                <p className="text-xs text-gray-400">ההצעה נרשמה בגיליון וממתינה לאישור המנהל.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
