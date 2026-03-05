
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import Razorpay from 'razorpay';

/**
 * Server action to handle secure withdrawal approval.
 * Refactored to remove Stripe Payouts. This now atomically deducts the balance
 * and marks the transaction as completed in Firestore.
 */
export async function approveWithdrawalAction(txId: string, userId: string, amount: number) {
  const { db } = initializeFirebase();
  
  try {
    // 1. Atomic Firestore Transaction
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
      if (currentBalance < amount) throw new Error("User has insufficient funds for this payout");

      // 2. Commit Firestore changes
      transaction.update(userRef, {
        walletBalance: currentBalance - amount,
        lastActionAt: serverTimestamp()
      });

      transaction.update(txRef, {
        status: 'completed',
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        method: 'manual_or_razorpay'
      });

      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        userId: userId,
        action: 'WITHDRAWAL_APPROVED',
        details: `Approved payout of ₹${amount} to ${userId}`,
        severity: 'info',
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Approval Process Failed:', error);
    throw new Error(error.message || "Failed to process approval");
  }
}

/**
 * Server action to create a Razorpay order.
 * This ensures secret keys are never exposed to the client.
 */
export async function createRazorpayOrder(userId: string, amount: number) {
  const MIN_DEPOSIT = 100;
  
  if (!userId) throw new Error("Authentication required");
  if (amount < MIN_DEPOSIT) throw new Error(`Minimum deposit is ₹${MIN_DEPOSIT}`);

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Razorpay keys are not configured in environment variables.");
  }

  try {
    const razorpay = new Razorpay({ key_id, key_secret });

    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
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
    console.error('Razorpay Order Error:', error);
    throw new Error(error.message || "Failed to create payment order");
  }
}
