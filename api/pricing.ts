/**
 * Truk Dealil IL — Deterministic Pricing Engine (Server-Side)
 * Handles Heavy Freight & Cranes as well as Truk-Express Couriers.
 * Computations done strictly in agorot (integers) to prevent float rounding discrepancies.
 */

export type RouteType = 'spot' | 'b2b' | 'backhaul' | 'express_credit' | 'express_cod';

export const PLATFORM_FEES: Record<RouteType, number> = {
  spot: 0.15,          // 15% spot move
  b2b: 0.10,           // 10% regular business lines
  backhaul: 0.10,      // 10% backhaul match
  express_credit: 0.05,// 5% express digital/card
  express_cod: 0.08    // 8% express cash on delivery (deducted from wallet)
};

export const VAT_RATE = 0.18; // 18% standard Israeli VAT
export const FORMULA_VERSION = 'v2026.1';

export interface HeavyPricingResult {
  netCarrierAgorot: number;
  netCarrierIls: number;
  platformFeeAgorot: number;
  platformFeeIls: number;
  subtotalAgorot: number;
  subtotalIls: number;
  vatAgorot: number;
  vatIls: number;
  totalAgorot: number;
  totalIls: number;
  route: 'spot' | 'b2b' | 'backhaul';
  backhaulDiscountAgorot: number;
  formulaVersion: string;
}

export interface ExpressPricingResult {
  courierAgorot: number;
  courierIls: number;
  platformFeeAgorot: number;
  platformFeeIls: number;
  vatAgorot: number;
  vatIls: number;
  totalClientAgorot: number;
  totalClientIls: number;
  paymentMethod: 'card' | 'cash';
  feePercent: number;
  formulaVersion: string;
}

/**
 * Calculates Heavy freight pricing.
 * Final price = (Carrier net + platform fee) * (1 + VAT)
 * Matching Google Sheet:
 * Crane 30 ton = ₪900 carrier net -> ₪135 (15%) fee -> ₪1,035 subtotal -> ₪186.30 VAT -> ₪1,221.30 total
 */
export function priceHeavy(
  netAgorot: number, 
  route: 'spot' | 'b2b' | 'backhaul', 
  opts?: { backhaulDiscountPercent?: number }
): HeavyPricingResult {
  const cleanNet = Math.max(0, Math.round(netAgorot));
  const feeRate = PLATFORM_FEES[route];
  
  let effectiveNet = cleanNet;
  let discountAgorot = 0;
  
  if (route === 'backhaul') {
    const discountPct = (opts?.backhaulDiscountPercent ?? 20) / 100;
    discountAgorot = Math.round(cleanNet * discountPct);
    effectiveNet = Math.max(0, cleanNet - discountAgorot);
  }

  const feeAgorot = Math.round(effectiveNet * feeRate);
  const subtotalAgorot = effectiveNet + feeAgorot;
  const vatAgorot = Math.round(subtotalAgorot * VAT_RATE);
  const totalAgorot = subtotalAgorot + vatAgorot;

  return {
    netCarrierAgorot: effectiveNet,
    netCarrierIls: effectiveNet / 100,
    platformFeeAgorot: feeAgorot,
    platformFeeIls: feeAgorot / 100,
    subtotalAgorot,
    subtotalIls: subtotalAgorot / 100,
    vatAgorot,
    vatIls: vatAgorot / 100,
    totalAgorot,
    totalIls: totalAgorot / 100,
    route,
    backhaulDiscountAgorot: discountAgorot,
    formulaVersion: FORMULA_VERSION
  };
}

/**
 * Calculates Truk-Express pricing.
 * Payment method: 'card' -> 5% fee, 'cash' -> 8% fee.
 */
