import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquare, ShieldAlert, CheckCircle2, 
  ArrowLeft, Gift, PhoneCall, Award, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveRequest } from '../types';

interface ClientFeedbackPageProps {
  moveId: string | null;
  onBackToLanding?: () => void;
}

export default function ClientFeedbackPage({ moveId, onBackToLanding }: ClientFeedbackPageProps) {
  const [move, setMove] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignedTicketId, setAssignedTicketId] = useState<string>('');

  useEffect(() => {
    if (!moveId) {
      setError('מזהה הובלה לא תקין. לא ניתן לטעון את דף המשוב.');
      setLoading(false);
      return;
    }

    const fetchMoveDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/moves`);
        if (res.ok) {
          const data: MoveRequest[] = await res.json();
          const matched = data.find(m => m.id === moveId);
          if (matched) {
            setMove(matched);
            // If move already has a feedback rating from driver signature, prefill it
            if (matched.deliveryNote?.feedbackRating) {
              setRating(matched.deliveryNote.feedbackRating);
              setComment(matched.deliveryNote.feedbackText || '');
            }
          } else {
            setError('ההובלה המבוקשת לא נמצאה במערכת.');
          }
        } else {
          setError('שגיאה בתקשורת עם השרת.');
        }
      } catch (err) {
        console.error('Error loading move for feedback:', err);
        setError('שגיאה בטעינת נתוני ההובלה.');
      } finally {
        setLoading(false);
      }
    };

    fetchMoveDetails();
  }, [moveId]);

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'טעון שיפור קיצוני 😞';
      case 2: return 'פחות מרוצה 🙁';
      case 3: return 'סביר, יש מקום לשיפור 😐';
      case 4: return 'טוב מאוד, שירות אמין 🙂';
      case 5: return 'חוויה מעולה ומקצועית! 🌟';
      default: return 'בחר דירוג בכוכבים';
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('נא לבחור דירוג בכוכבים לפני השליחה');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/moves/${moveId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedbackText: comment
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitted(true);
        if (data.move?.adminReviewTicketId) {
          setAssignedTicketId(data.move.adminReviewTicketId);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'הגשת המשוב נכשלה');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('חיבור הרשת נכשל. אנא נסה שנית.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="w-12 h-12 text-orange-electric animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-300">טוען את דף המשוב המאובטח...</p>
      </div>
    );
  }

  if (error || !move) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">תקלה בטעינת הדף</h2>
        <p className="text-sm text-gray-400 mb-6">{error || 'לא נמצאו נתוני הובלה תואמים למשוב.'}</p>
        {onBackToLanding && (
          <button 
            onClick={onBackToLanding}
            className="px-6 py-2.5 bg-navy-900 border border-navy-800 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-navy-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>חזרה למסך הבית</span>
          </button>
        )}
      </div>
    );
  }

  const driverName = move.assignedDriverName || 'צוות ההובלות של טראק דיל';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      
      {/* Decorative Top Accent */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-electric/10 border border-orange-electric/20 text-orange-electric text-xs font-black uppercase tracking-wider mb-3">
          <Award className="w-3.5 h-3.5" />
          <span>משוב לקוחות מנוהל</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">איך הייתה ההובלה שלך?</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
          המשוב שלך הוא המפתח לשיפור השירות, אבטחת האיכות וסיווג המובילים המורשים של Truk Dealil IL.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-navy-900 border border-navy-850 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden"
            id="feedback_card"
          >
            {/* Background luxury gradient spot */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-orange-electric/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="bg-navy-950/80 border border-navy-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <span className="text-xs text-gray-500 block">מספר הזמנה:</span>
                <span className="text-sm font-bold text-white font-mono">{move.id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">מוביל מורשה:</span>
                <span className="text-sm font-bold text-orange-electric">{driverName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">מסלול הובלה:</span>
                <span className="text-xs font-medium text-gray-300">
                  {move.originCity} ← {move.destCity}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-6">
              
              {/* Star rating selector */}
              <div className="text-center space-y-3">
                <label className="block text-sm font-bold text-gray-300">
                  דרג את רמת המקצועיות, הדיוק והשירות של המוביל:
                </label>
                
                <div className="flex justify-center items-center gap-2 py-3" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 rounded-full transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star 
                        className={`w-10 h-10 md:w-12 md:h-12 transition-all ${
                          (hoveredRating || rating) >= star 
                            ? 'fill-orange-electric text-orange-electric drop-shadow-[0_0_8px_rgba(255,127,0,0.5)]' 
                            : 'text-navy-750 fill-transparent hover:text-navy-600'
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <div className="min-h-[24px]">
                  <motion.p 
                    key={hoveredRating || rating}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-sm font-bold ${
                      (hoveredRating || rating) > 0 ? 'text-orange-electric' : 'text-gray-500'
                    }`}
                  >
                    {getRatingText(hoveredRating || rating)}
                  </motion.p>
                </div>
              </div>

              {/* Text feedback comments */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-electric" />
                  <span>הערות והארות נוספות (אופציונלי):</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="ספר לנו על חווית השירות... האם המוביל הגיע בזמן? האם הציוד נשמר בשלמותו? מה אהבת ומה ניתן לשפר?"
                  className="w-full h-32 px-4 py-3 bg-navy-950 border border-navy-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-electric/50 focus:ring-1 focus:ring-orange-electric/30 transition-all text-right resize-none"
                  id="feedback_comment"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="flex-1 py-3 bg-orange-electric hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-orange-electric/15 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>שומר משוב במערכת...</span>
                    </>
                  ) : (
                    <span>שלח משוב מאובטח 🌟</span>
                  )}
                </button>

                {onBackToLanding && (
                  <button
                    type="button"
                    onClick={onBackToLanding}
                    className="px-6 py-3 bg-navy-950 border border-navy-800 hover:bg-navy-900 rounded-xl text-gray-400 hover:text-white font-bold transition-all cursor-pointer"
                  >
                    חזרה לבית
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-900 border border-navy-850 rounded-2xl p-6 md:p-8 text-center shadow-xl space-y-6 overflow-hidden relative"
          >
            {/* Background decorative shine */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-electric/5 rounded-full blur-[80px]" />

            {/* HIGH RATING ROUTING (4-5 Stars) */}
            {rating >= 4 ? (
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">תודה רבה על המשוב החיובי! 🎉</h2>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    שמחנו מאוד לשמוע שההובלה שלך עם <span className="text-orange-electric font-semibold">{driverName}</span> הייתה מוצלחת ומקצועית.
                  </p>
                </div>

                {/* Google Reviews Redirection CTA with incentive */}
                <div className="bg-navy-950/80 border border-orange-electric/20 rounded-2xl p-6 max-w-lg mx-auto space-y-4">
                  <div className="flex items-center justify-center gap-2 text-orange-electric font-black text-sm">
                    <Gift className="w-5 h-5 animate-bounce" />
                    <span>מתנה מיוחדת בשבילך!</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">שתף את חווית ההובלה שלך גם בגוגל מפות</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    לקוחות מרוצים כמוך עוזרים לנו להמשיך להשתפר. בלחיצה על הכפתור למטה, תוכל להעתיק את המשוב שכתבת ולהדביק אותו בביקורות גוגל מפות של טראק דיל il. 
                    <br />
                    <span className="text-white font-bold mt-1 inline-block">קבלו מיידית קופון של ₪50 הנחה להובלה הבאה שלכם! 🎁</span>
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                    <a
                      href="https://search.google.com/local/writereview?placeid=ChIJ8_eI74N_AhUR267eN89B_2s" // Truk Dealil Google Review link
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-orange-electric hover:bg-orange-600 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-white text-white" />
                      <span>כתיבת חוות דעת בגוגל 🚀</span>
                    </a>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(comment || `שירות מעולה ומקצועי של המוביל ${driverName} דרך טראק דיל! מומלץ בחום.`);
                        alert('המשוב הועתק ללוח! כעת תוכל להדביק אותו בקלות בדף הביקורות של גוגל.');
                      }}
                      className="px-4 py-2.5 bg-navy-900 border border-navy-800 hover:bg-navy-850 rounded-xl text-gray-300 font-bold text-xs cursor-pointer"
                    >
                      העתק את המשוב שכתבתי 📋
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* LOW RATING ROUTING (1-3 Stars) - Priority handling card */
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-orange-electric/15 border border-orange-electric/30 flex items-center justify-center mx-auto text-orange-electric animate-pulse">
                  <ShieldAlert className="w-9 h-9" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">המשוב שלך התקבל לטיפול מנהלים דחוף</h2>
                  <p className="text-sm text-gray-300 max-w-md mx-auto">
                    אנו מצטערים עמוקות לשמוע שחווית השירות שלך לא ענתה על הציפיות. המוניטין של Truk Dealil IL מבוסס על שירות ללא פשרות, ואנחנו מתייחסים למצב זה במלוא הרצינות.
                  </p>
                </div>

                <div className="bg-navy-950 border border-red-500/10 rounded-2xl p-5 max-w-md mx-auto text-right space-y-3">
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-xs text-gray-500">סטטוס פנייה:</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">דחוף - בטיפול הנהלה</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">מספר כרטיס טיפול:</span>
                    <span className="text-xs font-bold text-white font-mono">{assignedTicketId || 'TKT-743829'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">זמן מענה משוער:</span>
                    <span className="text-xs font-extrabold text-orange-electric">עד שעתיים בשעות הפעילות</span>
                  </div>
                  
                  <p className="text-xs text-gray-400 pt-2 border-t border-navy-850 leading-relaxed">
                    מנהל קשרי לקוחות ראשי עודכן באופן אוטומטי ובודק כעת את ההיסטוריה והלוג של ההובלה מול המוביל המורשה <span className="text-white font-bold">{driverName}</span>. ניצור איתך קשר טלפוני בהקדם למציאת פתרון לשביעות רצונך.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>מוקד חירום לקוחות: 072-3958444</span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-navy-850">
              {onBackToLanding && (
                <button
                  onClick={onBackToLanding}
                  className="px-6 py-2.5 bg-navy-950 border border-navy-800 hover:bg-navy-900 rounded-xl text-white font-bold text-sm cursor-pointer"
                >
                  חזרה למסך הבית
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
