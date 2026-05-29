export interface AuthProvider {
  getToken(): string | null;
  isAuthenticated(): boolean;
  onChange(cb: (token: string | null) => void): () => void;
}
