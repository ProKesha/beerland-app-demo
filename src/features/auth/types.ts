export interface AuthChallenge {
  id: string;
  phone: string;
  expiresAt: number;
  resendAvailableAt: number;
  remainingAttempts: number;
  resendCount: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  needsProfile: boolean;
  demo: true;
}
