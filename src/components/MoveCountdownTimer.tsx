import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, BellRing, Timer, CheckCircle2, 
  Flame, Zap, Calendar, Play
} from 'lucide-react';

interface MoveCountdownTimerProps {
  moveDate: string;
  moveTime?: string;
  status?: string;
  variant?: 'banner' | 'card' | 'compact' | 'hero';
  className?: string;
  title?: string;
  clientName?: string;
  originAddress?: string;
  showSimulateToggle?: boolean;
}

/**
 * Parses moveDate (YYYY-MM-DD, DD/MM/YYYY, etc.) and moveTime ('08:30', 'בוקר (07:00 - 12:00)', etc.)
 * into a valid Date object.
 */
export function parseMoveDateTime(moveDate: string, moveTime?: string): Date | null {
  if (!moveDate) return null;

  let hours = 8;
  let minutes = 0;

  if (moveTime) {
    // Look for explicit HH:MM pattern like '07:00', '14:30', '8:00'
    const timeMatch = moveTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else if (moveTime.includes('בוקר')) {
      hours = 7;
      minutes = 0;
    } else if (moveTime.includes('צהריים')) {
      hours = 12;
      minutes = 0;
    } else if (moveTime.includes('אחר הצהריים') || moveTime.includes('ערב')) {
      hours = 16;
      minutes = 0;
    }
  }

  // Parse YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  try {
    if (moveDate.includes('-')) {
      const parts = moveDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), hours, minutes, 0);
        } else {
          // DD-MM-YYYY
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), hours, minutes, 0);
        }
      }
    } else if (moveDate.includes('/')) {
      const parts = moveDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), hours, minutes, 0);
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), hours, minutes, 0);
        }
      }
    }

    const standardDate = new Date(moveDate);
    if (!isNaN(standardDate.getTime())) {
      standardDate.setHours(hours, minutes, 0, 0);
      return standardDate;
    }
  } catch (err) {
    console.warn('Error parsing move date/time:', err);
  }

  return null;
}