export function priceExpress(
  courierAgorot: number, 
  paymentMethod: 'card' | 'cash'
): ExpressPricingResult {
  const cleanCourier = Math.max(0, Math.round(courierAgorot));
  const feeRoute = paymentMethod === 'card' ? 'express_credit' : 'express_cod';
  const feeRate = PLATFORM_FEES[feeRoute];

  const feeAgorot = Math.round(cleanCourier * feeRate);
  const subtotalAgorot = cleanCourier + feeAgorot;
  const vatAgorot = Math.round(feeAgorot * VAT_RATE); // VAT on fee
  const totalAgorot = subtotalAgorot + vatAgorot;

  return {
    courierAgorot: cleanCourier,
    courierIls: cleanCourier / 100,
    platformFeeAgorot: feeAgorot,
    platformFeeIls: feeAgorot / 100,
    vatAgorot,
    vatIls: vatAgorot / 100,
    totalClientAgorot: totalAgorot,
    totalClientIls: totalAgorot / 100,
    paymentMethod,
    feePercent: feeRate * 100,
    formulaVersion: FORMULA_VERSION
  };
}

// Crane table base pricing (in ILS, converted to agorot internally)
export const CRANE_RATES: Record<string, { netIls: number; description: string }> = {
  'ladder_lift_floor_1_6': { netIls: 400, description: 'מנוף הרמה / סולם (קומות 1-6)' },
  'ladder_lift_floor_7_14': { netIls: 650, description: 'מנוף הרמה / סולם (קומות 7-14)' },
  'crane_30t': { netIls: 900, description: 'מנוף עוז משא 30 טון' },
  'crane_40t': { netIls: 1000, description: 'מנוף עוז משא 40 טון' },
  'crane_50t': { netIls: 1300, description: 'מנוף עוז משא 50 טון' },
  'crane_60t': { netIls: 1600, description: 'מנוף עוז משא 60 טון' },
  'crane_70t': { netIls: 1900, description: 'מנוף עוז משא 70 טון' },
  'crane_100t': { netIls: 2500, description: 'מנוף עוז משא 100 טון' },
  'crane_130t': { netIls: 3200, description: 'מנוף עוז משא 130 טון' },
  'crane_250t': { netIls: 6000, description: 'מנוף עוז משא 250 טון' },
  'crane_575t': { netIls: 12000, description: 'מנוף עוז משא 575 טון' },
};

// Base apartment move estimates
export const APARTMENT_BASE_RATES: Record<string, { minIls: number; maxIls: number }> = {
  '1_room': { minIls: 800, maxIls: 1200 },
  '2_rooms': { minIls: 1200, maxIls: 1800 },
  '3_rooms': { minIls: 1800, maxIls: 2600 },
  '4_rooms': { minIls: 2600, maxIls: 3600 },
  '5_rooms': { minIls: 3600, maxIls: 4800 },
  'office': { minIls: 2200, maxIls: 5500 },
  'single_item': { minIls: 250, maxIls: 550 }
};

export function estimateMoveCost(params: {
  rooms?: string;
  floor?: number;
  hasElevator?: boolean;
  craneNeeded?: boolean;
  distanceKm?: number;
}): { minIls: number; maxIls: number; breakdown: string[] } {
  const base = APARTMENT_BASE_RATES[params.rooms || '3_rooms'] || APARTMENT_BASE_RATES['3_rooms'];
  let min = base.minIls;
  let max = base.maxIls;
  const breakdown: string[] = [`בסיס דירה: ₪${min} - ₪${max}`];

  // Floor without elevator surcharge: +₪100 per floor above 2
  if (!params.hasElevator && params.floor && params.floor > 2) {
    const extraFloors = params.floor - 2;
    const extraCost = extraFloors * 100;
    min += extraCost;
    max += extraCost;
    breakdown.push(`תוספת קומה ${params.floor} ללא מעלית: +₪${extraCost}`);
  }

  // Crane addition
  if (params.craneNeeded) {
    const craneEstimate = 450;
    min += craneEstimate;
    max += craneEstimate;
    breakdown.push(`מנוף הרמה שעה ראשונה: +₪${craneEstimate}`);
  }

  // Distance addition (over 30 km)
  if (params.distanceKm && params.distanceKm > 30) {
    const extraKm = params.distanceKm - 30;
    const kmCost = Math.round(extraKm * 8); // ₪8 per km
    min += kmCost;
    max += kmCost;
    breakdown.push(`מרחק נסיעה עודף (${extraKm} ק"מ): +₪${kmCost}`);
  }

  return { minIls: min, maxIls: max, breakdown };
}

