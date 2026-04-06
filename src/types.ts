export type GamblingType = 'pachinko' | 'pachislot' | 'horse-racing' | 'boat-racing' | 'bicycle-racing' | 'casino' | 'other';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  customId?: string; // LINE-like user ID
  privacySettings: {
    visibility: 'friends' | 'private';
  };
  notificationSettings?: {
    friendPosts: boolean;
  };
  createdAt: number;
}

export interface BalanceEntry {
  id: string;
  uid: string;
  date: string; // ISO 8601
  type: GamblingType;
  investment: number;
  return: number;
  balance: number;
  memo?: string;
  photoURL?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: number;
}

export interface Like {
  entryId: string;
  uid: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  entryId: string;
  uid: string;
  text: string;
  createdAt: number;
}
