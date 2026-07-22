import React, { useRef, useState, useEffect } from 'react';
import { 
  Check, Edit2, RefreshCw, Star, Trash2, ShieldCheck, 
  FileText, ArrowRight, UserCheck, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest } from '../types';

interface DigitalDeliveryNoteProps {
  move: MoveRequest;
  onSuccess: (updatedMove: MoveRequest) => void;
  onBack?: () => void;
}

export default function DigitalDeliveryNote({ move, onSuccess, onBack }: DigitalDeliveryNoteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [customerName, setCustomerName] = useState(move.clientName || '');
  const [feedbackScore, setFeedbackScore] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');

  // Keep track of which items are confirmed
  const [confirmedItemIds, setConfirmedItemIds] = useState<{ [key: string]: boolean }>(
    move.items.reduce((acc, item) => ({ ...acc, [item.id]: true }), {})
  );

  const toggleItem = (itemId: string) => {
    setConfirmedItemIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const toggleAllItems = (val: boolean) => {
    const updated = { ...confirmedItemIds };
    move.items.forEach(item => {
      updated[item.id] = val;
    });
    setConfirmedItemIds(updated);
  };

  // Resize canvas to look perfect on high DPI and different screen sizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1e293b'; // Slate 800 for ink
    }
  }, []);

  // Helper to get touch/mouse coordinates relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Check if it is touch event
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

  // Drawing Handlers
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // Submit delivery note
  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError('נא להזין את שם הלקוח המקבל ומאשר');
      return;
    }

    if (!hasSigned) {
      setError('נא להחתים את הלקוח בתיבת החתימה');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmitting(true);
    setError(null);

    // Get signature as Base64 data URL
    const signatureImage = canvas.toDataURL('image/png');
    setSignatureUrl(signatureImage);

    // Create delivery items list with receipt status
    const confirmedItems = move.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      confirmed: !!confirmedItemIds[item.id]
    }));

    const payload = {
      signatureImage,
      confirmedItems,
      customerName,
      feedbackScore,
      notes
    };

    try {
      const response = await fetch(`/api/moves/${move.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('שגיאה בעדכון מסירת המשלוח בשרת');
      }

      const data = await response.json();
      setSuccess(true);
      onSuccess(data.move);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'שגיאה ברשת או בשמירת חתימת הלקוח');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="max-w-xl mx-auto px-4 py-4" dir="rtl">
      
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header and Back Button */}
            <div className="flex justify-between items-center pb-4 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-electric" />
                <h3 className="text-xl font-black text-white">תעודת משלוח דיגיטלית</h3>
              </div>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-gray-300 rounded-lg text-xs font-bold border border-navy-800 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>חזרה לפרטים</span>
                </button>
              )}
            </div>

            {/* Step Status Badge */}
            <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl space-y-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                שלב סופי: מסירה בשטח וחתימה לקוח
              </span>
              <p className="text-xs text-gray-300">
                פרקו את התכולה ביעד, עברו על הרשימה יחד עם הלקוח, ובקשו ממנו לחתום לאישור סופי של ההובלה.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Checklist items section */}
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-navy-850 pb-2">
                <h4 className="font-bold text-white text-sm">וידוא פריטי המטען ביעד</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAllItems(true)}
                    className="text-[10px] text-orange-electric font-semibold hover:underline"
                  >
                    סמן הכל
                  </button>
                  <span className="text-gray-700">|</span>
                  <button
                    onClick={() => toggleAllItems(false)}
                    className="text-[10px] text-gray-400 font-semibold hover:underline"
                  >
                    בטל הכל
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {move.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      confirmedItemIds[item.id]
                        ? 'bg-navy-950 border-emerald-500/30 text-white'
                        : 'bg-navy-950/50 border-navy-800 text-gray-500 line-through'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        confirmedItemIds[item.id] ? 'bg-emerald-500 text-white' : 'border border-gray-600'
                      }`}>
                        {confirmedItemIds[item.id] && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-semibold">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-navy-900 px-2 py-0.5 rounded text-gray-400">
                      כמות: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signer Identification */}
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-white text-sm border-b border-navy-850 pb-2">פרטי המקבל והרשאה</h4>
              
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400 font-semibold">שם מלא של הלקוח החותם <span className="text-orange-electric">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="למשל: ישראל ישראלי"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl focus:border-orange-electric outline-none text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Star rating for delivery quality */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-400 font-semibold">דירוג שירות ואיכות ההובלה</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackScore(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star 
                          className={`w-6 h-6 ${
                            star <= feedbackScore ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-400 font-semibold">משוב או הערות הלקוח (לא חובה)</label>
                  <input
                    type="text"
                    placeholder="שירות מקצועי, אדיב ומהיר!"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-navy-950 border border-navy-700 rounded-xl focus:border-orange-electric outline-none text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* HTML5 Canvas Signature Pad */}
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-navy-850 pb-2">
                <div className="flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-orange-electric" />
                  <h4 className="font-bold text-white text-sm">חתימה דיגיטלית של הלקוח</h4>
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>נקה חתימה</span>
                </button>
              </div>

              {/* Pad Frame */}
              <div className="bg-gray-100 rounded-xl border border-navy-700 overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 bg-white block cursor-crosshair touch-none"
                />
                
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs font-medium">
                    חתום עם האצבע או עט מגע כאן ✍️
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 text-center">
                במתן חתימה זו, הלקוח מאשר כי כל פריטי התכולה שנבחרו למעלה הגיעו ליעד המבוקש ללא פגע.
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 bg-orange-electric hover:bg-orange-hover disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>אישור מסירה סופי וסגירת הזמנה</span>
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-900 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">המסירה אושרה בהצלחה! 🎉</h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                תעודת המשלוח הדיגיטלית עם חתימת הלקוח הופקה בהצלחה, עודכנה ב-Firebase וסונכרנה ישירות מול כרטיס ההזמנה בדשבורד הניהול המרכזי.
              </p>
            </div>

            {/* Summary PDF Receipt Simulation View */}
            <div className="bg-navy-950 p-4 rounded-xl border border-navy-850 text-right space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-navy-800 pb-1.5 mb-1.5">
                <span className="font-bold text-orange-electric text-xs">סיכום תעודת מסירה</span>
                <span className="text-[10px] text-gray-500 font-mono">{new Date().toLocaleString('he-IL')}</span>
              </div>
              <p className="text-white"><strong>מספר הזמנה:</strong> #{move.id.substring(0, 8)}</p>
              <p className="text-white"><strong>לקוח מקבל:</strong> {customerName}</p>
              <p className="text-white"><strong>מוביל מורשה:</strong> {move.driverBids.find(b => b.id === move.finalApprovedBidId || b.status === 'approved')?.driverName || 'טראק דיל IL'}</p>
              <p className="text-white"><strong>פריטים שנמסרו:</strong> {Object.values(confirmedItemIds).filter(Boolean).length} מתוך {move.items.length}</p>
              
              <div className="pt-2 border-t border-navy-800 flex justify-between items-center">
                <span className="text-gray-400">חתימת לקוח:</span>
                <div className="bg-white/95 p-1 rounded border border-gray-400 h-12 w-32 overflow-hidden flex items-center justify-center">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature Preview" className="max-h-full max-w-full object-contain text-black" />
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold">לא נמצאה חתימה</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="bg-orange-electric/10 border border-orange-electric/20 p-3 rounded-xl flex items-center gap-2 justify-center text-[11px] text-orange-electric font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                <span>הקובץ הועלה בהצלחה ל-Google Drive (סוודר: 1_9vxDiPP5)</span>
              </div>

              <button
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else {
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 bg-navy-850 hover:bg-navy-800 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-navy-750"
              >
                חזרה לפורטל נהגים
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
