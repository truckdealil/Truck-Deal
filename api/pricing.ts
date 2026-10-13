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
