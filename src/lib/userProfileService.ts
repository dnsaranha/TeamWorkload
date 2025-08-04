import { supabase } from "./supabaseClient";
import Cookies from "js-cookie";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  google_calendar_connected: boolean;
  google_calendar_email?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

class UserProfileService {
  private readonly GOOGLE_TOKENS_KEY = "google_calendar_tokens";
  private readonly USER_PROFILE_KEY = "user_profile";

  // Get current user profile
  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      // First try to get from local storage
      const cachedProfile = localStorage.getItem(this.USER_PROFILE_KEY);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }

      // If not cached, create a default profile
      const defaultProfile: UserProfile = {
        id: "default-user",
        name: "User Name",
        email: "user@example.com",
        google_calendar_connected: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Cache the profile
      localStorage.setItem(
        this.USER_PROFILE_KEY,
        JSON.stringify(defaultProfile),
      );
      return defaultProfile;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }

  // Update user profile
  async updateProfile(
    updates: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    try {
      const currentProfile = await this.getCurrentProfile();
      if (!currentProfile) return null;

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Update local storage
      localStorage.setItem(
        this.USER_PROFILE_KEY,
        JSON.stringify(updatedProfile),
      );

      return updatedProfile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      return null;
    }
  }

  // Store Google Calendar tokens securely
  storeGoogleTokens(tokens: GoogleCalendarTokens): void {
    try {
      // Store in httpOnly cookie for security (simulated with secure cookie)
      Cookies.set(this.GOOGLE_TOKENS_KEY, JSON.stringify(tokens), {
        expires: 7, // 7 days
        secure: true,
        sameSite: "strict",
      });
    } catch (error) {
      console.error("Error storing Google tokens:", error);
    }
  }

  // Get Google Calendar tokens
  getGoogleTokens(): GoogleCalendarTokens | null {
    try {
      const tokens = Cookies.get(this.GOOGLE_TOKENS_KEY);
      if (!tokens) return null;

      const parsedTokens = JSON.parse(tokens);

      // Check if tokens are expired
      if (parsedTokens.expires_at && Date.now() >= parsedTokens.expires_at) {
        this.clearGoogleTokens();
        return null;
      }

      return parsedTokens;
    } catch (error) {
      console.error("Error getting Google tokens:", error);
      return null;
    }
  }

  // Clear Google Calendar tokens
  clearGoogleTokens(): void {
    try {
      Cookies.remove(this.GOOGLE_TOKENS_KEY);
    } catch (error) {
      console.error("Error clearing Google tokens:", error);
    }
  }

  // Check if Google Calendar is connected
  isGoogleCalendarConnected(): boolean {
    const tokens = this.getGoogleTokens();
    return tokens !== null;
  }

  // Disconnect Google Calendar
  async disconnectGoogleCalendar(): Promise<void> {
    try {
      this.clearGoogleTokens();
      await this.updateProfile({
        google_calendar_connected: false,
        google_calendar_email: undefined,
      });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
    }
  }
}

export const userProfileService = new UserProfileService();
