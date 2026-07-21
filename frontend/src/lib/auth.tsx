"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api, { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, extractErrorMessage } from "./api";
import { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get(ACCESS_TOKEN_COOKIE);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        Cookies.remove(ACCESS_TOKEN_COOKIE);
        Cookies.remove(REFRESH_TOKEN_COOKIE);
      })
      .finally(() => setLoading(false));
  }, []);

  function persistSession(data: { access_token: string; refresh_token: string; user: User }) {
    Cookies.set(ACCESS_TOKEN_COOKIE, data.access_token, { expires: 1 });
    Cookies.set(REFRESH_TOKEN_COOKIE, data.refresh_token, { expires: 7 });
    setUser(data.user);
    router.push("/dashboard");
  }

  async function login(email: string, password: string) {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      persistSession(data);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  }

  async function signup(email: string, password: string) {
    try {
      const { data } = await api.post("/auth/signup", { email, password });
      persistSession(data);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  }

  function logout() {
    Cookies.remove(ACCESS_TOKEN_COOKIE);
    Cookies.remove(REFRESH_TOKEN_COOKIE);
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
