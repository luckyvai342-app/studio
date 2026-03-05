
export type TournamentStatus = 'open' | 'ongoing' | 'completed';

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
}

export interface User {
  uid: string;
  username: string;
  freeFireId: string;
  phone: string;
  walletBalance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  referenceId?: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
}

export interface Participant {
  userId: string;
  username: string;
  kills: number;
  damage: number;
  placement: number;
}
