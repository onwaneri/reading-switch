export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  library: string[]; // Array of bookIds
}

export interface Session {
  userId: string;
  username: string;
  expiresAt: number;
}
