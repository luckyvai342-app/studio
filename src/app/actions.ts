
"use server"

import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { headers } from 'next/headers';

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
            unit_amount: amount * 100, // Stripe expects amounts in cents/paise
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

export async function joinTournamentAction(tournamentId: string, entryFee: number) {
  // Logic handled via client-side transaction in tournaments/[id]/page.tsx
  // This is kept as a stub for potential server-side secondary checks
  return { success: true };
}