export default function MoveCountdownTimer({
  moveDate,
  moveTime,
  status,
  variant = 'card',
  className = '',
  title,
  clientName,
  originAddress,
  showSimulateToggle = false
}: MoveCountdownTimerProps) {
  // Allow interactive simulation of < 1 hour for testing
  const [simulatedOffsetMinutes, setSimulatedOffsetMinutes] = useState<number | null>(null);

  // Time remaining calculation state
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLessThanOneHour: boolean;
    isCritical15Min: boolean;
    isPast: boolean;
    formattedTimeStr: string;
  } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      let targetDate = parseMoveDateTime(moveDate, moveTime);
      if (!targetDate) {
        setTimeLeft(null);
        return;
      }

      const now = new Date();

      // If simulated offset is active (e.g. 45 mins), override targetDate
      if (simulatedOffsetMinutes !== null) {
        targetDate = new Date(now.getTime() + simulatedOffsetMinutes * 60 * 1000);
      }

      const diffMs = targetDate.getTime() - now.getTime();
      const isPast = diffMs <= 0;
      
      const absMs = Math.abs(diffMs);
      const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((absMs / (1000 * 60)) % 60);
      const seconds = Math.floor((absMs / 1000) % 60);

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      // Less than 1 hour (between 0 and 60 minutes)
      const isLessThanOneHour = !isPast && totalMinutes < 60;
      const isCritical15Min = !isPast && totalMinutes < 15;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const formattedTimeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      setTimeLeft({
        totalMs: diffMs,
        days,
        hours,
        minutes,
        seconds,
        isLessThanOneHour,
        isCritical15Min,
        isPast,
        formattedTimeStr
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [moveDate, moveTime, simulatedOffsetMinutes]);

  if (!timeLeft) {
    return (
      <div className={`text-xs text-gray-500 flex items-center gap-1.5 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>מועד מתוכנן: {moveDate} {moveTime || ''}</span>
      </div>
    );
  }

  // Already completed move
  if (status === 'completed') {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span>ההובלה בוצעה והסתיימה בהצלחה 🏁</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds, isLessThanOneHour, isCritical15Min, isPast } = timeLeft;
  const pad = (n: number) => n.toString().padStart(2, '0');

  // ==========================================
  // VARIANT: COMPACT (Pill / Small Badge)
  // ==========================================
  if (variant === 'compact') {
    if (isPast) {
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 ${className}`}>
          <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>שעת ההובלה הגיעה! 🚚</span>
        </div>
      );
    }

    if (isLessThanOneHour) {
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all animate-pulse ${
          isCritical15Min 
            ? 'bg-red-600/25 border-red-500 text-red-200 shadow-sm shadow-red-500/30' 
            : 'bg-orange-500/25 border-orange-500 text-orange-200 shadow-sm shadow-orange-500/30'
        } ${className}`}>
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-mono tracking-tight font-black">{pad(minutes)}:{pad(seconds)}</span>
          <span className="text-[10px] font-bold">נותרו פחות משעה! ⚡</span>
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-navy-900 border border-navy-800 text-gray-300 ${className}`}>
        <Timer className="w-3.5 h-3.5 text-orange-electric" />
        <span>ספירה לאחור:</span>
        <span className="font-mono text-white font-bold">
          {days > 0 ? `${days} ימים, ` : ''}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </div>
    );
  }

  // ==========================================
  // VARIANT: HERO (Top of Task Board Spotlight)
  // ==========================================
  if (variant === 'hero') {
    return (
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isLessThanOneHour
          ? 'bg-gradient-to-br from-red-950/80 via-orange-950/70 to-navy-950 border-orange-500/80 shadow-2xl shadow-orange-600/20 ring-2 ring-orange-500/40'
          : 'bg-gradient-to-br from-navy-900 via-navy-900 to-navy-950 border-navy-750 shadow-xl'
      } p-5 md:p-6 ${className}`}>
        {/* Glow ambient background effects for urgent state */}
        {isLessThanOneHour && (
          <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          {/* Right info block (RTL) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-electric/15 text-orange-electric border border-orange-electric/30">
                לוח זמנים לשטח
              </span>
              
              {isLessThanOneHour ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-600 text-white font-black text-xs animate-pulse shadow-md shadow-red-600/40">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>התראת שעת יציאה: נותרה פחות משעה! 🚨</span>
                </div>
              ) : isPast ? (
                <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                  שעת ההובלה הגיעה - בפעילות שטח 🚚
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>לפי לוח הזמנים המתוכנן</span>
                </span>
              )}
            </div>

            <h3 className="text-lg md:text-xl font-black text-white">
              {title || 'טיימר ספירה לאחור להובלה הבאה בלוח המשימות'}
            </h3>

            {(clientName || originAddress) && (
              <p className="text-xs text-gray-300 flex items-center gap-2 flex-wrap">
                {clientName && <span className="font-bold text-white">לקוח: {clientName}</span>}
                {originAddress && <span>| כתובת מוצא: {originAddress}</span>}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-electric" />
                <span>תאריך: <strong className="text-gray-200">{moveDate}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-electric" />
                <span>שעת יעד: <strong className="text-gray-200">{moveTime || '08:00'}</strong></span>
              </span>
            </div>
          </div>

          {/* Left countdown blocks display */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
            {isPast ? (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center">
                <span className="text-sm font-black text-amber-200 block">זמן ההובלה הגיע!</span>
                <span className="text-xs text-gray-300 block">צא לדרך או עדכן סטטוס בלוח המשימות</span>
              </div>
            ) : (
              <div className="flex items-center gap-2" dir="ltr">
                {days > 0 && (
                  <div className="flex flex-col items-center bg-navy-950/80 border border-navy-800 px-3 py-2 rounded-xl min-w-[55px]">
                    <span className="text-xl md:text-2xl font-black font-mono text-white">{pad(days)}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">ימים</span>
                  </div>
                )}
                
                <div className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[55px] border ${
                  isLessThanOneHour 
                    ? 'bg-red-950/80 border-red-500/80 text-red-200' 
                    : 'bg-navy-950/80 border-navy-800 text-white'
                }`}>
                  <span className={`text-xl md:text-2xl font-black font-mono ${isLessThanOneHour ? 'text-red-300' : 'text-orange-electric'}`}>
                    {pad(hours)}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">שעות</span>
                </div>

                <span className={`text-xl font-bold font-mono ${isLessThanOneHour ? 'text-red-400 animate-pulse' : 'text-gray-500'}`}>:</span>

                <div className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[55px] border ${
                  isLessThanOneHour 
                    ? 'bg-red-950/80 border-red-500/80 text-red-200 shadow-md shadow-red-500/20 animate-pulse' 
                    : 'bg-navy-950/80 border-navy-800 text-white'
                }`}>
                  <span className={`text-xl md:text-2xl font-black font-mono ${isLessThanOneHour ? 'text-amber-300' : 'text-white'}`}>
                    {pad(minutes)}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">דקות</span>
                </div>

                <span className={`text-xl font-bold font-mono ${isLessThanOneHour ? 'text-red-400 animate-pulse' : 'text-gray-500'}`}>:</span>

                <div className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[55px] border ${
                  isLessThanOneHour 
                    ? 'bg-orange-950/80 border-orange-500/80 text-orange-200' 
                    : 'bg-navy-950/80 border-navy-800 text-white'
                }`}>
                  <span className={`text-xl md:text-2xl font-black font-mono ${isLessThanOneHour ? 'text-amber-400' : 'text-gray-300'}`}>
                    {pad(seconds)}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">שניות</span>
                </div>
              </div>
            )}

            {/* Simulation toggle button for convenient testing */}
            {showSimulateToggle && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSimulatedOffsetMinutes(simulatedOffsetMinutes === null ? 45 : null)}
                  className="text-[10px] text-gray-400 hover:text-orange-electric bg-navy-950 hover:bg-navy-900 border border-navy-800 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-orange-electric" />
                  <span>{simulatedOffsetMinutes === null ? 'סמל < 1 שעה (45 דק׳)' : 'חזור לזמן אמת'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Colorful Alert banner when < 1 hour */}
        {isLessThanOneHour && (
          <div className="mt-4 pt-3 border-t border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-950/40 -mx-5 -mb-5 p-4 rounded-b-2xl border-t">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-red-400 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">
                  התראת יציאה מיידית לשטח! נותרו {minutes} דקות ו-{seconds} שניות בלבד.
                </span>
                <span className="text-[11px] text-red-300 block">
                  הנהג מתבקש לוודא ציוד קשירה, לצאת אל נקודת המוצא ולהפעיל ניווט Waze.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-black px-3 py-1 rounded-lg bg-red-600 text-white shadow-md animate-pulse shrink-0">
              צא לדרך עכשיו 🚚💨
            </span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VARIANT: BANNER (Full-width in job details)
  // ==========================================
  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-2xl border transition-all ${
        isLessThanOneHour
          ? 'bg-gradient-to-r from-red-950/70 via-orange-950/60 to-navy-900 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-500/10'
          : 'bg-navy-900 border-navy-800'
      } ${className}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isLessThanOneHour 
                ? 'bg-red-600/20 border-red-500 text-red-400 animate-pulse' 
                : 'bg-orange-electric/15 border-orange-electric/30 text-orange-electric'
            }`}>
              {isLessThanOneHour ? <Flame className="w-5 h-5 animate-bounce" /> : <Clock className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  {title || 'ספירה לאחור לשעת ההובלה המתוכננת'}
                </span>
                {isLessThanOneHour && (
                  <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                    פחות משעה! ⚡
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                מועד יעד: <strong>{moveDate}</strong> בשעה <strong>{moveTime || '08:00'}</strong>
              </span>
            </div>
          </div>

          {/* Time digits */}
          <div className="flex items-center gap-2 self-end sm:self-auto" dir="ltr">
            {isPast ? (
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                המועד המתוכנן הגיע 🚚
              </span>
            ) : (
              <div className={`px-3 py-1.5 rounded-xl border font-mono font-black text-sm md:text-base flex items-center gap-1.5 ${
                isLessThanOneHour 
                  ? 'bg-red-950 border-red-500 text-amber-300 shadow-md animate-pulse' 
                  : 'bg-navy-950 border-navy-800 text-white'
              }`}>
                <Timer className={`w-4 h-4 ${isLessThanOneHour ? 'text-red-400 animate-spin' : 'text-orange-electric'}`} />
                <span>
                  {days > 0 ? `${days}d ` : ''}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Urgent warning strip */}
        {isLessThanOneHour && (
          <div className="mt-3 pt-2.5 border-t border-red-500/30 flex items-center justify-between text-xs text-red-200">
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <span>התראה צבעונית: נותרו פחות מ-60 דקות! מומלץ לצאת לדרך מיידית.</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VARIANT: CARD (Default card for task feed items)
  // ==========================================
  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isLessThanOneHour
        ? 'bg-gradient-to-r from-red-950/60 to-orange-950/60 border-orange-500/70 shadow-md shadow-orange-500/10'
        : 'bg-navy-900/80 border-navy-800'
    } ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
          <Clock className={`w-3.5 h-3.5 ${isLessThanOneHour ? 'text-red-400' : 'text-orange-electric'}`} />
          <span>ספירה לאחור ליציאה:</span>
        </span>

        {isLessThanOneHour && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
            פחות משעה! 🚨
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2" dir="ltr">
        {isPast ? (
          <span className="text-xs font-bold text-amber-400" dir="rtl">
            שעת ההובלה הגיעה 🏁
          </span>
        ) : (
          <div className="flex items-center gap-1 font-mono font-bold text-xs">
            {days > 0 && <span className="text-gray-400">{days}d</span>}
            <span className={`px-1.5 py-0.5 rounded ${isLessThanOneHour ? 'bg-red-900/60 text-amber-300 font-black' : 'bg-navy-950 text-white'}`}>
              {pad(hours)}
            </span>
            <span className={isLessThanOneHour ? 'text-red-400' : 'text-gray-500'}>:</span>
            <span className={`px-1.5 py-0.5 rounded ${isLessThanOneHour ? 'bg-red-900/60 text-amber-300 font-black animate-pulse' : 'bg-navy-950 text-white'}`}>
              {pad(minutes)}
            </span>
            <span className={isLessThanOneHour ? 'text-red-400' : 'text-gray-500'}>:</span>
            <span className={`px-1.5 py-0.5 rounded ${isLessThanOneHour ? 'bg-red-900/60 text-amber-400 font-black' : 'bg-navy-950 text-gray-300'}`}>
              {pad(seconds)}
            </span>
          </div>
        )}

        <span className="text-[10px] text-gray-400" dir="rtl">
          {moveDate} ({moveTime || '08:00'})
        </span>
      </div>

      {isLessThanOneHour && (
        <div className="mt-2 pt-1.5 border-t border-red-500/30 text-[10px] font-bold text-red-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
          <span>התראה: נותרה פחות משעה לשעת ההובלה המתוכננת - צא לדרך!</span>
        </div>
      )}
    </div>
  );
}
