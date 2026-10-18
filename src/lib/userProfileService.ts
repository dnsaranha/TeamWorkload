import { auth, db, signInWithGoogle, logoutUser } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const userProfileService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const fbUser = auth.currentUser;
      if (fbUser) {
        // Try to fetch custom profile from Firestore
        try {
          const docRef = doc(db, "profiles", fbUser.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            return snap.data() as UserProfile;
          }
        } catch (e) {
          console.warn("Could not fetch profile from Firestore:", e);
        }

        // Return Firebase user details
        const now = new Date().toISOString();
        return {
          id: fbUser.uid,
          full_name: fbUser.displayName || "Usuário Google",
          email: fbUser.email || "",
          avatar_url: fbUser.photoURL || "",
          created_at: now,
          updated_at: now,
        };
      }

      // Check localStorage for offline demo user
      const saved = localStorage.getItem("crono_pulse_active_user");
      if (saved) {
        return JSON.parse(saved);
      }

      return {
        id: "demo-user-1",
        full_name: "Administrador da Equipe",
        email: "gestor@cronopulse.io",
        avatar_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  async updateProfile(
    updates: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    try {
      const fbUser = auth.currentUser;
      const current = await this.getCurrentUser();
      const updated: UserProfile = {
        id: fbUser?.uid || current?.id || "user-1",
        full_name: updates.full_name || current?.full_name || "Usuário",
        email: updates.email || current?.email || "",
        avatar_url: updates.avatar_url || current?.avatar_url || "",
        created_at: current?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (fbUser) {
        try {
          const docRef = doc(db, "profiles", fbUser.uid);
          await setDoc(docRef, updated, { merge: true });
        } catch (e) {
          console.warn("Error updating profile in Firestore:", e);
        }
      }

      localStorage.setItem("crono_pulse_active_user", JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  async loginWithGoogle(): Promise<UserProfile | null> {
    const user = await signInWithGoogle();
    if (!user) return null;
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: user.uid,
      full_name: user.displayName || "Usuário Google",
      email: user.email || "",
      avatar_url: user.photoURL || "",
      created_at: now,
      updated_at: now,
    };
    try {
      const docRef = doc(db, "profiles", user.uid);
      await setDoc(docRef, profile, { merge: true });
    } catch (e) {
      console.warn("Could not save profile doc in Firestore:", e);
    }
    localStorage.setItem("crono_pulse_active_user", JSON.stringify(profile));
    return profile;
  },

  async logout(): Promise<void> {
    await logoutUser();
    localStorage.removeItem("crono_pulse_active_user");
  },
};