/* ======================================================================
   DETERMINISTIC CACHING & FAST LOOKUP TABLES
   ====================================================================== */

export interface CorridorRate {
  id: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  expressEnvelopeNetIls: number;
  expressParcelNetIls: number;
  expressVanNetIls: number;
  freightSmallNetIls: number;
  freightMediumNetIls: number;
  backhaulEligible: boolean;
}

export const STANDARD_CORRIDORS: Record<string, CorridorRate> = {
  'telaviv_jerusalem': {
    id: 'telaviv_jerusalem',
    fromCity: 'תל אביב',
    toCity: 'ירושלים',
    distanceKm: 65,
    expressEnvelopeNetIls: 80,
    expressParcelNetIls: 110,
    expressVanNetIls: 220,
    freightSmallNetIls: 1200,
    freightMediumNetIls: 2200,
    backhaulEligible: true
  },
  'telaviv_haifa': {
    id: 'telaviv_haifa',
    fromCity: 'תל אביב',
    toCity: 'חיפה',
    distanceKm: 95,
    expressEnvelopeNetIls: 95,
    expressParcelNetIls: 130,
    expressVanNetIls: 260,
    freightSmallNetIls: 1400,
    freightMediumNetIls: 2500,
    backhaulEligible: true
  },
  'telaviv_beersheba': {
    id: 'telaviv_beersheba',
    fromCity: 'תל אביב',
    toCity: 'באר שבע',
    distanceKm: 110,
    expressEnvelopeNetIls: 110,
    expressParcelNetIls: 150,
    expressVanNetIls: 300,
    freightSmallNetIls: 1600,
    freightMediumNetIls: 2800,
    backhaulEligible: true
  },
  'gush_dan_urban': {
    id: 'gush_dan_urban',
    fromCity: 'גוש דן',
    toCity: 'גוש דן',
    distanceKm: 10,
    expressEnvelopeNetIls: 50,
    expressParcelNetIls: 65,
    expressVanNetIls: 160,
    freightSmallNetIls: 800,
    freightMediumNetIls: 1800,
    backhaulEligible: false
  }
};

export const EXPRESS_LOOKUP_MATRIX = {
  envelope: {
    type: 'envelope',
    label: 'מעטפה משפטית / מסמכים דחופים',
    vehicle: 'קטנוע / אופנוע בלבד',
    urbanRange: '₪40 - ₪70',
    intercityRange: '₪80 - ₪120',
    typicalUrbanIls: 55,
    typicalIntercityIls: 95
  },
  parcel: {
    type: 'parcel',
    label: 'חבילה / 1-3 קרטונים / דוגמיות',
    vehicle: 'רכב פרטי / סטיישן',
    urbanRange: '₪50 - ₪80',
    intercityRange: '₪85 - ₪140',
    typicalUrbanIls: 65,
    typicalIntercityIls: 110
  },
  van: {
    type: 'van',
    label: 'ציוד משרדי / 4-10 קרטונים',
    vehicle: 'טנדר / מסחרית קטנה',
    urbanRange: '₪140 - ₪200',
    intercityRange: '₪220 - ₪350',
    typicalUrbanIls: 160,
    typicalIntercityIls: 260
  }
};

/**
 * Fast deterministic lookup matching before LLM invocation.
 */
