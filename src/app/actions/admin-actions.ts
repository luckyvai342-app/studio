
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, setDoc, updateDoc, getDocs } from 'firebase/firestore';

function getPositionBonus(pos: number): number {
  if (pos === 1) return 12;
  if (pos === 2) return 9;
  if (pos === 3) return 7;
  if (pos === 4) return 5;
  if (pos === 5) return 4;
  if (pos >= 6 && pos <= 10) return 2;
  if (pos >= 11 && pos <= 20) return 1;
  return 0;
}

export async function createTournamentAction(adminId: string, tournamentData: any) {
  const { db } = initializeFirebase();
  try {
    const tournamentRef = doc(collection(db, 'tournaments'));
    const startTimeISO = new Date(tournamentData.startTime).toISOString();
    
    const newTournament = {
      ...tournamentData,
      id: tournamentRef.id,
      joinedCount: 0,
      status: 'open',
      resultsUploaded: false,
      roomDistributed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startTime: startTimeISO,
    };

    await setDoc(tournamentRef, newTournament);

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
    throw new Error(error.message);
  }
}

export async function distributePrizesAction(tournamentId: string, adminId: string, results: { userId: string, kills: number, placement: number, prize: number }[]) {
  const { db } = initializeFirebase();
  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);
      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      if (tourneySnap.data().resultsUploaded) throw new Error("Prizes already distributed");

      for (const res of results) {
        const score = (res.kills * 2) + getPositionBonus(res.placement);
        const participantRef = doc(db, 'tournaments', tournamentId, 'participants', res.userId);
        transaction.update(participantRef, {
          kills: res.kills,
          placement: res.placement,
          score: score,
          prizeWon: res.prize
        });

        const userRef = doc(db, 'users', res.userId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          transaction.update(userRef, {
            walletBalance: (userData.walletBalance || 0) + res.prize,
            matchesPlayed: (userData.matchesPlayed || 0) + 1,
            lastActionAt: serverTimestamp()
          });

          if (res.prize > 0) {
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
      }

      transaction.update(tourneyRef, {
        status: 'completed',
        resultsUploaded: true,
        updatedAt: serverTimestamp()
      });
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function distributeRoomDetailsAction(tournamentId: string, adminId: string, roomId: string, roomPassword: string) {
  const { db } = initializeFirebase();
  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      transaction.update(tourneyRef, {
        roomId,
        roomPassword,
        status: 'ongoing',
        roomDistributed: true,
        updatedAt: serverTimestamp()
      });

      const participantsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'participants'));
      participantsSnap.forEach((pDoc) => {
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: pDoc.id,
          title: "Battle Room Open!",
          message: `Join Match Room ID: ${roomId}. The war begins soon!`,
          matchId: tournamentId,
          read: false,
          createdAt: new Date().toISOString()
        });
      });
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function adjustUserWalletAction(adminId: string, userId: string, amount: number, reason: string) {
  const { db } = initializeFirebase();
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const newBalance = (userSnap.data().walletBalance || 0) + amount;
      transaction.update(userRef, {
        walletBalance: newBalance,
        lastActionAt: serverTimestamp()
      });
    });
    return { success: true };
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function toggleUserStatusAction(adminId: string, userId: string, newStatus: 'active' | 'suspended' | 'banned') {
  const { db } = initializeFirebase();
  try {
    await updateDoc(doc(db, 'users', userId), { status: newStatus });
    return { success: true };
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function cancelTournamentAction(tournamentId: string, adminId: string) {
  const { db } = initializeFirebase();
  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);
      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      const tourneyData = tourneySnap.data();

      const participantsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'participants'));
      for (const pDoc of participantsSnap.docs) {
        const userRef = doc(db, 'users', pDoc.id);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          transaction.update(userRef, {
            walletBalance: (userSnap.data().walletBalance || 0) + tourneyData.entryFee,
            lastActionAt: serverTimestamp()
          });
        }
      }
      transaction.update(tourneyRef, { status: 'cancelled', updatedAt: serverTimestamp() });
    });
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
