/**
 * Truk Dealil IL — Security & Access Control Module
 * Zero-Trust, Constant-Time Comparison, State Machine Transitions, & PII Protection
 */

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
  | 'cancelled';

const FORBIDDEN_PASSWORDS = [
  '1983',
  '2026',
  'TrukDeal2026!',
  'TrukDealil_Master_Secured_Admin_2026!',
  'Rami1125',
  'admin'
];

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function safeEq(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length === 0 && bufB.length === 0) return true;
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Normalizes Israeli phone numbers to E.164 without '+' (e.g. 972501234567).
 */
export function normalizePhoneE164(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }
  if (clean.startsWith('0')) {
    clean = '972' + clean.slice(1);
  }
  return clean;
}

/**
 * Retrieves the configured admin password from environment.
 * Requires at least 8 characters.
 */
export function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.trim().length < 8) return '';
  return pw.trim();
}

/**
 * Constant-time admin password verification.
 * Fails closed on short/missing passwords and forbids known legacy passwords.
 */
export function verifyAdminPassword(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const cleanInput = input.trim();
  const configured = getAdminPassword();
  if (!configured || configured.length < 8) return false;

  for (const forbidden of FORBIDDEN_PASSWORDS) {
    if (safeEq(cleanInput, forbidden)) return false;
  }
  return safeEq(cleanInput, configured);
}

/**
 * Returns JWT secret with minimum length fallback.
 */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'truck-dealil-default-super-secret-key-32chars!';
}

/**
 * Returns shared payment webhook secret.
 */
export function getPaymentWebhookSecret(): string {
  return process.env.PAYMENT_WEBHOOK_SECRET || 'webhook-secret-123456';
}

/**
 * Evaluates whether PII (customer phone, full address, contact details) can be released.
 * Requires deposit payment, full payment, or institutional B2B billing approval.
 */
export function canReleasePII(move: any): boolean {
  if (!move) return false;
  const status = move.paymentStatus;
  if (status === 'paid_deposit' || status === 'paid_full') return true;
  if (move.clientApprovedForBilling === true) return true;
  if (move.isB2BApproved === true || move.b2bApproved === true) return true;
  return false;
}

/**
 * Governs state transitions of a move according to business & security rules.
 */
export function transition(
  move: any, 
  nextStatus: MoveStatus, 
  actor?: { role: string; id?: string }
): { success: boolean; error?: string } {
  if (!move) return { success: false, error: 'הובלה לא קיימת' };

  // Terminal states cannot be left by any role
  if (move.status === 'completed' || move.status === 'cancelled') {
    return { success: false, error: 'הובלה בסטטוס סופי לא ניתנת לשינוי' };
  }

  // Gating check: approved_for_driver requires deposit payment or billing approval
  if (nextStatus === 'approved_for_driver') {
    if (!canReleasePII(move)) {
      return { 
        success: false, 
        error: 'חסימת אבטחה: לא ניתן לשחרר הובלה לנהג ללא הפקדת מקדמה או אישור חיוב מוסדי' 
      };
    }
  }

  // Driver completion rule: only the assigned driver may mark completed
  if (nextStatus === 'completed' && actor?.role === 'driver') {
    if (!actor.id || !move.assignedDriverId || actor.id !== move.assignedDriverId) {
      return { 
        success: false, 
        error: 'רק הנהג המשובץ להובלה רשאי לסמן אותה כהושלמה' 
      };
    }
  }

  move.status = nextStatus;
  return { success: true };
}

/**
 * Masks PII and driver confidential information for non-admin viewers.
 * Does not mutate the source object.
 */
export function toPublicMove(move: any, viewerRole: string): any {
  if (!move) return null;
  const clone = JSON.parse(JSON.stringify(move));

  if (viewerRole === 'admin') {
    return clone;
  }

  // Remove internal notification logs from non-admin viewers
  delete clone.notificationsLog;

  // Mask driver phone numbers in bidding list for external/driver/client
  if (Array.isArray(clone.driverBids)) {
    clone.driverBids = clone.driverBids.map((b: any) => {
      const bidCopy = { ...b };
      delete bidCopy.driverPhone;
      return bidCopy;
    });
  }

  const isAssignedWithPII = viewerRole === 'assignedDriver' && canReleasePII(clone);

  // Mask customer PII if not permitted
  if (!isAssignedWithPII && viewerRole !== 'client') {
    clone.isPaymentLocked = !canReleasePII(clone);
    clone.clientPhone = '🔒 מוצג רק לאחר שיוך נהג והפקדת מקדמה';
    clone.clientEmail = '🔒 כתובת מייל נעולה';

    const firstName = (clone.clientName || '').split(' ')[0] || 'לקוח';
    clone.clientName = `${firstName} (שם מלא נעול 🔒)`;

    const originParts = (clone.originAddress || '').split(',');
    const originCity = originParts.length > 1 ? originParts[originParts.length - 1].trim() : clone.originAddress;
    clone.originAddress = `${originCity} (כתובת מדויקת נעולה עד להפקדת מקדמה 🔒)`;

    const destParts = (clone.destAddress || '').split(',');
    const destCity = destParts.length > 1 ? destParts[destParts.length - 1].trim() : clone.destAddress;
    clone.destAddress = `${destCity} (כתובת מדויקת נעולה עד להפקדת מקדמה 🔒)`;
  }

  return clone;
}

