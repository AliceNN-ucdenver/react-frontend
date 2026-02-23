export type UserRole = 'viewer' | 'reviewer' | 'admin';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  displayName: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}
