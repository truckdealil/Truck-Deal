import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../api/index.ts';
import { 
  safeEq, 
  normalizePhoneE164, 
  toPublicMove, 
  canReleasePII, 
  transition, 
  getAdminPassword,
  getPaymentWebhookSecret,
  getJwtSecret
} from '../api/security.ts';
import { priceHeavy, priceExpress, estimateMoveCost } from '../api/pricing.ts';
import jwt from 'jsonwebtoken';

describe('Stage 1 Security & Transition Rules', () => {

  it('1. safeEq performs constant-time string comparison', () => {
    expect(safeEq('abc', 'abc')).toBe(true);
    expect(safeEq('abc', 'abd')).toBe(false);
    expect(safeEq('abc', 'ab')).toBe(false);
    expect(safeEq('', '')).toBe(true);
  });

  it('2. normalizePhoneE164 normalizes Israeli phone numbers to E.164', () => {
    expect(normalizePhoneE164('050-1234567')).toBe('972501234567');
    expect(normalizePhoneE164('0528765432')).toBe('972528765432');
    expect(normalizePhoneE164('+972-54-123-4567')).toBe('972541234567');
  });

  it('3. Protected endpoints without admin token return 401 or 403', async () => {
    // DELETE /api/moves
    const delRes = await request(app).delete('/api/moves');
    expect([401, 403]).toContain(delRes.status);

    // GET /api/moves
    const movesRes = await request(app).get('/api/moves');
    expect([401, 403]).toContain(movesRes.status);

    // GET /api/leads
    const leadsRes = await request(app).get('/api/leads');
    expect([401, 403]).toContain(leadsRes.status);

    // POST /api/moves/clear-dummy
    const clearRes = await request(app).post('/api/moves/clear-dummy');
    expect([401, 403]).toContain(clearRes.status);
  });

  it('4. Payment Webhook header verification (requirePaymentWebhook)', async () => {
    // Test payment update with wrong secret
    const wrongRes = await request(app)
      .post('/api/moves/test-move/payment')
      .set('x-payment-webhook-secret', 'wrong_secret_123')
      .send({ paymentStatus: 'paid_deposit' });
    expect(wrongRes.status).toBe(403);

    // With correct secret (or test secret)
    const secret = getPaymentWebhookSecret();
    const correctRes = await request(app)
      .post('/api/moves/test-move/payment')
      .set('x-payment-webhook-secret', secret)
      .send({ paymentStatus: 'paid_deposit', transactionId: 'tx_123', amountPaid: 500 });
    // Returns 404 if move not found, but NOT 403 authorization failure!
    expect(correctRes.status).not.toBe(403);
  });

  it('5. Status transition and PII release gating (canReleasePII)', () => {
    const unpaidMove = {
      id: 'move_1',
      status: 'bidding',
      paymentStatus: 'pending_payment',
      clientApprovedForBilling: false
    };

    // Step 1: Transition from bidding to approved
    const approveTransition = transition(unpaidMove, 'approved', { role: 'system' });
    expect(approveTransition.success).toBe(true);
    expect(unpaidMove.status).toBe('approved');

    // Step 2: Attempting to transition from approved to approved_for_driver without payment fails gate
    const failTransition = transition(unpaidMove, 'approved_for_driver', { role: 'system' });
    expect(failTransition.success).toBe(false);
    expect(unpaidMove.status).toBe('approved');

    // Step 3: Once deposit is paid, canReleasePII becomes true and transition succeeds
    unpaidMove.paymentStatus = 'paid_deposit';
    expect(canReleasePII(unpaidMove)).toBe(true);

    const okTransition = transition(unpaidMove, 'approved_for_driver', { role: 'system' });
    expect(okTransition.success).toBe(true);
    expect(unpaidMove.status).toBe('approved_for_driver');
  });

  it('6. toPublicMove masks phone, email, and addresses for public / driver', () => {
    const rawMove = {
      id: 'TRK-100',
      clientName: 'ישראל ישראלי',
      clientPhone: '050-1234567',
      clientEmail: 'israel@example.com',
      originAddress: 'רוטשילד 10, תל אביב',
      destAddress: 'ביאליק 4, רמת גן',
      paymentStatus: 'pending_payment'
    };

    const publicView = toPublicMove(rawMove, 'driver');
    expect(publicView.clientPhone).toContain('🔒');
    expect(publicView.clientEmail).toContain('🔒');
    expect(publicView.clientName).toContain('ישראל');
    expect(publicView.clientName).toContain('נעול');
    expect(publicView.originAddress).toContain('נעולה');
    expect(publicView.originAddress).not.toContain('רוטשילד 10');
    expect(publicView.isPaymentLocked).toBe(true);
  });

  it('7. Driver login requires exact normalized phone match (rejects partial / "0")', async () => {
    const zeroRes = await request(app)
      .post('/api/drivers/login')
      .send({ phone: '0' });
    expect(zeroRes.status).toBe(400);

    const invalidRes = await request(app)
      .post('/api/drivers/login')
      .send({ phone: '05' });
    expect(invalidRes.status).toBe(400);
  });

  it('8. Stage 4 Pricing Engine arithmetic matches sheet and rates', () => {
    // 30 Ton Crane: 900 net -> 135 fee (15%) -> 1035 subtotal -> 186.30 VAT -> 1221.30 total
    const crane30t = priceHeavy(90000, 'spot');
    expect(crane30t.netCarrierIls).toBe(900);
    expect(crane30t.platformFeeIls).toBe(135);
    expect(crane30t.subtotalIls).toBe(1035);
    expect(crane30t.vatIls).toBe(186.3);
    expect(crane30t.totalIls).toBe(1221.3);

    // Express Card: 5% fee
    const expressCard = priceExpress(6000, 'card');
    expect(expressCard.feePercent).toBe(5);
    expect(expressCard.platformFeeIls).toBe(3);

    // Express Cash: 8% fee
    const expressCash = priceExpress(6000, 'cash');
    expect(expressCash.feePercent).toBe(8);
    expect(expressCash.platformFeeIls).toBe(4.8);
  });
});
