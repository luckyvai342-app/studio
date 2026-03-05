
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';

/**
 * joinMatch (Server Action)
 * Securely manages player join logic with atomic balance deduction and slot filling.
 */
export async function joinTournamentAction(tournamentId: string, userId: string) {
  const { db } = initializeFirebase();
  
  try {
    return await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const userRef = doc(db, 'users', userId);
      const participantRef = doc(db, 'tournaments', tournamentId, 'participants', userId);
      
      const [tourneySnap, userSnap, participantSnap] = await Promise.all([
        transaction.get(tourneyRef),
        transaction.get(userRef),
        transaction.get(participantRef)
      ]);

      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      if (!userSnap.exists()) throw new Error("User profile not found");
      
      const tourneyData = tourneySnap.data();
      const userData = userSnap.data();

      // 1. Validations
      if (participantSnap.exists()) throw new Error("You have already joined this battle");
      if (tourneyData.status !== 'open') throw new Error(`Tournament is currently ${tourneyData.status}`);
      if (tourneyData.joinedCount >= tourneyData.maxPlayers) throw new Error("This arena is already full");
      if (userData.walletBalance < tourneyData.entryFee) throw new Error("Insufficient wallet balance");
      if (!userData.gameUid || !userData.gameUsername) throw new Error("Please set your Battle ID in profile first");

      // 2. Atomically update balance
      transaction.update(userRef, {
        walletBalance: userData.walletBalance - tourneyData.entryFee,
        lastActionAt: serverTimestamp()
      });

      // 3. Update Tournament Slots
      const newJoinedCount = (tourneyData.joinedCount || 0) + 1;
      const newStatus = newJoinedCount >= tourneyData.maxPlayers ? 'full' : 'open';
      
      transaction.update(tourneyRef, {
        joinedCount: newJoinedCount,
        status: newStatus
      });

      // 4. Create Participant Record
      transaction.set(participantRef, {
        userId: userId,
        username: userData.username,
        gameUid: userData.gameUid,
        gameUsername: userData.gameUsername,
        kills: 0,
        joinedAt: serverTimestamp()
      });

      // 5. Create Transaction Record
      const txRef = doc(collection(db, 'users', userId, 'transactions'));
      transaction.set(txRef, {
        amount: tourneyData.entryFee,
        type: 'entry_fee',
        status: 'completed',
        referenceId: tournamentId,
        createdAt: new Date().toISOString()
      });

      // 6. Audit Log
      const logRef = doc(collection(db, 'audit_logs'));
      transaction.set(logRef, {
        userId: userId,
        action: 'JOIN_TOURNAMENT',
        details: `Joined ${tourneyData.title} (Status: ${newStatus})`,
        timestamp: serverTimestamp()
      });

      return { success: true, status: newStatus };
    });
  } catch (error: any) {
    console.error('[TOURNAMENT JOIN ERROR]', error);
    throw new Error(error.message || "Failed to join tournament");
  }
}
