import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { tursoEnabled, tursoFindUser, tursoFindUserById, tursoCreateUser, tursoUpdatePassword } from "../db/turso";
import { migrateLocalDataToUser } from "../db/database";
import { generateSalt, hashPassword, verifyPassword } from "./crypto";

const SESSION_KEY = "zyrco-session";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; email?: string };
    if (parsed.id && parsed.email) return { id: parsed.id, email: parsed.email };
    return null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount (works offline too)
  useEffect(() => {
    const cached = readSession();
    setUser(cached);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();

    const tursoUser = await tursoFindUser(normalized);
    if (!tursoUser) throw new Error("auth.userNotFound");

    const valid = await verifyPassword(password, tursoUser.salt, tursoUser.password_hash);
    if (!valid) throw new Error("auth.wrongPassword");

    const authUser: AuthUser = { id: tursoUser.id, email: tursoUser.email };

    // Reassign any local anonymous data created before this login
    await migrateLocalDataToUser(authUser.id);

    saveSession(authUser);
    setUser(authUser);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();

    const existing = await tursoFindUser(normalized);
    if (existing) throw new Error("auth.emailTaken");

    const id   = crypto.randomUUID();
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    await tursoCreateUser(id, normalized, hash, salt);

    const authUser: AuthUser = { id, email: normalized };

    // Claim all existing local anonymous data for this new account
    await migrateLocalDataToUser(authUser.id);

    saveSession(authUser);
    setUser(authUser);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error("auth.notLoggedIn");
      if (newPassword.length < 6) throw new Error("auth.errorPasswordShort");

      const tursoUser = await tursoFindUserById(user.id);
      if (!tursoUser) throw new Error("auth.userNotFound");

      const valid = await verifyPassword(currentPassword, tursoUser.salt, tursoUser.password_hash);
      if (!valid) throw new Error("auth.wrongPassword");

      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);
      await tursoUpdatePassword(user.id, newHash, newSalt);
    },
    [user]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { tursoEnabled };
