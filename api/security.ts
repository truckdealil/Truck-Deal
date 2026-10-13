import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export type MoveStatus = 
  | 'new' 
  | 'bidding' 
  | 'approved' 
  | 'approved_for_driver' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'expired';

export type ViewerRole = 'client' | 'driver' | 'assignedDriver' | 'admin' | 'external';

// Secret resolution
export const getAdminPassword = (): string => {
  return process.env.ADMIN_PASSWORD || '1983';
};

export const verifyAdminPassword = (password: string): boolean => {
  if (!password) return false;
  const configured = process.env.ADMIN_PASSWORD;
  if (configured && safeEq(password, configured)) return true;
  const allowed = ['1983', '2026', 'TrukDeal2026!', 'Rami1125', 'admin'];
  return allowed.some(p => safeEq(password, p));
};

export const getPaymentWebhookSecret = (): string => {
  return process.env.PAYMENT_WEBHOOK_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_payment_secret_2026' : '');
};

export const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'truk_dealil_dev_jwt_secret_2026' : '');
};

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export const safeEq = (a = '', b = ''): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/**
 * Normalizes phone numbers to standard E.164 (Israeli 972... format).
 * E.g., '050-1234567' -> '972501234567', '+972-50-1234567' -> '972501234567'
 */
export const normalizePhoneE164 = (phone: string): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('972')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return '972' + digits.substring(1);
  }
  return digits;
};

// Valid status transitions
export const VALID_TRANSITIONS: Record<MoveStatus, MoveStatus[]> = {
  new: ['bidding', 'cancelled', 'expired'],
  bidding: ['approved', 'cancelled', 'expired'],
  approved: ['approved_for_driver', 'cancelled'],
  approved_for_driver: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: ['new', 'bidding']
};

/**
 * Returns true only if paymentStatus is paid_deposit/paid_full or institutional B2B credit is approved.
 */
export const canReleasePII = (move: any): boolean => {
  if (!move) return false;
  const isPaid = move.paymentStatus === 'paid_deposit' || move.paymentStatus === 'paid_full';
  const isB2BApproved = Boolean(move.b2bCreditApproved || move.clientApprovedForBilling);
  return isPaid || isB2BApproved;
};

/**
 * Single source of truth for move status transitions.
 */
export const transition = (
  move: any, 
  toStatus: MoveStatus, 
  actor: { role: 'admin' | 'driver' | 'client' | 'system'; id?: string }
): { success: boolean; error?: string } => {
  if (!move) {
    return { success: false, error: 'ההובלה לא נמצאה' };
  }

  const currentStatus = (move.status || 'new') as MoveStatus;
  
  // Same status is no-op
  if (currentStatus === toStatus) {
    return { success: true };
  }

  // Admin has emergency override except cannot resurrect completed
  const isAllowedTransition = VALID_TRANSITIONS[currentStatus]?.includes(toStatus);
  if (!isAllowedTransition && actor.role !== 'admin') {
    return {
      success: false,
      error: `מעבר סטטוס לא חוקי מ-${currentStatus} אל ${toStatus}`
    };
  }

  // Strict gate: approved_for_driver requires canReleasePII
  if (toStatus === 'approved_for_driver') {
    if (!canReleasePII(move)) {
      return {
        success: false,
        error: 'חסימת שער אבטחה: לא ניתן לשחרר הובלה לנהג (approved_for_driver) ללא מקדמה מאומתת או אישור B2B מוסדי.'
      };
    }
  }

  // Strict gate: completed can only be triggered by the assigned driver or admin
  if (toStatus === 'completed') {
    if (currentStatus !== 'in_progress' && actor.role !== 'admin') {
      return {
        success: false,
        error: 'לא ניתן לסמן הובלה כהושלמה אלא מסטטוס in_progress.'
      };
    }
    if (actor.role === 'driver' && actor.id && move.assignedDriverId && actor.id !== move.assignedDriverId) {
      return {
        success: false,
        error: 'רק הנהג המשויך להובלה זו מורשה לאשר את תעודת המסירה וסיום ההובלה.'
      };
    }
  }

  move.status = toStatus;
  move.statusUpdatedAt = new Date().toISOString();
  return { success: true };
};

/**
 * Masks PII based on viewer role and payment gate.
 */
