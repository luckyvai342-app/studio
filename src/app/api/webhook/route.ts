
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler
 * Processes payment.captured events to credit user wallets.
 * Implements signature verification and idempotency checks.
 */
export async function POST(req: Request) {
  const { db } = initializeFirebase();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
  }

  try {
    // 1. Get raw body and signature
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 2. Verify Razorpay Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);
    const eventId = event.id;

    // 3. Process payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Atomic Transaction for Idempotency and Wallet Credit
      await runTransaction(db, async (transaction) => {
        // A. Check if event was already processed
        const eventRef = doc(db, 'webhook_events', eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists()) return; // Already processed

        // B. Find the original payment order
        const ordersRef = collection(db, 'paymentOrders');
        const q = query(ordersRef, where('razorpayOrderId', '==', orderId), limit(1));
        const orderDocs = await getDocs(q);

        if (orderDocs.empty) {
          throw new Error(`Order ${orderId} not found in database.`);
        }

        const orderDoc = orderDocs.docs[0];
        const orderData = orderDoc.data();
        const userId = orderData.userId;

        if (orderData.status === 'paid') return; // Already credited

        // C. Fetch User Profile
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error(`User ${userId} not found.`);
        }

        const currentBalance = userSnap.data().walletBalance || 0;
        const creditAmount = orderData.amount;

        // D. Commit Updates
        transaction.set(eventRef, {
          eventId: eventId,
          processedAt: serverTimestamp()
        });

        transaction.update(orderDoc.ref, {
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
    console.error(`Webhook Processing Error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
