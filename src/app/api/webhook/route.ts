
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amount = session.metadata?.amount;

      if (userId && amount) {
        console.log(`✅ Payment Succeeded for User: ${userId}, Amount: ${amount}`);
        
        /**
         * PRODUCTION NOTE:
         * To update the wallet balance securely, you must use the Firebase Admin SDK here.
         * Since we are in a client-focused prototype, you would implement:
         * 
         * await adminDb.doc(`users/${userId}`).update({
         *   walletBalance: adminFirestore.FieldValue.increment(Number(amount)),
         *   lastActionAt: adminFirestore.FieldValue.serverTimestamp()
         * });
         * 
         * await adminDb.collection(`users/${userId}/transactions`).add({
         *   amount: Number(amount),
         *   type: 'deposit',
         *   status: 'completed',
         *   createdAt: new Date().toISOString(),
         *   referenceId: session.id
         * });
         */
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
