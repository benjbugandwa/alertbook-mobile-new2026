import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  organization: string;
  user_role: string;
  code_province: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
}));

export default useAuthStore;
