import { supabase } from "./supabaseClient";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      if (!profile) {
        return null;
      }

      return {
        ...profile,
        email: user.email || "",
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user");
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      return profile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  async createProfile(
    profileData: Omit<UserProfile, "id" | "created_at" | "updated_at">,
  ): Promise<UserProfile | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user");
      }

      const now = new Date().toISOString();
      const { data: profile, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          ...profileData,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        throw error;
      }

      return profile;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },
};
