import { create } from "zustand";
import { AuthUserResponse } from "@repo/shared";
import { apiRequest } from "../lib/api";

interface AuthState {
  user: AuthUserResponse | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  isLoading: true,
  error: null,

  fetchMe: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await apiRequest<{ user: AuthUserResponse }>("/api/auth/me");
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, token: null, isLoading: false });
      localStorage.removeItem("access_token");
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{ user: AuthUserResponse; accessToken: string }>(
        "/api/auth/login",
        {
          method: "POST",
          data: { email, password },
        }
      );
      localStorage.setItem("access_token", data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, role = "STUDENT") => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{ user: AuthUserResponse; accessToken: string }>(
        "/api/auth/register",
        {
          method: "POST",
          data: { name, email, password, role },
        }
      );
      localStorage.setItem("access_token", data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("access_token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
