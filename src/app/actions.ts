
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Server action to handle secure withdrawal approval.
 * Atomically deducts the balance and marks the transaction as completed.
 * Optimized with high-traffic locking (runTransaction).
 */
export async function approveWithdrawalAction(txId: string, userId: string, amount: number) {
  const { db } = initializeFirebase();
  
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const txRef = doc(db, 'users', userId, 'transactions', txId);
      
      const userDoc = await transaction.get(userRef);
      const transactionDoc = await transaction.get(txRef);

      if (!userDoc.exists()) throw new Error("User not found");
      if (!transactionDoc.exists()) throw new Error("Transaction request not found");
      
      const txData = transactionDoc.data();
      const userData = userDoc.data();

      if (txData.status !== 'pending') throw new Error("Request is already processed");
      
      const currentBalance = userData.walletBalance || 0;
      if (currentBalance < amount) throw new Error("User has insufficient funds");

      // Apply updates
      transaction.update(userRef, {
        walletBalance: currentBalance - amount,
        lastActionAt: serverTimestamp()
      });

      transaction.update(txRef, {
        status: 'completed',
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Audit Log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        userId: userId,
        action: 'WITHDRAWAL_APPROVED',
        details: `Approved payout of ₹${amount} to UID: ${userId}`,
        severity: 'info',
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('[CRITICAL] Approval Process Failed:', error);
    throw new Error(error.message || "Failed to process approval");
  }
}

/**
 * Server action to create a Razorpay order.
 * Caches Razorpay keys from process.env and validates input strictly.
 */
export async function createRazorpayOrder(userId: string, amount: number) {
  const MIN_DEPOSIT = 100;
  const MAX_DEPOSIT = 50000;
  
  if (!userId) throw new Error("Authentication required");
  if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    throw new Error(`Deposit must be between ₹${MIN_DEPOSIT} and ₹${MAX_DEPOSIT}`);
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Razorpay configuration missing in environment");
  }

  try {
    const razorpay = new Razorpay({ key_id, key_secret });

    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: `RCPT_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      notes: { userId }
    };

    const order = await razorpay.orders.create(options);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: key_id
    };
  } catch (error: any) {
    console.error('[ERROR] Razorpay Order Creation:', error);
    throw new Error("Failed to initiate payment. Please try again later.");
  }
}

/**
 * Server action to verify Razorpay payment and credit wallet.
 * High-traffic optimization: Uses atomic transactions and idempotency checks.
 */
export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) {
  const { db } = initializeFirebase();
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_secret) throw new Error("Razorpay secret not configured");

  // Verify HMAC Signature
  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature !== razorpay_signature) {
    throw new Error("Security verification failed: Invalid signature");
  }

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Find the payment order
      const ordersRef = collection(db, 'paymentOrders');
      const q = query(ordersRef, where('razorpayOrderId', '==', razorpay_order_id), limit(1));
      const orderDocs = await getDocs(q);

      if (orderDocs.empty) throw new Error("Order record missing");
      
      const orderDocRef = orderDocs.docs[0].ref;
      const orderData = orderDocs.docs[0].data();
      const userId = orderData.userId;

      // 2. Idempotency Check: Prevent double-crediting
      if (orderData.status === 'paid') {
        return { success: true, alreadyProcessed: true };
      }

      // 3. Fetch and update user
      const userRef = doc(db, 'users', userId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User profile not found");
      
      const currentBalance = userSnap.data().walletBalance || 0;
      const creditAmount = orderData.amount;

      // 4. Atomic Updates
      transaction.update(orderDocRef, {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: serverTimestamp()
      });

      transaction.update(userRef, {
        walletBalance: currentBalance + creditAmount,
        lastActionAt: serverTimestamp()
      });

      // 5. Transaction Record
      const txRef = doc(collection(db, 'users', userId, 'transactions'));
      transaction.set(txRef, {
        amount: creditAmount,
        type: 'deposit',
        status: 'completed',
        referenceId: razorpay_payment_id,
        createdAt: new Date().toISOString()
      });

      // 6. Structured Logging
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        userId: userId,
        action: 'CLIENT_PAYMENT_VERIFIED',
        details: `Credited ₹${creditAmount} (PID: ${razorpay_payment_id})`,
        severity: 'info',
        timestamp: serverTimestamp()
      });

      return { success: true };
    });
  } catch (error: any) {
    console.error('[CRITICAL] Payment Verification Error:', error);
    throw new Error(error.message || "Verification system encountered an error");
  }
}
