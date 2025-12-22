// Push notifications disabled - Firebase credentials not configured
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

let isConfigured = false;

/**
 * Configure notification handler
 * DISABLED: Firebase credentials not configured
 */
export async function configureNotifications(): Promise<void> {
  // Push notifications disabled - Firebase credentials not configured
  // Uncomment when Firebase is set up
  /*
  if (isConfigured) {
    return;
  }

  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  isConfigured = true;
  */
  console.log("Push notifications disabled - Firebase credentials not configured");
}

/**
 * Request notification permissions and register token
 * DISABLED: Firebase credentials not configured
 */
export async function registerPushToken(): Promise<void> {
  // Push notifications disabled - Firebase credentials not configured
  // Uncomment when Firebase is set up
  /*
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification permissions not granted");
      return;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Optional, for EAS builds
    });

    const token = tokenData.data;

    // Determine platform
    const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";

    // Register token with backend
    try {
      await api.registerPushToken({ token, platform });
      console.log("Push token registered successfully");
    } catch (error) {
      console.error("Failed to register push token:", error);
    }
  } catch (error) {
    console.error("Failed to get push token:", error);
  }
  */
  console.log("Push notifications disabled - Firebase credentials not configured");
}

