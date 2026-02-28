
"use server"

import { revalidatePath } from 'next/cache';

// Simulation of a server-side database
// In a real app, these would interact with Firebase Admin SDK or Firestore REST API
let mockBalance = 500;

export async function getUserBalance() {
  // Simulating server fetch
  return mockBalance;
}

export async function joinTournamentAction(tournamentId: string, entryFee: number) {
  // Server-side check: Do not trust client balance
  if (mockBalance < entryFee) {
    return { success: false, message: 'Insufficient balance' };
  }

  // Deduct fee on server
  mockBalance -= entryFee;
  
  // Logic to add player to Firestore 'tournament_participants' would go here
  
  revalidatePath('/');
  revalidatePath('/wallet');
  revalidatePath('/tournaments');
  
  return { success: true, message: 'Joined successfully' };
}

export async function depositFundsAction(amount: number) {
  // Verification logic with payment gateway would happen here
  // For now, we simulate a successful deposit request
  return { success: true, message: 'Deposit request submitted for approval' };
}

export async function withdrawFundsAction(amount: number) {
  if (mockBalance < amount) {
    return { success: false, message: 'Insufficient balance' };
  }
  
  // Real logic: create a pending transaction in Firestore
  return { success: true, message: 'Withdrawal request submitted' };
}
