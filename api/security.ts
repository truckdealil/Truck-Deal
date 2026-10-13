import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  verifyAdminPassword,
  getAdminPassword,
  requireAdmin,
  requireDriver,
  requirePaymentWebhook,
  getViewerRole,
  generateOtp,
  verifyOtp,
  transition,
  toPublicMove,
  isAllowedWebhookUrl
} from '../api/security.ts';

const ADMIN_PASSWORD = 'Str0ng-Admin-Pass-2026';
const JWT_SECRET = 'unit-test-jwt-secret-with-at-least-32-chars!!';

const mockRes = () => {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
};

const run = (mw: any, headers: Record<string, string>) => {
  const req: any = { headers };
  const res = mockRes();
  let called = false;
  mw(req, res, () => {
    called = true;
  });
  return { called, res, req };
};

const adminJwt = () => jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const driverJwt = (driverId = 'driver_1') =>
  jwt.sign({ role: 'driver', driverId, phone: '972501234567' }, JWT_SECRET, { expiresIn: '1h' });

describe('security.ts hardening', () => {
  beforeAll(() => {
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.PAYMENT_WEBHOOK_SECRET = 'webhook-secret-123456';
  });

  it('rejects every previously hardcoded admin password', () => {
    for (const old of ['1983', '2026', 'TrukDeal2026!', 'TrukDealil_Master_Secured_Admin_2026!', 'Rami1125', 'admin']) {
      expect(verifyAdminPassword(old)).toBe(false);
    }
    expect(verifyAdminPassword(ADMIN_PASSWORD)).toBe(true);
  });

  it('fails closed when ADMIN_PASSWORD is missing or too short', () => {
    const saved = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = '';
    expect(getAdminPassword()).toBe('');
    expect(verifyAdminPassword('')).toBe(false);
    process.env.ADMIN_PASSWORD = 'short';
    expect(verifyAdminPassword('short')).toBe(false);
    process.env.ADMIN_PASSWORD = saved;
  });

  it('does not accept the raw admin password as a bearer / header token', () => {
    expect(run(requireAdmin, { 'x-admin-token': ADMIN_PASSWORD }).called).toBe(false);
    expect(run(requireAdmin, { authorization: `Bearer ${ADMIN_PASSWORD}` }).called).toBe(false);
    expect(run(requireDriver, { 'x-admin-token': ADMIN_PASSWORD }).called).toBe(false);
    expect(getViewerRole({ headers: { 'x-admin-token': ADMIN_PASSWORD } } as any)).toBe('external');
  });

  it('accepts a valid admin JWT and rejects driver / forged / unsigned tokens for admin routes', () => {
    expect(run(requireAdmin, { authorization: `Bearer ${adminJwt()}` }).called).toBe(true);

    const asDriver = run(requireAdmin, { authorization: `Bearer ${driverJwt()}` });
    expect(asDriver.called).toBe(false);
    expect(asDriver.res.statusCode).toBe(403);

    const forged = jwt.sign({ role: 'admin' }, 'some-other-secret-that-is-long-enough-123');
    expect(run(requireAdmin, { authorization: `Bearer ${forged}` }).called).toBe(false);

    const unsigned = jwt.sign({ role: 'admin' }, '', { algorithm: 'none' } as any);
    expect(run(requireAdmin, { authorization: `Bearer ${unsigned}` }).called).toBe(false);

    expect(run(requireAdmin, {}).res.statusCode).toBe(401);
  });

  it('driver JWT without driverId is rejected; viewer role resolves assignedDriver correctly', () => {
    const noId = jwt.sign({ role: 'driver' }, JWT_SECRET);
    expect(run(requireDriver, { authorization: `Bearer ${noId}` }).called).toBe(false);

    const move = { assignedDriverId: 'driver_1' };
    const headers = { authorization: `Bearer ${driverJwt('driver_1')}` };
    expect(getViewerRole({ headers } as any, move)).toBe('assignedDriver');
    expect(getViewerRole({ headers: { authorization: `Bearer ${driverJwt('driver_2')}` } } as any, move)).toBe('driver');
  });

  it('payment webhook accepts only the shared secret (no admin override)', () => {
    expect(run(requirePaymentWebhook, { 'x-payment-webhook-secret': 'webhook-secret-123456' }).called).toBe(true);
    expect(run(requirePaymentWebhook, { 'x-payment-webhook-secret': 'wrong' }).called).toBe(false);
    expect(run(requirePaymentWebhook, { 'x-admin-token': ADMIN_PASSWORD }).called).toBe(false);
    expect(run(requirePaymentWebhook, { authorization: `Bearer ${adminJwt()}` }).called).toBe(false);
  });

  it('stateless OTP round-trips, rejects wrong codes, and locks after 5 attempts', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const phone = '972501110001';
      const code = generateOtp(phone);
      expect(code).toMatch(/^\d{6}$/);
      expect(verifyOtp(phone, code)).toBe(true);

      const lockPhone = '972501110002';
      const goodCode = generateOtp(lockPhone);
      const wrong = goodCode === '000000' ? '000001' : '000000';
      for (let i = 0; i < 5; i += 1) expect(verifyOtp(lockPhone, wrong)).toBe(false);
      expect(verifyOtp(lockPhone, goodCode)).toBe(false); // locked out

      expect(verifyOtp('972501110003', 'abc')).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('terminal statuses cannot be left, even by admin', () => {
    const done: any = { status: 'completed', paymentStatus: 'paid_full' };
    expect(transition(done, 'in_progress', { role: 'admin' }).success).toBe(false);
    expect(done.status).toBe('completed');

    const cancelled: any = { status: 'cancelled' };
    expect(transition(cancelled, 'new', { role: 'admin' }).success).toBe(false);
  });

  it('driver completion requires an id matching the assigned driver', () => {
    const base = { status: 'in_progress', assignedDriverId: 'driver_1' };
    expect(transition({ ...base }, 'completed', { role: 'driver' }).success).toBe(false);
    expect(transition({ ...base }, 'completed', { role: 'driver', id: 'driver_2' }).success).toBe(false);
    expect(transition({ ...base }, 'completed', { role: 'driver', id: 'driver_1' }).success).toBe(true);
  });

  it('approved_for_driver stays gated by payment even for admin', () => {
    const move: any = { status: 'approved', paymentStatus: 'pending_deposit' };
    expect(transition(move, 'approved_for_driver', { role: 'admin' }).success).toBe(false);
  });

  it('toPublicMove hides driver phones in bids from non-admins and never mutates the source', () => {
    const move: any = {
      status: 'bidding',
      clientName: 'ישראל ישראלי',
      clientPhone: '050-1234567',
      originAddress: 'רוטשילד 10, תל אביב',
      destAddress: 'ביאליק 4, רמת גן',
      driverBids: [{ id: 'bid_1', driverName: 'דני', driverPhone: '052-0000000', bidAmount: 900 }],
      notificationsLog: [{ id: 'n1' }]
    };

    const external = toPublicMove(move, 'external');
    expect(external.driverBids[0].driverPhone).toBeUndefined();
    expect(external.driverBids[0].bidAmount).toBe(900);
    expect(external.notificationsLog).toBeUndefined();
    expect(external.clientPhone).toContain('🔒');

    const admin = toPublicMove(move, 'admin');
    expect(admin.driverBids[0].driverPhone).toBe('052-0000000');
    expect(admin.clientPhone).toBe('050-1234567');

    expect(move.driverBids[0].driverPhone).toBe('052-0000000'); // source untouched
  });

  it('webhook allow-list: https only, known hosts only (eu2 allowed)', () => {
    expect(isAllowedWebhookUrl('https://hook.eu2.make.com/abc')).toBe(true);
    expect(isAllowedWebhookUrl('https://script.google.com/macros/s/x/exec')).toBe(true);
    expect(isAllowedWebhookUrl('http://hook.eu2.make.com/abc')).toBe(false);
    expect(isAllowedWebhookUrl('https://hook.eu2.make.com.evil.com/abc')).toBe(false);
    expect(isAllowedWebhookUrl('https://user:pw@hook.eu2.make.com/abc')).toBe(false);
    expect(isAllowedWebhookUrl('not a url')).toBe(false);
  });
});
