
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler optimized for high traffic and idempotency.
 * Handles payment.captured events with atomic transactions.
 */
export async function POST(req: Request) {
  const { db } = initializeFirebase();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
  }

  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[WEBHOOK WARNING] Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);
    const eventId = event.id;

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // START ATOMIC TRANSACTION
      await runTransaction(db, async (transaction) => {
        // Idempotency: Has this specific webhook event ID been processed?
        const eventRef = doc(db, 'webhook_events', eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists()) return; 

        // Find the original order
        const ordersRef = collection(db, 'paymentOrders');
        const q = query(ordersRef, where('razorpayOrderId', '==', orderId), limit(1));
        const orderDocs = await getDocs(q);

        if (orderDocs.empty) {
          throw new Error(`Order ${orderId} missing for PID: ${paymentId}`);
        }

        const orderDocSnap = orderDocs.docs[0];
        const orderData = orderDocSnap.data();
        const userId = orderData.userId;

        // Idempotency: Has this order already been credited?
        if (orderData.status === 'paid') return;

        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error(`User ${userId} missing`);

        const currentBalance = userSnap.data().walletBalance || 0;
        const creditAmount = orderData.amount;

        // EXECUTE ATOMIC BATCH
        transaction.set(eventRef, {
          eventId: eventId,
          processedAt: serverTimestamp()
        });

        transaction.update(orderDocSnap.ref, {
          status: 'paid',
          razorpayPaymentId: paymentId,
          updatedAt: serverTimestamp()
        });

        transaction.update(userRef, {
          walletBalance: currentBalance + creditAmount,
          lastActionAt: serverTimestamp()
        });

        const txRef = doc(collection(db, 'users', userId, 'transactions'));
        transaction.set(txRef, {
          amount: creditAmount,
          type: 'deposit',
          status: 'completed',
          referenceId: paymentId,
          createdAt: new Date().toISOString()
        });

        const auditRef = doc(collection(db, 'audit_logs'));
        transaction.set(auditRef, {
          userId: userId,
          action: 'WEBHOOK_PAYMENT_CAPTURED',
          details: `Credited ₹${creditAmount} via Webhook (PID: ${paymentId})`,
          severity: 'info',
          timestamp: serverTimestamp()
        });
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[WEBHOOK CRITICAL] ${err.message}`);
    return NextResponse.json({ error: 'Internal failure' }, { status: 500 });
  }
}
