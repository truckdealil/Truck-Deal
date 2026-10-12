import React from 'react';
import { 
  ShieldCheck, Truck, Sparkles, Award, Users, TrendingUp, 
  CheckCircle2, ArrowLeft, Building2, Zap, PhoneCall, Scale, Cpu, MapPin
} from 'lucide-react';

interface AboutUsPageProps {
  onNavigateToQuote: () => void;
  onNavigateToDriverRegister: () => void;
}

export default function AboutUsPage({ onNavigateToQuote, onNavigateToDriverRegister }: AboutUsPageProps) {
  const stats = [
    { label: 'הובלות ומנופים שבוצעו', value: '12,500+', icon: Truck, color: 'text-orange-electric' },
    { label: 'שביעות רצון לקוחות מאומתת', value: '99.4%', icon: Award, color: 'text-emerald-400' },
    { label: 'נהגים ומנופאים מורשים במאגר', value: '450+', icon: Users, color: 'text-blue-400' },
    { label: 'שקיפות מחירים ועמלה הוגנת', value: '100%', icon: ShieldCheck, color: 'text-amber-400' },
  ];

  const fleetCategories = [
    {
      title: 'משאיות סגורות 7.5–12 טון עם דופן הידראולית',
      subtitle: 'Box Trucks with Hydraulic Tail Lift',
      tag: 'דירות 3–5 חדרים ומשרדים',
      description: 'ארגז קשיח מרופד היטב עם רצועות עיגון, דופן הידראולית להעלאה בטוחה של פסנתרים, מקררים ומשטחים כבדים, וצוותי סבלות מיומנים.',
      specs: ['קיבולת: 35–55 קוב', 'עומס: עד 6,500 ק״ג', 'דופן הרמה: 1,000–1,500 ק״ג'],
      icon: '🚚',
      color: 'border-orange-500/40 bg-orange-500/5',
    },
    {
      title: 'מנופי הרמה חיצוניים ובמות סולם (קומות 1 עד 20)',
      subtitle: 'Furniture Ladder Lifts',
      tag: 'מרפסות ופתחים חיצוניים',
      description: 'מנופי סולם מתקדמים המותקנים על גבי רכבים ייעודיים. העלאת ספות, שולחנות ומכשירי חשמל ישירות למרפסת או חלון גדול ללא שריטות במדרגות.',
      specs: ['גובה הגעה: עד קומה 20 (60 מטר)', 'כושר הרמה: עד 350 ק״ג למחזור', 'מינימום סיכון למבנה'],
      icon: '🪜',
      color: 'border-emerald-500/40 bg-emerald-500/5',
    },
    {
      title: 'מנופי ענק וזרוע כבדה (צי עוז משא בע״מ 30T–575T)',
      subtitle: 'Heavy Knuckle Boom & Mobile Cranes',
      tag: 'תעשייה, תשתיות ומטענים כבדים',
      description: 'מענה הנדסי מורכב להנפת מכולות, כספות כבדות, משטחי ריצוף וברזל, גנרטורים, ויחידות מיזוג אוויר לגגות בליווי מנהל עבודה מוסמך.',
      specs: ['כושר הרמה: 30 עד 575 טון', 'זרועות ארוכות עד 100 מטר', 'עמידה בתקני בטיחות מחמירים'],
      icon: '🏗️',
      color: 'border-blue-500/40 bg-blue-500/5',
    },
    {
      title: 'שליחויות אקספרס וטנדרים (Truk-Express)',
      subtitle: 'Express Couriers & Pickups',
      tag: 'עורכי דין, עסקים ומסמכים דחופים',
      description: 'צי קטנועים, רכבים פרטיים וטנדרים לשינוע מהיר מהיום-להיום. מעטפות לבתי משפט, חבילות קטנות, דוגמיות וציוד משרדי בתמחור ישיר ועמלה של 5% בלבד.',
      specs: ['זמני הגעה: תוך 30–90 דקות', 'מעקב GPS חי מקצה לקצה', 'אבטחת מידע וסודיות'],
      icon: '⚡',
      color: 'border-purple-500/40 bg-purple-500/5',
    },
  ];

  return (
    <div className="py-8 sm:py-12 px-4 max-w-7xl mx-auto space-y-12 sm:space-y-16" dir="rtl">
      {/* Hero Section */}
      <div className="text-center space-y-5 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-electric/15 border border-orange-electric/30 text-orange-electric text-xs sm:text-sm font-bold shadow-sm">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>מהפכת השקיפות והטכנולוגיה בענף ההובלות וההרמה בישראל</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          המוח הלוגיסטי שמחבר אותך ישירות לנהגים, מנופים ושליחים
        </h1>

        <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
          פלטפורמת <span className="text-orange-electric font-bold">טראק דיל il</span> (Truk Dealil IL) הוקמה במטרה לפרק את מונופול פערי התיווך המנופחים בענף ההובלות. באמצעות אלגוריתמיקה מתקדמת, בינה מלאכותית ומכרזים הפוכים, אנו מאפשרים ללקוחות לקבל מחיר הוגן ולנהגים להרוויח ישירות — בשקיפות מלאה.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={onNavigateToQuote}
            className="px-6 py-3 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl transition-all shadow-lg hover:shadow-orange-electric/30 flex items-center gap-2 cursor-pointer"
          >
            <span>פתח מכרז הובלה או מנוף עכשיו</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToDriverRegister}
            className="px-6 py-3 bg-navy-900 hover:bg-navy-800 border border-emerald-500/40 text-emerald-400 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>הצטרפות נהגים ומנופאים לצי</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Stats Counter Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              className="bg-navy-900/90 border border-navy-800 p-5 rounded-2xl text-center space-y-2 shadow-xl hover:border-navy-700 transition-all group"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`text-2xl sm:text-4xl font-black ${stat.color} font-mono`}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-gray-300">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mission & Service Charter */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-900/95 to-navy-950 border border-navy-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        <div className="border-b border-navy-800 pb-5">
          <span className="text-xs font-bold text-orange-electric uppercase tracking-widest block mb-1">
            אמנת השירות והחזון
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            איך המערכת משנה את חוקי המשחק עבורך?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3 p-4 bg-navy-950/70 rounded-2xl border border-navy-800/80">
            <div className="w-10 h-10 rounded-xl bg-orange-electric/15 text-orange-electric flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base">ביטול פערי התיווך (No Middlemen)</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              במקום מתווכים שגוזרים 30%–40% מקופת ההובלה, טראק דיל il גובה עמלת מערכת שקופה של 5%–15% בלבד. הלקוח נהנה ממחיר נמוך והמוביל מקבל תמורה ראויה.
            </p>
          </div>

          <div className="space-y-3 p-4 bg-navy-950/70 rounded-2xl border border-navy-800/80">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base">סדרנות AI והתאמה חכמה</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              המנוע מנתח את נפח הדירה, הקומה, הצורך במנוף סולם ורדיוס הנסיעה, ומשדר את המכרז אך ורק לנהגים המחזיקים בציוד המדויק. אפס בזבוז זמן.
            </p>
          </div>

          <div className="space-y-3 p-4 bg-navy-950/70 rounded-2xl border border-navy-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base">שידוך נסיעות חזור ריקות (Backhauls)</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              נהג שחוזר ריק מחיפה לתל אביב יכול לקחת את המטען שלך בהנחה של 20%–30%. כך אנחנו חוסכים פליטות פחמן ומעניקים לך מחיר מנצח.
            </p>
          </div>
        </div>
      </div>

      {/* Fleet & Machinery Showcase */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-orange-electric uppercase tracking-widest block">
            טקסונומיית צי הרכבים והציוד
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            כלי הרכב והמנופים העומדים לרשותך 24/7
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            כל כלי הרכב מפוקחים, מבוטחים ועוברים בדיקות בטיחות תקופתיות בידי מהנדסים ובודקים מוסמכים.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {fleetCategories.map((fleet, idx) => (
            <div 
              key={idx}
              className={`p-6 rounded-3xl border bg-navy-900/90 shadow-xl flex flex-col justify-between space-y-4 hover:border-orange-electric/50 transition-all ${fleet.color}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{fleet.icon}</span>
                  <span className="px-3 py-1 rounded-full bg-navy-950/80 border border-navy-800 text-[11px] font-bold text-gray-300">
                    {fleet.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">{fleet.title}</h3>
                  <span className="text-xs text-orange-electric font-mono font-bold block">{fleet.subtitle}</span>
                </div>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {fleet.description}
                </p>
              </div>

              <div className="pt-3 border-t border-navy-800/80 flex flex-wrap gap-2">
                {fleet.specs.map((spec, sIdx) => (
                  <span 
                    key={sIdx}
                    className="px-2.5 py-1 bg-navy-950/90 border border-navy-800 rounded-lg text-[10px] text-gray-300 font-semibold"
                  >
                    ✓ {spec}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Trust Banner */}
      <div className="p-6 sm:p-8 bg-navy-900 border border-navy-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 text-center sm:text-right">
          <h3 className="text-xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>ביטחון, ביטוח מעמס והגנה על כספך</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            תשלום המקדמה מאובטח במערכת ומועבר למוביל אך ורק לאחר אישור שביעות רצון מלא בסיום העבודה.
          </p>
        </div>

        <button
          onClick={onNavigateToQuote}
          className="px-6 py-3 bg-orange-electric hover:bg-orange-hover text-white font-extrabold rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
        >
          התחל בהזמנה עכשיו
        </button>
      </div>
    </div>
  );
}
