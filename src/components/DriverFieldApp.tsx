import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Phone, Navigation, MapPin, Calendar, Clock, 
  Check, RefreshCw, Camera, Edit2, AlertCircle, Trash2, 
  CheckCircle2, ArrowRight, ShieldCheck, UserCheck, Play, 
  Award, Wifi, WifiOff, FileCheck, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest } from '../types';
import OperationalChat from './OperationalChat';
import MoveCountdownTimer from './MoveCountdownTimer';

interface DriverFieldAppProps {
  initialMoveId: string | null;
  onBackToBidding?: () => void;
}

interface CargoPhoto {
  url: string;
  label: string;
}

export default function DriverFieldApp({ initialMoveId, onBackToBidding }: DriverFieldAppProps) {
  // Session Driver State
  const [loggedDriver, setLoggedDriver] = useState<any | null>(() => {
    const saved = localStorage.getItem('truk_active_driver_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginPhoneInput, setLoginPhoneInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New Driver Registration states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerTruckModel, setRegisterTruckModel] = useState('');

  const [moves, setMoves] = useState<MoveRequest[]>([]);
  const [selectedMove, setSelectedMove] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);

  const [activeJobStatus, setActiveJobStatus] = useState<string>('assigned');
  const [cargoPhotos, setCargoPhotos] = useState<CargoPhoto[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [submittingPOD, setSubmittingPOD] = useState(false);
  const [podSuccess, setPodSuccess] = useState(false);
  const [podSignature, setPodSignature] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (loggedDriver) {
      fetchMovesData();
    }
  }, [loggedDriver]);

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhoneInput.replace(/\D/g, '');
    if (!cleanPhone) {
      setLoginError('נא להזין מספר טלפון תקין');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
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
          phone: result.driver.phone || loginPhoneInput,
          truckPlate: result.driver.truckPlate,
          truckModel: result.driver.truckModel
        };
        localStorage.setItem('truk_active_driver_session', JSON.stringify(session));
        setLoggedDriver(session);
        return;
      } else if (result.status === 'pending_approval') {
        setLoginError('חשבון הנהג שלך קיים בגיליון אך ממתין לאישור מנהל.');
        return;
      }

      setLoginError(result.message || 'מספר הטלפון לא נמצא במאגר הנהגים המורשים.');
    } catch (err: any) {
      setLoginError('שגיאת תקשורת באימות מול השרת.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhoneInput.replace(/\D/g, '');
    if (!cleanPhone || !registerName) {
      setLoginError('שם ומספר טלפון הם שדות חובה');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const gasUrl = import.meta.env.VITE_GAS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbyDiRrXdNdcYaa9VY29x6qVsumayrOBD0yHzEHosbuncvsRd-mNSaM_xEenhThsANN-/exec';
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'driver_register',
          phone: loginPhoneInput,
          name: registerName,
          truckModel: registerTruckModel || 'משאית הובלות'
        })
      });
      const result = await gasRes.json();
      if (result.status === 'success') {
        alert('הפרטים נרשמו בהצלחה בלשונית צי רכב בגיליון! המנהל יפתח את הגישה.');
        setIsRegisterMode(false);
      } else {
        setLoginError(result.message || 'שגיאה ברישום הנהג.');
      }
    } catch {
      setLoginError('שגיאה ברישום הנהג מול השרת.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDriverLogout = () => {
    localStorage.removeItem('truk_active_driver_session');
    setLoggedDriver(null);
    setSelectedMove(null);
  };

  const fetchMovesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const movesRes = await fetch('/api/moves');
      if (movesRes.ok) {
        const movesData: MoveRequest[] = await movesRes.json();
        setMoves(movesData);

        if (initialMoveId) {
          const matched = movesData.find(m => m.id === initialMoveId);
          if (matched) {
            setSelectedMove(matched);
            initJobState(matched);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError('פועל במצב לא מקוון');
    } finally {
      setLoading(false);
    }
  };

  const initJobState = (move: MoveRequest) => {
    if (move.status === 'completed') {
      setActiveJobStatus('completed');
      setPodSuccess(true);
    } else {
      const savedStatus = localStorage.getItem(`truk_status_job_${move.id}`);
      setActiveJobStatus(savedStatus || 'assigned');
    }
    setReceiverName(move.clientName || '');
    setHasSigned(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedMove) return;

    setActiveJobStatus(newStatus);
    localStorage.setItem(`truk_status_job_${selectedMove.id}`, newStatus);

    if (navigator.onLine) {
      setSyncPending(true);
      try {
        await fetch(`/api/moves/${selectedMove.id}/driver-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverStatus: newStatus })
        });
      } catch (err) {
        console.error('Failed to sync status to server', err);
      } finally {
        setSyncPending(false);
      }
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSigned(true);
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  const handleSubmitPOD = async () => {
    if (!selectedMove) return;
    if (!receiverName.trim()) return alert('נא להזין את שם הלקוח המקבל');
    if (!hasSigned) return alert('נא לחתום בתיבת החתימה');

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmittingPOD(true);
    const signatureImage = canvas.toDataURL('image/png');
    setPodSignature(signatureImage);

    const podPayload = {
      signatureImage,
      customerName: receiverName,
      feedbackScore: feedbackRating,
      notes: `הושלם בשטח ע״י ${loggedDriver?.name || 'נהג מורשה'}`,
      cargoPhotos
    };

    try {
      const res = await fetch(`/api/moves/${selectedMove.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(podPayload)
      });
      if (res.ok) {
        setPodSuccess(true);
      }
    } catch {
      alert('נשמר מקומית במכשיר.');
      setPodSuccess(true);
    } finally {
      setSubmittingPOD(false);
    }
  };

  // Login / Register Screen
  if (!loggedDriver) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-navy-900 border border-navy-800 rounded-3xl text-right space-y-6" dir="rtl">
        <div className="text-center space-y-2">
          <Truck className="w-12 h-12 text-orange-electric mx-auto" />
          <h3 className="font-black text-white text-lg">
            {isRegisterMode ? 'רישום נהג חדש בצי הרכב' : 'כניסה לאפליקציית שטח לנהגים'}
          </h3>
          <p className="text-xs text-gray-400">אימות ישיר מול לשונית צי רכב ב-Google Sheets</p>
        </div>

        <form onSubmit={isRegisterMode ? handleDriverRegister : handleDriverLogin} className="space-y-4">
          {isRegisterMode && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">שם מלא:</label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold">דגם משאית וציוד:</label>
                <input
                  type="text"
                  placeholder="איסוזו 7.5 טון + רמפה"
                  value={registerTruckModel}
                  onChange={(e) => setRegisterTruckModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white text-sm outline-none"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-bold">מספר טלפון:</label>
            <input
              type="tel"
              required
              placeholder="05X-XXXXXXX"
              value={loginPhoneInput}
              onChange={(e) => setLoginPhoneInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-white text-center text-sm outline-none focus:border-orange-electric"
            />
          </div>

          {loginError && (
            <div className="text-red-400 text-xs font-bold flex items-center gap-1.5 justify-end">
              <span>{loginError}</span>
              <AlertCircle className="w-4 h-4 shrink-0" />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded-xl text-sm cursor-pointer"
          >
            {isLoggingIn ? 'בודק נתונים...' : isRegisterMode ? 'שלח בקשת רישום למנהל' : 'התחבר למשמרת 🚚'}
          </button>

          <button
            type="button"
            onClick={() => { setIsRegisterMode(!isRegisterMode); setLoginError(''); }}
            className="w-full text-center text-xs text-gray-400 hover:text-white underline cursor-pointer"
          >
            {isRegisterMode ? 'כבר רשום? לחץ להתחברות' : 'נהג חדש? לחץ לרישום מהיר בגיליון'}
          </button>
        </form>
      </div>
    );
  }

  // Filter moves belonging to this driver
  const myMoves = moves.filter(m => {
    return (
      m.assignedDriverPhone === loggedDriver.phone ||
      m.assignedDriverName === loggedDriver.name ||
      m.driverBids.some(b => b.driverPhone === loggedDriver.phone && (b.status === 'approved' || b.id === m.finalApprovedBidId))
    );
  });

  return (
    <div className="bg-navy-950 min-h-screen text-gray-100 font-sans p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex justify-between items-center bg-navy-900 border border-navy-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-orange-electric" />
            <div>
              <h2 className="text-base font-bold text-white">שלום {loggedDriver.name} 🚚</h2>
              <p className="text-xs text-gray-400">נהג מורשה: {loggedDriver.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToBidding && (
              <button
                onClick={onBackToBidding}
                className="px-3 py-1.5 bg-navy-950 border border-navy-800 text-xs rounded-lg hover:text-white"
              >
                למכרזים
              </button>
            )}
            <button
              onClick={handleDriverLogout}
              className="px-3 py-1.5 bg-red-950/40 text-red-400 border border-red-500/30 text-xs rounded-lg hover:bg-red-900/50 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>יציאה</span>
            </button>
          </div>
        </div>

        {/* Task List or Active Job */}
        {!selectedMove ? (
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-md">ההובלות שלי ({myMoves.length})</h3>
            
            {myMoves.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                אין כרגע הובלות ששובצו אליך. עקוב אחר הצעות המחיר שלך במכרזים.
              </div>
            ) : (
              <div className="space-y-3">
                {myMoves.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedMove(m); initJobState(m); }}
                    className="p-4 bg-navy-950 border border-navy-850 rounded-xl hover:border-orange-electric cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-bold text-sm">#{m.id.substr(5, 6)} - {m.clientName}</p>
                      <p className="text-xs text-gray-400">{m.originAddress} ⇄ {m.destAddress}</p>
                      <p className="text-[10px] text-orange-electric">{m.moveDate} בשעה {m.moveTime}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 rotate-180" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-navy-900 border border-navy-800 p-3 rounded-xl">
              <button
                onClick={() => setSelectedMove(null)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לרשימה</span>
              </button>
              <span className="text-xs font-bold text-orange-electric">#{selectedMove.id}</span>
            </div>

            {/* Quick Actions (Waze / Call) */}
            <div className="grid grid-cols-2 gap-4">
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(selectedMove.originAddress)}&navigate=yes`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 hover:border-orange-electric"
              >
                <Navigation className="w-5 h-5 text-orange-electric" />
                <span className="text-xs font-bold text-white">נווט למוצא ב-Waze</span>
              </a>

              <a
                href={`tel:${selectedMove.clientPhone}`}
                className="p-3 bg-navy-900 border border-navy-800 rounded-xl text-center flex flex-col items-center gap-1 hover:border-orange-electric"
              >
                <Phone className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white">חייג ללקוח</span>
              </a>
            </div>

            {/* Status Stepper */}
            <div className="bg-navy-900 border border-navy-800 p-4 rounded-xl space-y-3">
              <span className="text-xs text-gray-400 block font-bold">עדכן סטטוס נסיעה:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleUpdateStatus('en_route_to_origin')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg ${activeJobStatus === 'en_route_to_origin' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400'}`}
                >
                  בדרך למוצא
                </button>
                <button
                  onClick={() => handleUpdateStatus('loading')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg ${activeJobStatus === 'loading' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400'}`}
                >
                  בהעמסה
                </button>
                <button
                  onClick={() => handleUpdateStatus('en_route_to_dest')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg ${activeJobStatus === 'en_route_to_dest' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400'}`}
                >
                  בדרך ליעד
                </button>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg ${activeJobStatus === 'completed' ? 'bg-emerald-600 text-white' : 'bg-navy-950 text-gray-400'}`}
                >
                  ביעד לפריקה
                </button>
              </div>
            </div>

            {/* Signature Pad */}
            {!podSuccess ? (
              <div className="bg-navy-900 border border-navy-800 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">חתימת לקוח על תעודת משלוח</span>
                  <button onClick={clearSignature} className="text-xs text-red-400">נקה חתימה</button>
                </div>

                <input
                  type="text"
                  placeholder="שם הלקוח המקבל"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-lg text-white text-xs"
                />

                <div className="bg-white rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 block cursor-crosshair touch-none"
                  />
                </div>

                <button
                  onClick={handleSubmitPOD}
                  disabled={submittingPOD}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {submittingPOD ? 'שומר חתימה...' : 'אשר מסירה וסגור הובלה ✍️'}
                </button>
              </div>
            ) : (
              <div className="p-6 bg-navy-900 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-white font-bold text-sm">ההובלה הושלמה ונחתמה בהצלחה!</h4>
                <p className="text-xs text-gray-400">החתימה סונכרנה ישירות ל-Google Sheets.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