/**
 * In-memory OTP storage for driver phone verification.
 */
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  locked: boolean;
}

const otpStore = new Map<string, OtpRecord>();

export function generateOtp(phone: string): string {
  const norm = normalizePhoneE164(phone);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(norm, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
    locked: false
  });
  return code;
}

export function verifyOtp(phone: string, inputCode: string): boolean {
  if (!inputCode || typeof inputCode !== 'string' || !/^\d{6}$/.test(inputCode)) {
    return false;
  }
  const norm = normalizePhoneE164(phone);
  const entry = otpStore.get(norm);
  if (!entry) return false;
  if (entry.locked || Date.now() > entry.expiresAt) return false;

  if (entry.code === inputCode) {
    otpStore.delete(norm);
    return true;
  }

  entry.attempts += 1;
  if (entry.attempts >= 5) {
    entry.locked = true;
  }
  return false;
}

/**
 * Express Middleware: Zero-Trust Admin Authentication via JWT.
 * Does not accept raw admin passwords in headers.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers?.authorization || req.headers?.['x-admin-token'];
  if (!authHeader) {
    res.status(401).json({ error: 'חסר טוקן מנהל' });
    return;
  }

  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : String(authHeader).trim();

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any;
    if (decoded && decoded.role === 'admin') {
      (req as any).admin = decoded;
      return next();
    }
    res.status(403).json({ error: 'גישה נדחתה: נדרשת הרשאת מנהל' });
  } catch {
    res.status(401).json({ error: 'טוקן מנהל לא תקין או שפג תוקפו' });
  }
}

/**
 * Express Middleware: Driver Authentication via JWT.
 */
export function requireDriver(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers?.authorization || req.headers?.['x-driver-token'];
  if (!authHeader) {
    res.status(401).json({ error: 'חסר טוקן נהג' });
    return;
  }

  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : String(authHeader).trim();

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any;
    if (decoded && decoded.role === 'driver' && decoded.driverId) {
      (req as any).driver = decoded;
      return next();
    }
    res.status(403).json({ error: 'גישה נדחתה: נדרשת הרשאת נהג מאומת' });
  } catch {
    res.status(401).json({ error: 'טוקן נהג לא תקין' });
  }
}

/**
 * Express Middleware: Verifies payment webhook secret.
 * Rejects admin bypass or wrong secrets.
 */
export function requirePaymentWebhook(req: Request, res: Response, next: NextFunction): void {
  const secretHeader = req.headers?.['x-payment-webhook-secret'];
  if (!secretHeader || typeof secretHeader !== 'string') {
    res.status(403).json({ error: 'גישה נדחתה: חסר מפתח סודי של וובהוק תשלומים' });
    return;
  }

  const configured = getPaymentWebhookSecret();
  if (!safeEq(secretHeader.trim(), configured.trim())) {
    res.status(403).json({ error: 'מפתח סודי של וובהוק תשלומים שגוי' });
    return;
  }

  next();
}

/**
 * Resolves viewer role based on JWT token and move assignment.
 */
export function getViewerRole(req: Request, move?: any): string {
  const authHeader = req?.headers?.authorization || req?.headers?.['x-admin-token'] || req?.headers?.['x-driver-token'];
  if (!authHeader || typeof authHeader !== 'string') {
    return 'external';
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any;
    if (decoded?.role === 'admin') {
      return 'admin';
    }
    if (decoded?.role === 'driver') {
      if (move?.assignedDriverId && decoded.driverId === move.assignedDriverId) {
        return 'assignedDriver';
      }
      return 'driver';
    }
  } catch {
    // Non-JWT token / invalid signature
  }

  return 'external';
}

/**
 * Webhook allow-list validator:
 * Enforces HTTPS, strictly allowed domains (Google Apps Script, Make.com),
 * and rejects userinfo/credentials in URLs.
 */
export function isAllowedWebhookUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'script.google.com') return true;
    if (hostname === 'make.com' || hostname.endsWith('.make.com')) return true;

    return false;
  } catch {
    return false;
  }
}
