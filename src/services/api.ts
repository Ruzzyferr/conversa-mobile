import axios, { AxiosInstance, AxiosError } from "axios";
import { Platform } from "react-native";
import { getToken, clearToken } from "./authStore";
import { router } from "expo-router";
import { ApiResponseError } from "./apiErrors";

// Determine API URL based on platform and environment
function getApiUrl(): string {
  // If explicitly set, use it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }


  // In production builds, fail fast instead of falling back to localhost,
  // which would silently break every request on a real device.
  if (!__DEV__) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set in this production build. " +
      "Set it in the EAS build profile env before releasing."
    );
  }

  // Default based on platform (mainly for development)
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return __DEV__ ? "http://10.0.2.2:4000" : "http://localhost:4000";
  } else if (Platform.OS === "ios") {
    // iOS simulator can use localhost
    return "http://localhost:4000";
  }

  // Web fallback
  return "http://localhost:4000";
}

export const API_URL = getApiUrl();

// Flag to prevent multiple logout redirects
let isLoggingOut = false;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        // Tells the server this build shows the AI consent sheet. Builds
        // without it (already in the stores) are never AI-consent gated,
        // otherwise their voice notes and language exam would break.
        "X-Client-Features": "ai-consent",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling - AUTO LOGOUT on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 429 Rate Limit - log and continue without breaking the app
        if (error.response?.status === 429) {
          console.warn("[API] 429 Rate limit hit - slowing down requests");
          // Don't throw, just log - the calling code should handle gracefully
        }

        if (error.response?.status === 401 && !isLoggingOut) {
          // Invalid session token - auto logout
          const errorData = error.response.data as any;
          const errorCode = errorData?.error?.code;

          // Only logout on UNAUTHORIZED code (not on login failures)
          if (errorCode === "UNAUTHORIZED" || errorData?.code === "UNAUTHORIZED") {
            console.warn("[API] 401 UNAUTHORIZED - Logging out automatically");
            isLoggingOut = true;

            try {
              // Same local cleanup as a manual logout: RevenueCat must not
              // stay logged in as this user for whoever signs in next.
              await clearLocalSession();
              // Use setTimeout to ensure we're not in a render cycle
              setTimeout(() => {
                router.replace("/(auth)/welcome");
                isLoggingOut = false;
              }, 100);
            } catch (e) {
              console.error("[API] Error during auto-logout:", e);
              isLoggingOut = false;
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async getHealth(): Promise<{ ok: boolean; name: string; timestamp?: string }> {
    const response = await this.client.get("/health");
    return response.data;
  }

  async getV1Health(): Promise<{ ok: boolean; name: string; timestamp?: string }> {
    const response = await this.client.get("/api/v1/health");
    return response.data;
  }

  /**
   * Requests a one-time code. The response is identical whether or not the
   * address already has an account — the server no longer returns a userId,
   * because doing so revealed which addresses were registered (and the
   * account is not created until the code is verified).
   */
  async loginEmail(email: string): Promise<{
    requiresCode: boolean;
    message?: string;
  }> {
    const response = await this.client.post("/api/v1/auth/login", { email });
    return response.data;
  }

  async sendCode(email?: string, phone?: string): Promise<{ message: string }> {
    const response = await this.client.post("/api/v1/auth/send-code", { email, phone });
    return response.data;
  }

  async verifyCode(
    code: string,
    email?: string,
    phone?: string
  ): Promise<{ userId: string; token: string }> {
    const response = await this.client.post("/api/v1/auth/verify-code", {
      code,
      email,
      phone,
    });
    return response.data;
  }

  async getMe(): Promise<{
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      isPremium: boolean;
      isVerified?: boolean;
      verificationStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
      verificationPose?: string | null;
      /** Why the last automatic check failed (e.g. "no_match"), when the server sends it. */
      verificationRejectReason?: string | null;
      /** AI data-sharing consent (contract 1). null = never asked. */
      aiConsent?: "granted" | "declined" | null;
      aiConsentAt?: string | null;
      createdAt: string;
    };
    profileExists: boolean;
    moderationWarning?: { reason: string; warnedAt: string } | null;
  }> {
    const response = await this.client.get("/api/v1/auth/me");
    return response.data;
  }

  // --- Profile verification (pose selfie) ---

  async startVerification(): Promise<{ pose: string }> {
    const response = await this.client.post("/api/v1/profiles/verification/start");
    return response.data;
  }

  async submitVerificationSelfie(imageUri: string): Promise<{ status: string }> {
    const token = await getToken();
    const formData = new FormData();

    let uri = imageUri;
    if (Platform.OS === "android" && !uri.startsWith("file://") && !uri.startsWith("http")) {
      uri = `file://${uri}`;
    }
    const match = /\.(\w+)$/.exec(uri);
    const ext = match ? match[1].toLowerCase() : "jpg";
    formData.append("selfie", {
      uri,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      name: `selfie.${ext}`,
    } as any);

    const response = await fetch(
      `${this.client.defaults.baseURL}/api/v1/profiles/verification/selfie`,
      {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: formData,
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiResponseError(response.status, errorText, "Verification upload failed");
    }
    return await response.json();
  }

  /** Records the AI data-sharing answer (contract 1). */
  async setAiConsent(granted: boolean): Promise<{ aiConsent: "granted" | "declined" | null }> {
    const response = await this.client.post("/api/v1/auth/me/ai-consent", { granted });
    return response.data?.data ?? response.data;
  }

  async ackModerationWarning(): Promise<void> {
    await this.client.post("/api/v1/auth/ack-warning");
  }

  /**
   * Ends the session server-side. Pass this device's push token so the
   * server stops sending this account's notifications to the device.
   * Call `clearLocalSession()` afterwards (also when this fails).
   */
  async logout(pushToken?: string | null): Promise<void> {
    await this.client.post(
      "/api/v1/auth/logout",
      pushToken ? { pushToken } : {}
    );
  }

  async deleteAccount(): Promise<void> {
    await this.client.delete("/api/v1/auth/me");
  }

  async getMyProfile(): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    country: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    interests?: string[];
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
    /** Grid-snapped coordinates the server stored (null when never shared). */
    lat?: number | null;
    lng?: number | null;
    track: "DATE" | "LANGUAGE";
    trackChangedAt: string | null;
    languageProofs?: Array<{
      language: string;
      role: "NATIVE" | "LEARNING";
      cefr: string | null;
    }>;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.get("/api/v1/profiles/me");
    return response.data;
  }

  async getUserProfile(userId: string): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
    track: "DATE" | "LANGUAGE";
    languageProofs?: Array<{
      language: string;
      role: "NATIVE" | "LEARNING";
      cefr: string | null;
    }>;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.get(`/api/v1/profiles/${userId}`);
    return response.data;
  }

  async upsertMyProfile(payload: {
    displayName: string;
    birthYear?: number;
    /** 1-12. Sent when birthYear is the youngest allowed year; server answers UNDER_18 if not yet 18. */
    birthMonth?: number;
    city?: string;
    /** ISO-3166 alpha-2, from the device reverse geocode. */
    country?: string;
    lat?: number;
    lng?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
    languagesNative?: string[];
    languagesPractice?: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    /**
     * Hat degisimi. Sunucu iki kapiyla koruyor: 30 gunluk bekleme
     * (TRACK_COOLDOWN) ve LANGUAGE'e gecerken en az bir gecerli dil
     * kaniti (PROOF_REQUIRED). Kayitta ilk secim bedava.
     */
    track?: "DATE" | "LANGUAGE";
    bio?: string;
    photos?: string[];
    interests?: string[];
  }): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    interests: string[];
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.put("/api/v1/profiles/me", payload);
    return response.data;
  }

  async getFeed(
    limit = 20,
    filters?: {
      maxDistanceKm?: number | null;
      languages?: string[];
      purpose?: "CONVERSATION" | "PRACTICE" | "COFFEE";
      culturalPreference?: "LOCAL" | "EUROPE" | "INTERNATIONAL";
      excludeCountries?: string[];
      verifiedOnly?: boolean;
      recentlyActive?: boolean;
      minPhotos?: number;
      // New filters
      nativeLanguages?: string[];
      targetLanguages?: string[];
      countries?: string[];
      gender?: "ALL" | "FEMALE" | "MALE" | "OTHER";
      ageRange?: [number, number];
      forceReshuffle?: boolean;
    }
  ): Promise<
    Array<{
      userId: string;
      distanceKm?: number;
      profile: {
        displayName: string;
        birthYear: number | null;
        city: string | null;
        purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
        bio: string | null;
        photos: string[];
        languagesNative: string[];
        languagesPractice: string[];
      };
    }>
  > {
    const params: any = { limit };

    // Only include filters that are explicitly set
    if (filters) {
      if (filters.maxDistanceKm !== undefined) {
        params.maxDistanceKm = filters.maxDistanceKm;
      }
      if (filters.languages && filters.languages.length > 0) {
        params.languages = filters.languages;
      }
      if (filters.purpose) {
        params.purpose = filters.purpose;
      }
      if (filters.culturalPreference) {
        params.culturalPreference = filters.culturalPreference;
      }
      if (filters.excludeCountries && filters.excludeCountries.length > 0) {
        params.excludeCountries = filters.excludeCountries;
      }
      if (filters.verifiedOnly !== undefined) {
        params.verifiedOnly = filters.verifiedOnly;
      }
      if (filters.recentlyActive !== undefined) {
        params.recentlyActive = filters.recentlyActive;
      }
      if (filters.minPhotos !== undefined) {
        params.minPhotos = filters.minPhotos;
      }
      // New filter params
      if (filters.nativeLanguages && filters.nativeLanguages.length > 0) {
        params.nativeLanguages = filters.nativeLanguages;
      }
      if (filters.targetLanguages && filters.targetLanguages.length > 0) {
        params.targetLanguages = filters.targetLanguages;
      }
      if (filters.countries && filters.countries.length > 0) {
        params.countries = filters.countries;
      }
      if (filters.gender && filters.gender !== "ALL") {
        params.gender = filters.gender;
      }
      if (filters.ageRange) {
        params.ageRange = filters.ageRange;
      }
      if (filters.forceReshuffle) {
        params.forceReshuffle = filters.forceReshuffle;
      }
    }

    const response = await this.client.get("/api/v1/discovery/feed", { params });
    return response.data;
  }

  async like(toUserId: string): Promise<{
    success: boolean;
    requestId: string;
    matched?: boolean;
    matchId?: string;
    conversationId?: string;
  }> {
    const response = await this.client.post("/api/v1/discovery/like", {
      toUserId,
    });
    return response.data;
  }

  async pass(toUserId: string): Promise<void> {
    await this.client.post("/api/v1/discovery/pass", { toUserId });
  }

  async favorite(toUserId: string, text: string): Promise<{
    success: boolean;
    requestId: string;
    messageId: string;
    directRemaining: number;
  }> {
    const response = await this.client.post("/api/v1/discovery/favorite", {
      toUserId,
      text,
    });
    return response.data;
  }

  async listMatches(): Promise<
    Array<{
      matchId: string;
      conversationId: string | null;
      otherUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
      };
      createdAt: string;
    }>
  > {
    const response = await this.client.get("/api/v1/matches");
    // Backend returns paginated response { items: [], nextCursor: ... }
    return response.data.items || [];
  }

  async getConversations(): Promise<
    Array<{
      conversationId: string | null;
      matchId: string;
      otherUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
      };
      created_at: string;
      lastMessage?: {
        text: string;
        audioUrl?: string | null;
        imageUrl?: string | null;
        createdAt: string;
        senderUserId: string;
      } | null;
      createdAt: string;
      unreadCount?: number;
    }>
  > {
    const response = await this.client.get("/api/v1/chat/conversations");
    return response.data;
  }

  async getUnreadMessageCount(): Promise<{ unreadCount: number }> {
    const response = await this.client.get("/api/v1/chat/unread-count");
    return response.data;
  }

  async markConversationAsRead(conversationId: string): Promise<{ success: boolean; markedAsRead: number }> {
    const response = await this.client.post(`/api/v1/chat/conversations/${conversationId}/read`);
    return response.data;
  }

  async getConversationDetails(conversationId: string): Promise<{
    conversationId: string;
    matchId: string | null;
    otherUser: {
      userId: string;
      displayName: string;
      photos: string[];
      city: string | null;
      gender?: "MALE" | "FEMALE" | "OTHER" | null;
    };
    currentUserGender?: "MALE" | "FEMALE" | "OTHER" | null;
    firstMessage: {
      id: string;
      text: string;
      createdAt: string;
    } | null;
    hasMessages?: boolean;
    createdAt: string;
  }> {
    const response = await this.client.get(`/api/v1/chat/conversations/${conversationId}`);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      conversationId: string;
      senderUserId: string;
      text: string;
      createdAt: string;
    }>
  > {
    const page = await this.getMessagesPage(conversationId, { limit });
    return page.messages;
  }

  /**
   * One page of messages, chronological. `before` = id of the oldest message
   * already shown, to load older history. Reads `hasMore` from the body
   * (`{ messages, hasMore }`) or a `x-has-more` header; a bare array without
   * either is treated as "more if the page was full".
   */
  async getMessagesPage(
    conversationId: string,
    options: { before?: string; limit?: number } = {}
  ): Promise<{
    messages: Array<{
      id: string;
      conversationId: string;
      senderUserId: string;
      text: string;
      audioUrl?: string | null;
      imageUrl?: string | null;
      createdAt: string;
    }>;
    hasMore: boolean;
  }> {
    const limit = options.limit ?? 50;
    const params: Record<string, string | number> = { limit };
    if (options.before) params.before = options.before;
    const response = await this.client.get(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { params }
    );
    const data = response.data;
    const messages = Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
        ? data.messages
        : [];
    let hasMore: boolean;
    if (data && !Array.isArray(data) && typeof data.hasMore === "boolean") {
      hasMore = data.hasMore;
    } else {
      const header = response.headers?.["x-has-more"];
      hasMore = header !== undefined ? String(header) === "true" : messages.length >= limit;
    }
    return { messages, hasMore };
  }

  async sendMessage(
    conversationId: string,
    text: string
  ): Promise<{
    id: string;
    conversationId: string;
    senderUserId: string;
    text: string;
    audioUrl?: string;
    createdAt: string;
  }> {
    const response = await this.client.post(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { text }
    );
    return response.data;
  }

  async sendAudioMessage(
    conversationId: string,
    audioUri: string
  ): Promise<{
    id: string;
    conversationId: string;
    senderUserId: string;
    text?: string;
    audioUrl: string;
    createdAt: string;
  }> {
    // Use fetch instead of axios for reliable file uploads in React Native
    const token = await getToken();
    const formData = new FormData();

    // Ensure URI is correct for Android
    let uri = audioUri;
    if (Platform.OS === "android" && !uri.startsWith("file://")) {
      uri = `file://${uri}`;
    }

    formData.append("audio", {
      uri: uri,
      type: "audio/m4a",
      name: "audio.m4a",
    } as any);

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/api/v1/chat/conversations/${conversationId}/messages/audio`, {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "X-Client-Features": "ai-consent",
          // Do NOT set Content-Type header, let fetch handle the boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiResponseError(response.status, errorText, "Upload failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Audio upload error details:", error);
      throw error;
    }
  }

  async sendImageMessage(
    conversationId: string,
    imageUri: string
  ): Promise<{
    id: string;
    conversationId: string;
    senderUserId: string;
    text?: string;
    imageUrl: string;
    createdAt: string;
  }> {
    const token = await getToken();
    const formData = new FormData();

    let uri = imageUri;
    if (Platform.OS === "android" && !uri.startsWith("file://") && !uri.startsWith("http")) {
      uri = `file://${uri}`;
    }

    const match = /\.(\w+)$/.exec(uri);
    const ext = match ? match[1].toLowerCase() : "jpg";
    formData.append("image", {
      uri,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      name: `photo.${ext}`,
    } as any);

    const response = await fetch(
      `${this.client.defaults.baseURL}/api/v1/chat/conversations/${conversationId}/messages/image`,
      {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          // Do NOT set Content-Type, let fetch add the multipart boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiResponseError(response.status, errorText, "Upload failed");
    }

    return await response.json();
  }

  async uploadPhoto(photoUri: string): Promise<string> {
    const token = await getToken();
    const formData = new FormData();

    let uri = photoUri;
    // Android fix for file:// prefix
    if (Platform.OS === "android" && !uri.startsWith("file://") && !uri.startsWith("http")) {
      uri = `file://${uri}`;
    }

    // Guess file type based on extension
    const match = /\.(\w+)$/.exec(uri);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("photo", {
      uri: uri,
      type,
      name: `upload.${match ? match[1] : "jpg"}`,
    } as any);

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/api/v1/storage/upload`, {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          // Do NOT set Content-Type header manually
        },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new ApiResponseError(response.status, responseText, "Upload failed");
      }

      const data = JSON.parse(responseText);
      return data.url;
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    }
  }

  /** Same as leaving: kept for callers, routes through POST /leave. */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.leaveConversation(conversationId);
  }

  async polishMessage(
    text: string,
    tone: "neutral" | "friendly" | "playful" = "neutral"
  ): Promise<{
    polishedText: string;
    usage: {
      aiCount: number;
      aiLimit: number;
      isPremium: boolean;
    };
  }> {
    const response = await this.client.post("/api/v1/ai/polish", { text, tone });
    return response.data;
  }

  async getUsage(): Promise<{
    usage: {
      aiCount: number;
      msgCount: number;
      aiLimit: number;
      msgLimit: number;
      isPremium: boolean;
      aiAllowed: boolean;
      msgAllowed: boolean;
      likesUsed?: number;
      likesRemaining?: number;
      likesLimit?: number;
      canLike?: boolean;
      favoritesUsed?: number;
      favoritesRemaining?: number;
      favoritesLimit?: number;
      canFavorite?: boolean;
    };
  }> {
    const response = await this.client.get("/api/v1/ai/usage");
    return response.data;
  }

  // Likes endpoints
  async getIncomingLikesCount(): Promise<{
    count: number;
    blurred?: boolean;
  }> {
    const response = await this.client.get("/api/v1/likes/incoming/count");
    return response.data;
  }

  async getIncomingLikes(): Promise<
    Array<{
      fromUserId: string;
      displayName: string;
      city: string | null;
      photos: string[];
      createdAt: string;
    }>
  > {
    const response = await this.client.get("/api/v1/likes/incoming");
    return response.data;
  }

  // Boost endpoints
  async getBoostStatus(): Promise<{
    active: boolean;
    endsAt?: string;
    boostsRemaining: number;
    weeklyLimit: number;
  }> {
    const response = await this.client.get("/api/v1/boost/status");
    return response.data;
  }

  async activateBoost(): Promise<{
    startsAt: string;
    endsAt: string;
    active: boolean;
    boostsRemaining: number;
  }> {
    const response = await this.client.post("/api/v1/boost/activate");
    return response.data;
  }

  // Safety endpoints
  async blockUser(userId: string): Promise<void> {
    await this.client.post("/api/v1/safety/block", { userId });
  }

  async reportUser(
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    await this.client.post("/api/v1/safety/report", {
      userId,
      reason,
      details,
    });
  }

  // Permanently removes the conversation for BOTH participants.
  async leaveConversation(
    conversationId: string,
    reason?: string,
    details?: string
  ): Promise<{ ok: boolean }> {
    const response = await this.client.post(
      `/api/v1/chat/conversations/${conversationId}/leave`,
      { reason, details }
    );
    return response.data;
  }

  // Billing endpoints
  async syncBilling(data?: {
    customerInfo?: any; // Optional customer info for debugging
  }): Promise<{
    isPremium: boolean;
    /** Purchased pack balances. */
    purchasedBoosts?: number;
    purchasedFavorites?: number;
  }> {
    const response = await this.client.post("/api/v1/billing/sync", data || {});
    return response.data;
  }

  async getBillingStatus(): Promise<{
    isPremium: boolean;
    premiumSource: string | null;
    premiumUpdatedAt: string | null;
    premiumExpiresAt: string | null;
    purchasedBoosts?: number;
    purchasedFavorites?: number;
  }> {
    const response = await this.client.get("/api/v1/billing/status");
    return response.data;
  }

  /**
   * Called after a store pack purchase. Never errors; the server reconciles
   * with RevenueCat and waits up to ~5s for the credit. Works for any pack
   * when `transactionId` is given; `previousCount` compares boost credits.
   */
  async purchaseBoost(body?: {
    transactionId?: string;
    previousCount?: number;
  }): Promise<{
    success: boolean;
    credited?: boolean;
    message: string;
    purchasedBoosts?: number;
    purchasedFavorites?: number;
  }> {
    const response = await this.client.post(
      "/api/v1/billing/purchase-boost",
      body ?? {},
      { timeout: 15000 }
    );
    return response.data;
  }

  // Notifications endpoints
  async getLikeStatus(): Promise<{
    isPremium: boolean;
    likesUsed: number;
    likesRemaining: number | null;
    likesLimit: number | null;
    resetsAt: string;
  }> {
    const response = await this.client.get("/api/v1/discovery/like-status");
    return response.data;
  }

  async registerPushToken(data: {
    token: string;
    platform: "IOS" | "ANDROID";
    /** Device UI language, so push copy is not sent in a fixed locale. */
    locale?: string;
  }): Promise<void> {
    await this.client.post("/api/v1/notifications/register-token", data);
  }

  // Referral endpoints
  async getReferralCode(): Promise<{ referralCode: string | null }> {
    const response = await this.client.get("/api/v1/referral/me");
    return response.data;
  }

  async applyReferralCode(code: string): Promise<void> {
    await this.client.post("/api/v1/referral/apply", { code });
  }

  // Rewards endpoints
  /**
   * Exchange a verified Google/Apple identity token for a session.
   * The server checks the token's signature against the provider, so no
   * e-mail code step follows.
   */
  async socialLogin(data: {
    provider: "google" | "apple";
    idToken: string;
    fullName?: string;
    /** Apple only: one-time code the server swaps for a revocable refresh token (contract 3). */
    authorizationCode?: string;
  }): Promise<{
    userId: string;
    token: string;
    profileExists: boolean;
    suggestedName: string | null;
  }> {
    const response = await this.client.post("/api/v1/auth/social", data);
    return response.data;
  }

  /** Single-use proof-of-ad-view token, handed to AdMob as custom data. */
  async requestAdRewardToken(kind: "LIKE" | "FAVORITE" = "LIKE"): Promise<{
    nonce: string;
    userId: string;
  }> {
    const response = await this.client.post("/api/v1/rewards/ad-token", { kind });
    return response.data;
  }

  async rewardAdLike(nonce?: string): Promise<{
    success: boolean;
    rewardAmount: number;
    /** What this call actually credited (newer servers). */
    granted?: { type: "CONVERSATION_SLOT" | "LIKES"; amount: number };
    likesInfo: {
      likesUsed: number;
      likesRemaining: number;
      likesLimit: number;
      extraLikesFromAds: number;
    };
  }> {
    const response = await this.client.post("/api/v1/rewards/ad-like", { nonce });
    return response.data;
  }

  // Requests endpoints
  async getIncomingRequests(): Promise<
    Array<{
      requestId: string;
      fromUserId: string;
      kind: "LIKE" | "FAVORITE";
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      createdAt: string;
      fromUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
        languagesNative: string[];
        languagesPractice: string[];
        birthYear: number | null;
        bio: string | null;
      };
      firstMessage: {
        id: string;
        text: string;
        createdAt: string;
      } | null;
    }>
  > {
    const response = await this.client.get("/api/v1/requests/incoming?status=PENDING");
    return response.data;
  }

  async getOutgoingRequests(): Promise<
    Array<{
      requestId: string;
      toUserId: string;
      kind: "LIKE" | "FAVORITE";
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      createdAt: string;
      toUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
        languagesNative: string[];
        languagesPractice: string[];
        birthYear: number | null;
        bio: string | null;
      };
      firstMessage: {
        id: string;
        text: string;
        createdAt: string;
      } | null;
    }>
  > {
    const response = await this.client.get("/api/v1/requests/outgoing?status=PENDING");
    return response.data;
  }

  async acceptRequest(fromUserId: string): Promise<{
    success: boolean;
    requestId: string;
    matchId?: string;
    conversationId?: string;
  }> {
    const response = await this.client.post("/api/v1/requests/accept", {
      fromUserId,
    });
    return response.data;
  }

  async declineRequest(fromUserId: string): Promise<{
    success: boolean;
    requestId: string;
  }> {
    const response = await this.client.post("/api/v1/requests/decline", {
      fromUserId,
    });
    return response.data;
  }

  // Chat requests endpoints
  async getChatRequests(): Promise<
    Array<{
      requestId: string;
      fromUserId: string;
      createdAt: string;
      fromUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
      };
      firstMessage: {
        id: string;
        text: string;
        createdAt: string;
      } | null;
    }>
  > {
    const response = await this.client.get("/api/v1/chat/requests");
    return response.data;
  }

  async replyToRequest(requestId: string, text: string): Promise<{
    success: boolean;
    conversationId: string;
    message: {
      id: string;
      conversationId: string;
      senderUserId: string;
      text: string;
      createdAt: string;
    };
  }> {
    const response = await this.client.post(`/api/v1/chat/requests/${requestId}/reply`, {
      text,
    });
    return response.data;
  }

  // ---------------------------------------------------------------------
  // Hat, sinav ve dil urunu
  // ---------------------------------------------------------------------

  /** Bu sinav icin madde listesi. Havuz rotasyonlu. */
  async getExamItems(
    language: string,
    role: "NATIVE" | "LEARNING" = "LEARNING"
  ): Promise<{
    data: {
      items: Array<{
        id: string;
        kind: "written" | "spoken";
        prompt: string;
        seconds: number;
      }>;
      /** Present when a valid proof already exists: the client skips the exam (contract 7). */
      existingProof?: {
        language: string;
        role: "NATIVE" | "LEARNING";
        cefr: string | null;
        verified: boolean;
        expiresAt: string;
      } | null;
    };
  }> {
    const response = await this.client.get("/api/v1/exam/items", {
      params: { language, role },
    });
    return response.data;
  }

  /**
   * Dil kontrolunu gonderir.
   *
   * Istenen rol NATIVE olup dogrulanmazsa yanit LEARNING doner. Bu bir
   * HATA DEGIL: hesap acik kalir, iddia dusurulur. Arayuz bunu boyle
   * gostermeli.
   */
  async submitExam(
    language: string,
    role: "NATIVE" | "LEARNING",
    answers: string[]
  ): Promise<{
    data: {
      language: string;
      role: "NATIVE" | "LEARNING";
      cefr: string | null;
      verified: boolean;
      expiresAt: string;
    };
  }> {
    const response = await this.client.post("/api/v1/exam/submit", {
      language,
      role,
      answers,
    });
    return response.data;
  }

  async getExamStatus(): Promise<{
    data: {
      proofs: Array<{
        language: string;
        role: "NATIVE" | "LEARNING";
        cefr: string | null;
        expiresAt: string;
        retakeAvailableAt: string | null;
      }>;
      unverified: string[];
    };
  }> {
    const response = await this.client.get("/api/v1/exam/status");
    return response.data;
  }

  async getEntitlements(): Promise<{
    data: {
      track: "DATE" | "LANGUAGE";
      isPremium: boolean;
      concurrencySlots: number;
      concurrencyCeiling: number;
      dailyConversations: number;
      dailyIntake: number;
      coachPerDay: number | null;
      translationsPerDay: number | null;
      sessionsPerWeek: number | null;
      partnerCorrections: "unlimited";
      /** Perk limits (contract 5); optional for older servers. */
      favoritesPerWeek?: number;
      boostsPerWeek?: number;
      /** null = unlimited */
      likesPerDay?: number | null;
      aiPolishPerDay?: number | null;
      adsFree?: boolean;
      whoLikedYou?: "blurred" | "visible";
      premiumFilters?: boolean;
      /** Same shape, computed for a free user on the same track (contract 5). */
      free?: EntitlementSnapshot;
      /** Premium alinsa ne degisirdi. Odeme ekrani bu sayilari kendi
       *  hesaplamasin diye sunucudan geliyor. */
      premiumPreview: EntitlementSnapshot & {
        concurrencySlots: number;
        dailyConversations: number;
        coachPerDay: number | null;
        translationsPerDay: number | null;
        sessionsPerWeek: number | null;
      };
    };
  }> {
    const response = await this.client.get("/api/v1/billing/entitlements");
    return response.data;
  }

  async getIntake(): Promise<{
    data: { dailyLimit: number; queuedCount: number; lastReleaseAt: string | null };
  }> {
    const response = await this.client.get("/api/v1/requests/intake");
    return response.data;
  }

  async setIntake(dailyLimit: number): Promise<{ data: { dailyLimit: number } }> {
    const response = await this.client.put("/api/v1/requests/intake", { dailyLimit });
    return response.data;
  }

  /** Cevaplanmamis kendi istegini geri ceker; slot aninda doner. */
  async withdrawRequest(requestId: string): Promise<void> {
    await this.client.delete(`/api/v1/requests/${requestId}`);
  }

  // --- Koc ve duzeltmeler ----------------------------------------------

  /** Partner duzeltmesi. Ucretsiz ve kotasiz. */
  async addCorrection(
    messageId: string,
    corrected: string,
    note?: string
  ): Promise<{ data: { id: string; original: string; corrected: string; note: string | null } }> {
    const response = await this.client.post("/api/v1/coach/corrections", {
      messageId,
      corrected,
      note,
    });
    return response.data;
  }

  async listCorrections(): Promise<{
    data: {
      corrections: Array<{
        id: string;
        original: string;
        corrected: string;
        note: string | null;
        category: string | null;
        source: "PARTNER" | "AI";
        createdAt: string;
      }>;
    };
  }> {
    const response = await this.client.get("/api/v1/coach/corrections");
    return response.data;
  }

  /** AI kocu. Cikti OZELDIR: karsi taraf gormez. */
  async coachReview(messageId: string): Promise<{
    data: {
      corrected: string | null;
      note: string | null;
      category: string | null;
      quota: { used: number; limit: number | null; remaining: number | null };
    };
  }> {
    const response = await this.client.post("/api/v1/coach/review", { messageId });
    return response.data;
  }

  async getCoachQuota(): Promise<{
    data: { used: number; limit: number | null; remaining: number | null };
  }> {
    const response = await this.client.get("/api/v1/coach/quota");
    return response.data;
  }

  async getMistakeBook(): Promise<{
    data: {
      categories: Array<{ category: string; count: number }>;
      entries: Array<{
        id: string;
        original: string;
        corrected: string;
        note: string | null;
        category: string | null;
        source: "PARTNER" | "AI";
        createdAt: string;
      }>;
    };
  }> {
    const response = await this.client.get("/api/v1/coach/book");
    return response.data;
  }

  async getWeeklyReport(): Promise<{
    data: {
      total: number;
      topCategory: string | null;
      byCategory: Array<{ category: string; count: number }>;
      from: string;
      to: string;
    };
  }> {
    const response = await this.client.get("/api/v1/coach/report");
    return response.data;
  }

  async translate(
    text: string,
    target: string
  ): Promise<{ data: { translated: string; remaining: number | null } }> {
    const response = await this.client.post("/api/v1/coach/translate", { text, target });
    return response.data;
  }

  // --- Planli oturumlar -------------------------------------------------

  async listSessions(): Promise<{
    data: {
      sessions: Array<{
        id: string;
        createdById: string;
        withUserId: string;
        startsAt: string;
        durationMins: number;
        topic: string | null;
        status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
      }>;
      weeklyUsed: number;
    };
  }> {
    const response = await this.client.get("/api/v1/sessions");
    return response.data;
  }

  async createSession(
    withUserId: string,
    startsAt: string,
    topic?: string
  ): Promise<{ data: { id: string; startsAt: string; topic: string | null } }> {
    const response = await this.client.post("/api/v1/sessions", {
      withUserId,
      startsAt,
      topic,
    });
    return response.data;
  }

  async cancelSession(sessionId: string): Promise<void> {
    await this.client.delete(`/api/v1/sessions/${sessionId}`);
  }
}

export const api = new ApiClient();

/** One side of the free-vs-premium comparison from /billing/entitlements. */
export interface EntitlementSnapshot {
  isPremium?: boolean;
  concurrencySlots: number;
  dailyConversations: number;
  coachPerDay: number | null;
  translationsPerDay: number | null;
  sessionsPerWeek: number | null;
  favoritesPerWeek?: number;
  boostsPerWeek?: number;
  likesPerDay?: number | null;
  aiPolishPerDay?: number | null;
  adsFree?: boolean;
  whoLikedYou?: "blurred" | "visible";
  premiumFilters?: boolean;
}

/**
 * Local sign-out cleanup shared by logout, account deletion and the
 * automatic logout on an expired session: RevenueCat is logged out (so the
 * next account on a shared phone never buys or restores under this user's
 * id), the push token state is reset (so the next account registers its own)
 * and the session token is cleared. Never throws; concurrent calls share
 * one run.
 */
let clearSessionInFlight: Promise<void> | null = null;

export function clearLocalSession(): Promise<void> {
  // A manual logout racing the automatic 401 logout must not run the cleanup
  // twice (two RevenueCat logOuts, two token events).
  if (!clearSessionInFlight) {
    clearSessionInFlight = runClearLocalSession().finally(() => {
      clearSessionInFlight = null;
    });
  }
  return clearSessionInFlight;
}

async function runClearLocalSession(): Promise<void> {
  // Token first: clearToken emits the null token event, so the premium
  // provider stops refreshing BEFORE Purchases.logOut fires its customer-info
  // listener (a refresh then would log RevenueCat back in as this user).
  await clearToken();
  try {
    const { resetAiConsentCache } = await import("./aiConsent");
    resetAiConsentCache();
  } catch (error) {
    console.warn("[API] AI consent reset failed:", error);
  }
  // Dynamic imports: these modules import this one.
  try {
    const { logoutPurchases } = await import("./purchases");
    await logoutPurchases();
  } catch (error) {
    console.warn("[API] RevenueCat logout failed:", error);
  }
  try {
    const { resetPushTokenState } = await import("./pushNotifications");
    resetPushTokenState();
    const { resetPostLoginPermissions } = await import("./postLoginPermissions");
    resetPostLoginPermissions();
  } catch (error) {
    console.warn("[API] Push token reset failed:", error);
  }
}

