import React, { useState, useEffect } from 'react';
import { 
  Eye, Type, Contrast, Sun, Moon, RotateCcw, 
  HelpCircle, X, Check, FileText, Phone, Mail, Award, AlertCircle
} from 'lucide-react';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  // Accessibility states
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('truk_a11y_font_size');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('truk_a11y_high_contrast') === 'true';
  });
  const [grayscale, setGrayscale] = useState<boolean>(() => {
    return localStorage.getItem('truk_a11y_grayscale') === 'true';
  });
  const [readableFont, setReadableFont] = useState<boolean>(() => {
    return localStorage.getItem('truk_a11y_readable_font') === 'true';
  });
  const [highlightLinks, setHighlightLinks] = useState<boolean>(() => {
    return localStorage.getItem('truk_a11y_highlight_links') === 'true';
  });
  const [stopAnimations, setStopAnimations] = useState<boolean>(() => {
    return localStorage.getItem('truk_a11y_stop_animations') === 'true';
  });

  // Apply styles to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}%`;
    localStorage.setItem('truk_a11y_font_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('a11y-high-contrast');
    } else {
      root.classList.remove('a11y-high-contrast');
    }
    localStorage.setItem('truk_a11y_high_contrast', highContrast.toString());
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (grayscale) {
      root.classList.add('a11y-grayscale');
    } else {
      root.classList.remove('a11y-grayscale');
    }
    localStorage.setItem('truk_a11y_grayscale', grayscale.toString());
  }, [grayscale]);

  useEffect(() => {
    const root = document.documentElement;
    if (readableFont) {
      root.classList.add('a11y-readable-font');
    } else {
      root.classList.remove('a11y-readable-font');
    }
    localStorage.setItem('truk_a11y_readable_font', readableFont.toString());
  }, [readableFont]);

  useEffect(() => {
    const root = document.documentElement;
    if (highlightLinks) {
      root.classList.add('a11y-highlight-links');
    } else {
      root.classList.remove('a11y-highlight-links');
    }
    localStorage.setItem('truk_a11y_highlight_links', highlightLinks.toString());
  }, [highlightLinks]);

  useEffect(() => {
    const root = document.documentElement;
    if (stopAnimations) {
      root.classList.add('a11y-stop-animations');
    } else {
      root.classList.remove('a11y-stop-animations');
    }
    localStorage.setItem('truk_a11y_stop_animations', stopAnimations.toString());
  }, [stopAnimations]);

  const handleReset = () => {
    setFontSize(100);
    setHighContrast(false);
    setGrayscale(false);
    setReadableFont(false);
    setHighlightLinks(false);
    setStopAnimations(false);
    const root = document.documentElement;
    root.style.fontSize = '100%';
    root.classList.remove(
      'a11y-high-contrast',
      'a11y-grayscale',
      'a11y-readable-font',
      'a11y-highlight-links',
      'a11y-stop-animations'
    );
    localStorage.removeItem('truk_a11y_font_size');
    localStorage.removeItem('truk_a11y_high_contrast');
    localStorage.removeItem('truk_a11y_grayscale');
    localStorage.removeItem('truk_a11y_readable_font');
    localStorage.removeItem('truk_a11y_highlight_links');
    localStorage.removeItem('truk_a11y_stop_animations');
  };

  const hasActiveSettings = fontSize !== 100 || highContrast || grayscale || readableFont || highlightLinks || stopAnimations;

  return (
    <>
      {/* Floating Accessibility Button */}
      <div className="fixed bottom-6 left-6 z-40" dir="rtl">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer relative border-2 ${
            hasActiveSettings 
              ? 'bg-amber-500 border-white text-navy-950 scale-105 shadow-amber-500/40' 
              : 'bg-navy-900 hover:bg-navy-800 border-navy-700 text-amber-400 hover:scale-105'
          }`}
          title="תפריט נגישות (ת״י 5568 AA)"
          aria-label="פתח תפריט נגישות"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
            </svg>
          )}

          {hasActiveSettings && !isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-navy-950 rounded-full" />
          )}
        </button>
      </div>

      {/* Accessibility Drawer Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-22 left-6 z-50 w-80 sm:w-96 bg-navy-900 border-2 border-navy-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          dir="rtl"
          role="region"
          aria-label="תפריט התאמות נגישות"
        >
          {/* Header */}
          <div className="bg-navy-950 px-4 py-3 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                ♿
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm">התאמת נגישות</h4>
                <span className="text-[10px] text-amber-400 font-bold block leading-none">תקן ישראלי 5568 ברמת AA</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              aria-label="סגור תפריט"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Controls */}
          <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
            {/* Font size adjustment */}
            <div className="p-3 bg-navy-950/80 rounded-xl border border-navy-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-orange-electric" />
                  <span>גודל טקסט: {fontSize}%</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">(80% - 140%)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(prev => Math.max(80, prev - 10))}
                  disabled={fontSize <= 80}
                  className="flex-1 py-1.5 bg-navy-850 hover:bg-navy-800 disabled:opacity-40 border border-navy-750 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  הקטן A-
                </button>
                <button
                  onClick={() => setFontSize(100)}
                  className="px-3 py-1.5 bg-navy-850 hover:bg-navy-800 border border-navy-750 text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  100%
                </button>
                <button
                  onClick={() => setFontSize(prev => Math.min(140, prev + 10))}
                  disabled={fontSize >= 140}
                  className="flex-1 py-1.5 bg-navy-850 hover:bg-navy-800 disabled:opacity-40 border border-navy-750 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  הגדל A+
                </button>
              </div>
            </div>

            {/* Quick Toggle Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* High Contrast */}
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                  highContrast 
                    ? 'bg-amber-400 border-amber-300 text-black font-extrabold shadow-md' 
                    : 'bg-navy-950/80 border-navy-800 text-gray-300 hover:border-navy-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <Contrast className="w-4 h-4" />
                  {highContrast && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="text-xs font-bold leading-tight">
                  ניגודיות גבוהה
                  <span className="block text-[10px] opacity-80">צהוב על שחור</span>
                </div>
              </button>

              {/* Grayscale */}
              <button
                onClick={() => setGrayscale(!grayscale)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                  grayscale 
                    ? 'bg-gray-200 border-white text-black font-extrabold shadow-md' 
                    : 'bg-navy-950/80 border-navy-800 text-gray-300 hover:border-navy-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <Moon className="w-4 h-4" />
                  {grayscale && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="text-xs font-bold leading-tight">
                  גווני אפור
                  <span className="block text-[10px] opacity-80">ביטול צבעוניות</span>
                </div>
              </button>

              {/* Readable Font */}
              <button
                onClick={() => setReadableFont(!readableFont)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                  readableFont 
                    ? 'bg-blue-600 border-blue-400 text-white font-extrabold shadow-md' 
                    : 'bg-navy-950/80 border-navy-800 text-gray-300 hover:border-navy-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <Type className="w-4 h-4" />
                  {readableFont && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="text-xs font-bold leading-tight">
                  פונט קריא
                  <span className="block text-[10px] opacity-80">סריקה ברורה</span>
                </div>
              </button>

              {/* Highlight Links */}
              <button
                onClick={() => setHighlightLinks(!highlightLinks)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                  highlightLinks 
                    ? 'bg-emerald-600 border-emerald-400 text-white font-extrabold shadow-md' 
                    : 'bg-navy-950/80 border-navy-800 text-gray-300 hover:border-navy-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <Eye className="w-4 h-4" />
                  {highlightLinks && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="text-xs font-bold leading-tight">
                  הדגשת קישורים
                  <span className="block text-[10px] opacity-80">וקווי תחתון</span>
                </div>
              </button>
            </div>

            {/* Stop animations */}
            <button
              onClick={() => setStopAnimations(!stopAnimations)}
              className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                stopAnimations 
                  ? 'bg-purple-600 border-purple-400 text-white font-extrabold' 
                  : 'bg-navy-950/80 border-navy-800 text-gray-300 hover:border-navy-700'
              }`}
            >
              <div className="text-xs font-bold">
                עצירת תנועה והבהובים
                <span className="block text-[10px] opacity-75">ביטול אנימציות רצות</span>
              </div>
              {stopAnimations && <Check className="w-4 h-4" />}
            </button>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2 border-t border-navy-800">
              <button
                onClick={handleReset}
                disabled={!hasActiveSettings}
                className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>איפוס הגדרות</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowStatement(true);
                }}
                className="flex-1 py-2 px-3 bg-navy-950 hover:bg-navy-850 border border-navy-700 text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>הצהרת נגישות</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Statement Modal */}
      {showStatement && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm" dir="rtl">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-navy-950 p-4 sm:p-5 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
                  ♿
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">הצהרת נגישות רשמית</h3>
                  <p className="text-xs text-amber-400 font-bold">עמידה בתקן ישראלי ת"י 5568 (AA) ו-WCAG 2.1</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatement(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-gray-300 text-sm leading-relaxed">
              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  מחויבות החברה לנגישות דיגיטלית
                </h4>
                <p>
                  פלטפורמת "טראק דיל il" רואה חשיבות עליונה במתן שירות שוויוני, מכבד, נגיש ומקצועי לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנו פועלים לקידום הנגישות בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998 ותקנות הנגישות לשירותי אינטרנט.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-base">התאמות הנגישות שבוצעו באתר:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 pr-2">
                  <li>תמיכה מלאה בניווט באמצעות מקלדת (טאב, חיצים, מקש אנטר ו-Esc).</li>
                  <li>התאמה לקוראי מסך תקניים (NVDA, JAWS, VoiceOver) עם תגיות ARIA מפורטות.</li>
                  <li>יחסי ניגודיות גבוהים בין צבעי הטקסט לצבעי הרקע.</li>
                  <li>טקסטים חלופיים (Alt) לתמונות ותרשימים מהותיים.</li>
                  <li>סרגל נגישות צף המאפשר התאמה אישית של גודל גופן, צבעים וביטול אנימציות.</li>
                </ul>
              </section>

              <section className="p-4 bg-navy-950/90 border border-navy-800 rounded-xl space-y-2">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  פרטי רכז הנגישות ופניות הציבור
                </h4>
                <p className="text-xs text-gray-300">
                  אם נתקלתם בקושי בגלישה או שיש לכם הצעה לשיפור הנגישות, נשמח לעמוד לרשותכם:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="font-bold text-white">רכז נגישות:</span> מחלקת הנדסה ואבטחה
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-3.5 h-3.5 text-orange-electric" />
                    <span>אימייל: <span className="font-mono text-orange-electric">truck.dealil@gmail.com</span></span>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="bg-navy-950 p-4 border-t border-navy-800 flex justify-end">
              <button
                onClick={() => setShowStatement(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-navy-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                סגור הצהרה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
