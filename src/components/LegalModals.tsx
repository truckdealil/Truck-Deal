import React from 'react';
import { ShieldCheck, Lock, FileText, X, Scale, AlertTriangle, CheckCircle, Database } from 'lucide-react';

export type LegalModalType = 'terms' | 'privacy' | 'security' | null;

interface LegalModalsProps {
  activeModal: LegalModalType;
  onClose: () => void;
}

export default function LegalModals({ activeModal, onClose }: LegalModalsProps) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm" dir="rtl">
      <div 
        className="bg-navy-900 border border-navy-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-navy-950/90 border-b border-navy-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-electric/10 border border-orange-electric/30 flex items-center justify-center text-orange-electric">
              {activeModal === 'terms' && <Scale className="w-5 h-5" />}
              {activeModal === 'privacy' && <Lock className="w-5 h-5" />}
              {activeModal === 'security' && <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {activeModal === 'terms' && 'תקנון תנאי שימוש והגבלת אחריות'}
                {activeModal === 'privacy' && 'מדיניות פרטיות ואבטחת מידע'}
                {activeModal === 'security' && 'מרכז שקיפות ואבטחת מידע (Security Center)'}
              </h3>
              <p className="text-xs text-gray-400">
                טראק דיל il (Truk Dealil IL) • מסמך משפטי מחייב ומעודכן ל-2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors cursor-pointer"
            aria-label="סגור חלונית"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-gray-300 text-sm leading-relaxed">
          {activeModal === 'terms' && (
            <>
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>
                  הבהרה משפטית קרדינלית: פלטפורמת "טראק דיל il" פועלת כזירת מסחר טכנולוגית וכסדרן לוגיסטי דיגיטלי בלבד. הפלטפורמה אינה חברת הובלות ואינה מעסיקה את המובילים כעובדים.
                </span>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. הגדרת השירות ומהות הפלטפורמה</h4>
                <p>
                  "טראק דיל il" (להלן: "החברה" או "הפלטפורמה") מפעילה מערכת התאמה, מכרזים הפוכים, סדרנות AI ומעקב לוגיסטי בין לקוחות (מזמיני שירות) לבין מובילים, שליחים ומפעילי מנופים עצמאיים בעלי רישיונות כחוק (להלן: "המובילים"). ההתקשרות לביצוע עבודת ההובלה או ההרמה נעשית במישרין בין הלקוח לבין המוביל העצמאי שנבחר.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. הגבלת אחריות מוחלטת (Limitation of Liability)</h4>
                <p>
                  החברה, מנהליה, עובדיה וספקיה אינם נושאים באחריות ישירה או עקיפה לכל נזק, אובדן, שבר, גניבה, קלקול, איחור, או עיכוב שייגרמו לתכולת המטען, לציוד, למבנה או לצד שלישי כלשהו במהלך או עקב ביצוע ההובלה, העמסתה, פריקתה או הרמתה באמצעות מנוף.
                </p>
                <p>
                  כל תביעה בגין נזק או ליקוי בעבודה תופנה אך ורק כלפי המוביל או מפעיל המנוף המבצע, הנושא במלוא האחריות המקצועית והנזיקית לפעולותיו ולצוותו.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">3. חובת ביטוח מעמס ואחריות מקצועית</h4>
                <p>
                  המובילים הרשומים בפלטפורמה מצהירים כי ברשותם פוליסת ביטוח סחורה בהעברה (ביטוח מעמס) בתוקף, רישיון רכב מתאים, תעודת מפעיל מנוף מוסמך ובדיקות בודק מוסמך תקופתיות. מומלץ ללקוח לוודא את פוליסת הביטוח של המוביל המבצע בעת הגעתו ובטרם העמסת ציוד יקר ערך.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">4. ביטולים ומדיניות שינויים</h4>
                <p>
                  ביטול הזמנה יתבצע בהתאם להוראות חוק הגנת הצרכן, התשמ"א-1981. ביטול פחות מ-24 שעות לפני מועד ההובלה המתוכנן עשוי לגרור דמי ביטול בשיעור המוסכם במפרט ההזמנה לכיסוי שריון כלי הרכב והצוות.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">5. סמכות שיפוט ייחודית</h4>
                <p>
                  על תנאי שימוש אלה יחולו אך ורק דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל מחלוקת או תובענה תהא נתונה לבתי המשפט המוסמכים במחוזות תל-אביב והמרכז בלבד.
                </p>
              </section>
            </>
          )}

          {activeModal === 'privacy' && (
            <>
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <span>
                  הגנה קפדנית על פרטיות המשתמשים בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017.
                </span>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. איסוף מידע ומטרות השימוש</h4>
                <p>
                  אנו אוספים אך ורק את המידע החיוני לצורך אפיונה, תמחורה וביצועה של ההובלה: שמות, מספרי טלפון ליצירת קשר, כתובות מוצא ויעד, פירוט תכולה וקבצי מדיה של הדירה (תמונות/סרטוני סיור). המידע משמש באופן בלעדי לתפעול המכרז ולשיגור הנהגים המתאימים.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. אבטחת פרטי זיהוי אישיים (PII Protection)</h4>
                <p>
                  הפלטפורמה מפעילה מנגנון מיסוך פרטי התקשרות וכתובות מלאות. פרטי הלקוח אינם נחשפים לנהגים המתחרים במכרז הציבורי, אלא מועברים למוביל הזוכה אך ורק לאחר אישור ההזמנה, קביעת המועד והסדרת המקדמה המאובטחת.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">3. מעקב מיקום GPS ושיתוף בזמן אמת</h4>
                <p>
                  מעקב ה-GPS בשידור חי מופעל אך ורק מרגע תחילת הנסיעה והשינוע של ההובלה ועד לסיום הפריקה המלאה של המטען. המערכת אינה עוקבת אחר מיקום המשתמשים או הנהגים מחוץ למסגרת זמני ההובלה הפעילה.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">4. איסור מכירת מידע לצדדים שלישיים</h4>
                <p>
                  החברה מתחייבת שלא למכור, להשכיר, להעביר או לסחור בפרטי לקוחות או נהגים לשום גורם מסחרי חיצוני או חברות פרסום צד שלישי.
                </p>
              </section>
            </>
          )}

          {activeModal === 'security' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-navy-950/80 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span>הצפנת SSL/TLS 256-bit בתקן בנקאי</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    כלל תעבורת הנתונים, פרטי ההזמנות והתשלומים מוצפנים מקצה לקצה בתקנים המחמירים ביותר.
                  </p>
                </div>

                <div className="p-3.5 bg-navy-950/80 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Database className="w-4 h-4" />
                    <span>סנכרון מאובטח ל-Google Drive</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    תמונות תכולה ומסמכי רישוי מאוחסנים בענן ארגוני מאובטח עם הרשאות גישה מנוטרות.
                  </p>
                </div>

                <div className="p-3.5 bg-navy-950/80 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>אימות דו-שלבי ובקרת גישה (RBAC)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    הפרדה קפדנית בין סביבת לקוחות, פורטל נהגים ודשבורד ניהול מוגן בקוד PIN.
                  </p>
                </div>

                <div className="p-3.5 bg-navy-950/80 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>תאימות לתקני SOC 2 ו-ISO 27001</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    ארכיטקטורת ענן מבוססת Google Cloud עם גיבויים שוטפים והגנת שרידות 99.99%.
                  </p>
                </div>
              </div>

              <section className="space-y-2 pt-2">
                <h4 className="font-bold text-white text-base">מדיניות דיווח על אירועי אבטחה</h4>
                <p>
                  צוות הסייבר והאבטחה של טראק דיל il עומד לרשותכם 24/7. בכל שאלה, חשש או דיווח בנושאי אבטחת מידע ופרטיות ניתן לפנות ישירות לכתובת: <span className="font-mono text-orange-electric font-bold">truck.dealil@gmail.com</span>
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-navy-950/90 border-t border-navy-800 p-4 flex justify-between items-center">
          <span className="text-xs text-gray-400 font-mono">Truk Dealil IL • Legal Engine v2.6</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-electric hover:bg-orange-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
          >
            אישור וסגירה
          </button>
        </div>
      </div>
    </div>
  );
}
