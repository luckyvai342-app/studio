
"use server"

import { initializeFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, getDocs, setDoc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Scoring helper based on official rules.
 */
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
      roomDistributed: false,
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
 * Distributes Room ID and Password to all participants and notifies them.
 */
export async function distributeRoomDetailsAction(tournamentId: string, adminId: string, roomId: string, roomPassword: string) {
  const { db } = initializeFirebase();

  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);

      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      const tourneyData = tourneySnap.data();

      // 1. Update Tournament credentials
      transaction.update(tourneyRef, {
        roomId,
        roomPassword,
        status: 'ongoing',
        roomDistributed: true,
        updatedAt: serverTimestamp()
      });

      // 2. Fetch all participants to send "push" (in-app notifications)
      const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
      const participantsSnap = await getDocs(participantsRef);

      participantsSnap.forEach((pDoc) => {
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: pDoc.id,
          title: "Match Room Details",
          message: `Your match "${tourneyData.title}" is starting! Room ID: ${roomId}, Password: ${roomPassword}. Enter now to secure your spot.`,
          matchId: tournamentId,
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      // 3. Audit Log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        adminId: adminId,
        action: 'DISTRIBUTE_ROOM_DETAILS',
        targetId: tournamentId,
        details: `Distributed Room ID ${roomId} to ${participantsSnap.size} warriors.`,
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('[ADMIN ERROR] Distribute Room Failed:', error);
    throw new Error(error.message);
  }
}

/**
 * Distributes prizes and updates leaderboards/global stats.
 */
export async function distributePrizesAction(tournamentId: string, adminId: string, results: { userId: string, kills: number, placement: number, prize: number }[]) {
  const { db } = initializeFirebase();
  
  try {
    await runTransaction(db, async (transaction) => {
      const tourneyRef = doc(db, 'tournaments', tournamentId);
      const tourneySnap = await transaction.get(tourneyRef);
      
      if (!tourneySnap.exists()) throw new Error("Tournament not found");
      if (tourneySnap.data().resultsUploaded) throw new Error("Prizes already distributed for this tournament");

      // Sort results by score to generate rank snapshot
      const calculatedResults = results.map(r => ({
        ...r,
        score: (r.kills * 2) + getPositionBonus(r.placement)
      })).sort((a, b) => b.score - a.score || a.placement - b.placement);

      for (let i = 0; i < calculatedResults.length; i++) {
        const res = calculatedResults[i];
        const rank = i + 1;

        // 1. Update Participant Record
        const participantRef = doc(db, 'tournaments', tournamentId, 'participants', res.userId);
        transaction.update(participantRef, {
          kills: res.kills,
          placement: res.placement,
          score: res.score,
          prizeWon: res.prize
        });

        // 2. Update User Wallet (if prize won)
        const userRef = doc(db, 'users', res.userId);
        const userSnap = await transaction.get(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (res.prize > 0) {
            transaction.update(userRef, {
              walletBalance: (userData.walletBalance || 0) + res.prize,
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

          // 3. Update Global Player Stats
          const statsRef = doc(db, 'playerStats', res.userId);
          const statsSnap = await transaction.get(statsRef);
          if (statsSnap.exists()) {
            const stats = statsSnap.data();
            transaction.update(statsRef, {
              totalMatches: stats.totalMatches + 1,
              totalKills: stats.totalKills + res.kills,
              totalWins: stats.totalWins + (res.placement === 1 ? 1 : 0),
              totalScore: stats.totalScore + res.score,
              updatedAt: new Date().toISOString()
            });
          } else {
            transaction.set(statsRef, {
              userId: res.userId,
              username: userData.username,
              totalMatches: 1,
              totalKills: res.kills,
              totalWins: res.placement === 1 ? 1 : 0,
              totalScore: res.score,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // 4. Create Leaderboard Snapshot
        const lbRef = doc(db, 'leaderboards', tournamentId, 'entries', res.userId);
        transaction.set(lbRef, {
          matchId: tournamentId,
          rank,
          userId: res.userId,
          username: (userSnap.exists() ? userSnap.data().username : 'Warrior'),
          kills: res.kills,
          score: res.score,
          position: res.placement,
          prizeWon: res.prize,
          generatedAt: new Date().toISOString()
        });
      }

      // 5. Finalize Tournament
      transaction.update(tourneyRef, {
        status: 'completed',
        resultsUploaded: true,
        updatedAt: serverTimestamp()
      });

      // Audit Log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        adminId: adminId,
        action: 'PRIZE_DISTRIBUTION',
        targetId: tournamentId,
        details: `Finalized results and prizes for ${results.length} players.`,
        timestamp: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('[PRIZE ERROR]', error);
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