export function matchDeterministicPricing(query: string, opts?: { paymentMethod?: 'card' | 'cash'; isBackhaul?: boolean }): {
  matched: boolean;
  track: 'express' | 'freight';
  scenarioCode?: string;
  vehicle: string;
  estimatedPrice: string;
  platformFee: string;
  notes: string;
  breakdown?: any;
  deliveryFlow?: any;
} | null {
  const q = query.toLowerCase();
  const paymentMethod = opts?.paymentMethod || (q.includes('מזומן') || q.includes('cod') ? 'cash' : 'card');
  const feePct = paymentMethod === 'card' ? 5 : 8;

  // Track A: Express Envelope (EXP_ENVELOPE_COURT)
  if (q.includes('מעטפה') || q.includes('משפטי') || q.includes('בית משפט') || q.includes('עו"ד') || q.includes('מסמכ') || q.includes('הוד השרון')) {
    const isCourtOrIntercity = q.includes('בית משפט') || q.includes('עו"ד') || q.includes('הוד השרון') || q.includes('חיפה') || q.includes('ירושלים') || q.includes('באר שבע');
    const baseNet = isCourtOrIntercity ? 110 : 80;
    const priced = priceExpress(baseNet * 100, paymentMethod);
    return {
      matched: true,
      track: 'express',
      scenarioCode: 'EXP_ENVELOPE_COURT',
      vehicle: 'קטנוע / אופנוע שליחויות בלבד (הגעה תוך 15-25 דק\')',
      estimatedPrice: `₪${priced.totalClientIls}`,
      platformFee: `${feePct}% (${paymentMethod === 'card' ? 'אשראי / Net 30' : 'מזומן COD 8%'})`,
      notes: isCourtOrIntercity ? 'מעטפה משפטית דחופה (מסירה אישית וחתימה)' : 'משלוח מעטפה מהיר',
      breakdown: priced,
      deliveryFlow: {
        requires_hand_delivery: true,
        requires_signature: true,
        allowed_payment_methods: ['cash_cod', 'credit_card', 'net_30'],
        suggested_fee_cash: 8.80,
        suggested_courier_net: 110.00
      }
    };
  }


  // Track A: Express Parcel 1-3 boxes
  if (q.includes('חבילה') || q.includes('קרטון') || q.includes('דוגמי') || q.includes('1-3') || q.includes('רכב פרטי')) {
    const isIntercity = q.includes('חיפה') || q.includes('ירושלים') || q.includes('באר שבע') || q.includes('צפון') || q.includes('דרום');
    const baseNet = isIntercity ? 110 : 65;
    const priced = priceExpress(baseNet * 100, paymentMethod);
    return {
      matched: true,
      track: 'express',
      vehicle: 'רכב פרטי / סטיישן (מתאים ל-1 עד 3 קרטונים)',
      estimatedPrice: `₪${priced.totalClientIls}`,
      platformFee: `${feePct}% (${paymentMethod === 'card' ? 'אשראי / Net 30' : 'מזומן COD'})`,
      notes: isIntercity ? 'משלוח חבילה בין-עירוני' : 'משלוח חבילה עירוני',
      breakdown: priced
    };
  }

  // Track A: Small Van 4-10 cartons
  if (q.includes('טנדר') || q.includes('4-10') || q.includes('מחשוב') || (q.includes('ציוד') && q.includes('משרד') && !q.includes('דירה'))) {
    const baseNet = 160;
    const priced = priceExpress(baseNet * 100, paymentMethod);
    return {
      matched: true,
      track: 'express',
      vehicle: 'טנדר / מסחרית קלה (4-10 קרטונים וציוד משרד)',
      estimatedPrice: `₪${priced.totalClientIls}`,
      platformFee: `${feePct}%`,
      notes: 'משלוח טנדר מהיר',
      breakdown: priced
    };
  }

  // Track B: Crane lookup
  if (q.includes('מנוף סולם') || q.includes('מנוף הרמה') || (q.includes('סולם') && q.includes('קומה'))) {
    const priced = priceHeavy(40000, opts?.isBackhaul ? 'backhaul' : 'spot');
    return {
      matched: true,
      track: 'freight',
      vehicle: 'מנוף הרמה סולם (קומות 1-18, עד 400 ק"ג)',
      estimatedPrice: `₪${priced.totalIls} לשעה ראשונה`,
      platformFee: opts?.isBackhaul ? '10% (Backhaul 20% הנחה)' : '15% ספוט',
      notes: 'כולל מנופאי מוסמך וביטוח צד ג\' מלא',
      breakdown: priced
    };
  }

  return null;
}

