
"use server"

import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
});

export async function createStripeCheckoutSession(amount: number, userId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  const headerList = await headers();
  const host = headerList.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Wallet Credits',
              description: `Top up for India X E-Sport Wallet`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${protocol}://${host}/wallet?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${protocol}://${host}/wallet`,
      metadata: {
        userId,
        amount: amount.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    throw new Error(error.message);
  }
}

/**
 * Server action to handle secure withdrawal approval with Stripe Payouts.
 */
export async function approveWithdrawalAction(txId: string, userId: string, amount: number) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  const { db } = initializeFirebase();
  
  try {
    let stripeTransferId = '';

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

      // 2. Trigger Stripe Transfer
      // Note: In production, 'destination' should be the user's connected Stripe Account ID stored in their profile.
      // We use a placeholder here or assume 'userData.stripeAccountId'.
      const destinationAccount = userData.stripeAccountId;
      
      if (!destinationAccount) {
        throw new Error("User has no connected Stripe account for payout.");
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: amount * 100, // Convert to paise
          currency: 'inr',
          destination: destinationAccount,
          metadata: {
            transactionId: txId,
            userId: userId
          }
        });
        stripeTransferId = transfer.id;
      } catch (stripeError: any) {
        console.error('Stripe Payout Error:', stripeError);
        throw new Error(`Stripe Transfer Failed: ${stripeError.message}`);
      }

      // 3. On Stripe Success, commit Firestore changes
      transaction.update(userRef, {
        walletBalance: currentBalance - amount,
        lastActionAt: serverTimestamp()
      });

      transaction.update(txRef, {
        status: 'completed',
        payoutId: stripeTransferId, // Store Stripe payout ID
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        userId: userId,
        action: 'WITHDRAWAL_PAID_STRIPE',
        details: `Paid ₹${amount} via Stripe (ID: ${stripeTransferId}) to ${userId}`,
        severity: 'info',
        timestamp: serverTimestamp()
      });
    });

    return { success: true, transferId: stripeTransferId };
  } catch (error: any) {
    console.error('Approval Process Failed:', error);
    throw new Error(error.message || "Failed to process approval");
  }
}