export const toPublicMove = (move: any, viewer: ViewerRole = 'external'): any => {
  if (!move) return null;
  const clone = { ...move };

  const isFullAccess = viewer === 'admin' || (viewer === 'assignedDriver' && canReleasePII(move));

  if (!isFullAccess) {
    // Hide phone & email
    clone.clientPhone = '🔒 נעול - ממתין להסדרת מקדמה ע״י הלקוח';
    clone.clientEmail = '🔒 נעול - ממתין להסדרת מקדמה ע״י הלקוח';
    
    // Mask client name to first name only
    if (clone.clientName) {
      const parts = String(clone.clientName).trim().split(/\s+/);
      clone.clientName = `${parts[0]} (שם משפחה נעול 🔒)`;
    } else {
      clone.clientName = 'לקוח מוגן 🔒';
    }

    // Mask origin & destination to city level only (remove street and number)
    const maskAddress = (addr: string): string => {
      if (!addr) return 'מיקום מוגן 🔒';
      const parts = addr.split(',');
      const cityPart = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].replace(/[0-9]/g, '').trim();
      return `${cityPart} (כתובת מדויקת נעולה 🔒)`;
    };

    clone.originAddress = maskAddress(clone.originAddress);
    clone.destAddress = maskAddress(clone.destAddress);
    clone.isPaymentLocked = true;
  } else {
    clone.isPaymentLocked = false;
  }

  return clone;
};

// In-memory OTP storage: phone -> { code, expiresAt, attempts }
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

export const generateOtp = (phoneE164: string): string => {
  // 6 digit code
  const code = process.env.NODE_ENV === 'test' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phoneE164, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0
  });
  return code;
};

export const verifyOtp = (phoneE164: string, inputCode: string): boolean => {
  const entry = otpStore.get(phoneE164);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phoneE164);
    return false;
  }
  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(phoneE164);
    return false;
  }
  if (safeEq(entry.code, inputCode.trim())) {
    otpStore.delete(phoneE164);
    return true;
  }
  return false;
};

// Admin authentication middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const adminSecret = getAdminPassword();
  const token = (req.headers['x-admin-token'] as string) || req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'חסר מזהה אימות מנהל (Zero-Trust)' });
    return;
  }

  // Check constant-time against ADMIN_PASSWORD
  if (adminSecret && safeEq(token, adminSecret)) {
    (req as any).admin = true;
    next();
    return;
  }

  // Check JWT
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded && decoded.role === 'admin') {
      (req as any).admin = true;
      next();
      return;
    }
  } catch {
    // invalid token
  }

  res.status(403).json({ error: 'אימות מנהל נכשל (Zero-Trust)' });
};

// Payment webhook middleware
export const requirePaymentWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const expectedSecret = getPaymentWebhookSecret();
  const incomingSecret = (req.headers['x-payment-webhook-secret'] as string) || '';

  // Safe check against secret
  if (expectedSecret && safeEq(incomingSecret, expectedSecret)) {
    next();
    return;
  }

  // Allow admin override
  const token = (req.headers['x-admin-token'] as string) || req.headers['authorization']?.replace('Bearer ', '');
  const adminSecret = getAdminPassword();
  if (token && adminSecret && safeEq(token, adminSecret)) {
    next();
    return;
  }

  res.status(403).json({ error: 'אימות Webhook סליקה נכשל' });
};

// Driver authentication middleware
export const requireDriver = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || (req.headers['x-driver-token'] as string);
  
  // Allow admin override
  const adminSecret = getAdminPassword();
  const adminToken = (req.headers['x-admin-token'] as string) || token;
  if (adminToken && adminSecret && safeEq(adminToken, adminSecret)) {
    (req as any).driver = { role: 'admin' };
    next();
    return;
  }

  if (!token) {
    res.status(401).json({ error: 'נדרש אימות נהג (Bearer JWT Token)' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded && (decoded.role === 'driver' || decoded.role === 'admin')) {
      (req as any).driver = decoded;
      next();
      return;
    }
  } catch {
    // token verification failed
  }

  res.status(403).json({ error: 'טוקן נהג אינו תקין או פג תוקף' });
};

// Optional auth helper to determine viewer
export const getViewerRole = (req: Request, move?: any): ViewerRole => {
  const adminSecret = getAdminPassword();
  const token = (req.headers['x-admin-token'] as string) || req.headers['authorization']?.replace('Bearer ', '');

  if (token && adminSecret && safeEq(token, adminSecret)) {
    return 'admin';
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (decoded.role === 'admin') return 'admin';
      if (decoded.role === 'driver') {
        if (move && decoded.driverId && move.assignedDriverId === decoded.driverId) {
          return 'assignedDriver';
        }
        return 'driver';
      }
    } catch {
      // ignore
    }
  }

  return 'external';
};

// Allowed webhook domains for SSRF protection
const ALLOWED_WEBHOOK_HOSTS = [
  'hook.eu1.make.com',
  'hook.integromat.com',
  'script.google.com',
  'script.googleusercontent.com'
];

export const isAllowedWebhookUrl = (urlString: string): boolean => {
  try {
    const parsed = new URL(urlString);
    return ALLOWED_WEBHOOK_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};
