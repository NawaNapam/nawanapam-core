import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { createZustandStorage } from "@/services/storage";
import { AUTH_STORAGE_KEY } from "@/platform/constants";

export interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

type PersistedAuthState = Pick<AuthState, "user" | "isAuthenticated">;

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,

        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          }),

        clearUser: () =>
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }),

        setLoading: (isLoading) => set({ isLoading }),

        updateUser: (updates) => {
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, ...updates } });
          }
        },
      }),
      {
        name: AUTH_STORAGE_KEY,
        storage: createZustandStorage<PersistedAuthState>(),
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);

// Helper function to sync NextAuth session with Zustand
export const syncAuthWithSession = (session: { user?: User } | null) => {
  const { setUser, clearUser } = useAuthStore.getState();

  if (session?.user) {
    setUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      username: session.user.username,
    });
  } else {
    clearUser();
  }
};

// Subscribe to auth changes for side effects (optional)
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    // console.log("Auth state changed:", isAuthenticated);
    return;
  }
);
