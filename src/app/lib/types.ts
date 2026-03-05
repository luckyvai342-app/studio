
export type TournamentStatus = 'open' | 'full' | 'ongoing' | 'completed' | 'cancelled';
export type UserRole = 'user' | 'admin';

export interface Tournament {
  id: string;
  title: string;
  description: string;
  entryFee: number;
  totalPrize: number;
  status: TournamentStatus;
  startTime: string;
  maxPlayers: number;
  joinedCount: number;
  map: string;
  type: 'Solo' | 'Duo' | 'Squad';
  imageUrl: string;
  roomId?: string;
  roomPassword?: string;
  resultsUploaded?: boolean;
}

export interface User {
  uid: string;
  username: string;
  role: UserRole;
  gameUsername?: string;
  gameUid: string;
  gameRegion?: string;
  accountVerified: boolean;
  status: 'active' | 'suspended' | 'banned';
  phone: string;
  walletBalance: number;
  lastUidUpdate?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  referenceId?: string;
}

export interface Participant {
  id: string;
  userId: string;
  username: string;
  gameUid: string;
  gameUsername: string;
  kills: number;
  placement: number;
  score: number;
  prizeWon?: number;
  joinedAt: string;
}

export interface PlayerStats {
  userId: string;
  username: string;
  totalMatches: number;
  totalKills: number;
  totalWins: number;
  totalScore: number;
  updatedAt: string;
}
