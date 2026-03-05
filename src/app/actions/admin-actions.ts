
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, getDocs, setDoc } from 'firebase/firestore';

/**
 * Creates a new tournament record.
 */
export async function createTournamentAction(adminId: string, tournamentData: any) {
  const { db } = initializeFirebase();
  
  try {
    const tournamentRef = doc(collection(db, 'tournaments'));
    const newTournament = {
      ...tournamentData,
      id: tournamentRef.id,
      joinedCount: 0,
      status: 'open',
      resultsUploaded: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startTime: new Date(tournamentData.startTime).toISOString(),
    };

    await setDoc(tournamentRef, newTournament);

    // Audit Log
    const auditRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditRef, {
      adminId: adminId,
      action: 'CREATE_TOURNAMENT',
      targetId: tournamentRef.id,
      details: `Created tournament: ${newTournament.title}`,
      timestamp: serverTimestamp()
    });

    return { success: true, id: tournamentRef.id };
  } catch (error: any) {
    console.error('[ADMIN ERROR] Create Tournament Failed:', error);
    throw new Error(error.message);
  }
}

/**
 * Distributes prizes for a tournament based on ranking and kills.
 */
export async function distributePrizesAction(tournamentId: string, adminId: string, results: { userId: string, prize: number }[]) {
  const { db } = initializeFirebase();
  
  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);
      
      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      if (tourneySnap.data().resultsUploaded) throw new Error("Prizes already distributed for this tournament");

      for (const res of results) {
        if (res.prize <= 0) continue;

        const userRef = doc(db, 'users', res.userId);
        const userSnap = await transaction.get(userRef);
        
        if (userSnap.exists()) {
          const currentBalance = userSnap.data().walletBalance || 0;
          
          transaction.update(userRef, {
            walletBalance: currentBalance + res.prize,
            lastActionAt: serverTimestamp()
          });

          const txRef = doc(collection(db, 'users', res.userId, 'transactions'));
          transaction.set(txRef, {
            amount: res.prize,
            type: 'prize',
            status: 'completed',
            referenceId: tournamentId,
            createdAt: new Date().toISOString()
          });
        }
      }

      transaction.update(tourneyRef, {
        status: 'completed',
        resultsUploaded: true,
        updatedAt: serverTimestamp()
      });

      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        adminId: adminId,
        action: 'PRIZE_DISTRIBUTION',
        targetId: tournamentId,
        details: `Distributed prizes to ${results.length} players.`,
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Cancels a tournament and refunds all entry fees.
 */
export async function refundTournamentAction(tournamentId: string, adminId: string) {
  const { db } = initializeFirebase();

  try {
    const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
    const participantsSnap = await getDocs(participantsRef);
    const tourneyRef = doc(db, 'tournaments', tournamentId);
    
    await runTransaction(db, async (transaction) => {
      const tDoc = await transaction.get(tourneyRef);
      if (!tDoc.exists()) throw new Error("Tournament not found");
      if (tDoc.data().status === 'cancelled') throw new Error("Tournament already cancelled");

      const entryFee = tDoc.data().entryFee;

      for (const pDoc of participantsSnap.docs) {
        const userId = pDoc.id;
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);

        if (userSnap.exists()) {
          transaction.update(userRef, {
            walletBalance: userSnap.data().walletBalance + entryFee,
            lastActionAt: serverTimestamp()
          });

          const txRef = doc(collection(db, 'users', userId, 'transactions'));
          transaction.set(txRef, {
            amount: entryFee,
            type: 'refund',
            status: 'completed',
            referenceId: tournamentId,
            createdAt: new Date().toISOString()
          });
        }
      }

      transaction.update(tourneyRef, { status: 'cancelled' });

      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        adminId: adminId,
        action: 'TOURNAMENT_REFUND',
        targetId: tournamentId,
        details: `Cancelled tournament and refunded fees.`,
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
