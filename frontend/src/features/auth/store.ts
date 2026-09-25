import { create } from "zustand";
import { api, setAccessToken } from "@/shared/api/client";
import type { User } from "@/shared/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (email, password) => {
    const { data } = await api.post("/auth/login/", { email, password });
    setAccessToken(data.access);
    set({ user: data.user, loading: false });
  },
  logout: async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      setAccessToken(null);
      set({ user: null, loading: false });
    }
  },
  fetchMe: async () => {
    try {
      const refresh = await api.post("/auth/refresh/");
      setAccessToken(refresh.data.access);
      const { data } = await api.get("/auth/me/");
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
