import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";
import { getToken } from "./authStore";

// Get API URL from environment
// In production builds, fail fast instead of falling back to localhost
function getSocketUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    if (!__DEV__) {
        throw new Error(
            "EXPO_PUBLIC_API_URL is not set in this production build. " +
            "Set it in the EAS build profile env before releasing."
        );
    }
    return "http://localhost:4000";
}

const API_URL = getSocketUrl();

// Socket instance
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Event listeners registry
type MessageHandler = (message: {
    id: string;
    conversationId: string;
    senderUserId: string;
    text: string;
    audioUrl?: string | null;
    imageUrl?: string | null;
    createdAt: string;
}) => void;

type TypingHandler = (data: { conversationId: string; userId: string }) => void;

const messageListeners = new Map<string, Set<MessageHandler>>();
// Conversation rooms the UI currently has open. Rooms are (re)joined on every
// "connect" event, so joining before the socket is up, after a reconnect
// (backgrounding, network change) or after a fresh socket all work.
const openRooms = new Set<string>();
// Socket token, so a login with another account replaces the socket.
let socketToken: string | null = null;
let connecting: Promise<Socket | null> | null = null;
const typingListeners = new Map<string, Set<TypingHandler>>();
const typingStopListeners = new Map<string, Set<TypingHandler>>();

/**
 * Connect to Socket.IO server
 */
export async function connectSocket(): Promise<Socket | null> {
    if (connecting) return connecting;
    connecting = openSocket().finally(() => {
        connecting = null;
    });
    return connecting;
}

async function openSocket(): Promise<Socket | null> {
    const token = await getToken();
    if (!token) {
        console.log("[Socket] No auth token, cannot connect");
        return null;
    }

    if (socket && socketToken === token) {
        // Existing socket for this session: if it is still connecting or
        // between reconnect attempts, let it continue rather than open a second one.
        if (!socket.connected) socket.connect();
        return socket;
    }
    if (socket) disconnectSocket();

    try {
        reconnectAttempts = 0;
        socketToken = token;
        socket = io(API_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        const current = socket;
        current.on("connect", () => {
            console.log("[Socket] Connected:", current.id);
            reconnectAttempts = 0;
            // Fires on the first connect and on every reconnect: (re)join all open rooms.
            openRooms.forEach((conversationId) => {
                current.emit("join_conversation", conversationId);
            });
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
        });

        socket.on("connect_error", (error) => {
            console.log("[Socket] Connection error:", error.message);
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                // Give up for now; the next foreground (or connectSocket call)
                // opens a fresh socket and rejoins the open rooms.
                console.log("[Socket] Max reconnect attempts reached");
                disconnectSocket();
            }
        });

        // Handle new messages
        socket.on("new_message", (message) => {
            console.log("[Socket] New message received:", message.id);
            const handlers = messageListeners.get(message.conversationId);
            if (handlers) {
                handlers.forEach((handler) => handler(message));
            }
        });

        // Handle typing indicators
        socket.on("user_typing", (data) => {
            const handlers = typingListeners.get(data.conversationId);
            if (handlers) {
                handlers.forEach((handler) => handler(data));
            }
        });

        socket.on("user_stopped_typing", (data) => {
            const handlers = typingStopListeners.get(data.conversationId);
            if (handlers) {
                handlers.forEach((handler) => handler(data));
            }
        });

        return socket;
    } catch (error) {
        console.error("[Socket] Failed to connect:", error);
        return null;
    }
}

/**
 * Disconnect from Socket.IO server
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        socketToken = null;
        console.log("[Socket] Disconnected manually");
    }
}

/**
 * Join a conversation room to receive real-time messages.
 * Safe to call before the socket is connected: the room is remembered and
 * joined on connect, and rejoined after every reconnect.
 */
export function joinConversation(conversationId: string): void {
    openRooms.add(conversationId);
    if (socket?.connected) {
        socket.emit("join_conversation", conversationId);
    } else {
        connectSocket().catch(() => {});
    }
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: string): void {
    openRooms.delete(conversationId);
    if (!socket?.connected) return;
    socket.emit("leave_conversation", conversationId);
}

// Coming back to the foreground: if a chat is open and the socket gave up
// (or the OS dropped it), reconnect so the rooms are rejoined.
AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state !== "active" || openRooms.size === 0) return;
    if (!socket || !socket.connected) {
        connectSocket().catch(() => {});
    }
});

/**
 * Send typing start indicator
 */
export function sendTypingStart(conversationId: string): void {
    if (!socket?.connected) return;
    socket.emit("typing_start", { conversationId });
}

/**
 * Send typing stop indicator
 */
export function sendTypingStop(conversationId: string): void {
    if (!socket?.connected) return;
    socket.emit("typing_stop", { conversationId });
}

/**
 * Subscribe to new messages for a conversation
 */
export function onNewMessage(conversationId: string, handler: MessageHandler): () => void {
    if (!messageListeners.has(conversationId)) {
        messageListeners.set(conversationId, new Set());
    }
    messageListeners.get(conversationId)!.add(handler);

    // Return unsubscribe function
    return () => {
        const handlers = messageListeners.get(conversationId);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                messageListeners.delete(conversationId);
            }
        }
    };
}

/**
 * Subscribe to typing events for a conversation
 */
export function onTyping(conversationId: string, handler: TypingHandler): () => void {
    if (!typingListeners.has(conversationId)) {
        typingListeners.set(conversationId, new Set());
    }
    typingListeners.get(conversationId)!.add(handler);

    return () => {
        const handlers = typingListeners.get(conversationId);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                typingListeners.delete(conversationId);
            }
        }
    };
}

/**
 * Subscribe to typing stop events for a conversation
 */
export function onTypingStop(conversationId: string, handler: TypingHandler): () => void {
    if (!typingStopListeners.has(conversationId)) {
        typingStopListeners.set(conversationId, new Set());
    }
    typingStopListeners.get(conversationId)!.add(handler);

    return () => {
        const handlers = typingStopListeners.get(conversationId);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                typingStopListeners.delete(conversationId);
            }
        }
    };
}

// Conversations the user left this session. Lists filter them out so a
// left chat never reappears from a stale socket event or a cached response.
const leftConversations = new Set<string>();

export function markConversationLeft(conversationId: string): void {
    leftConversations.add(conversationId);
    openRooms.delete(conversationId);
}

export function isConversationLeft(conversationId: string | null | undefined): boolean {
    return !!conversationId && leftConversations.has(conversationId);
}

/**
 * Forget per-account chat state (rooms to rejoin, conversations left this
 * session). Call on every login / logout / account switch so the next account
 * neither rejoins the previous user's rooms nor hides its own conversations.
 */
export function resetChatSocketState(): void {
    openRooms.clear();
    leftConversations.clear();
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
    return socket?.connected ?? false;
}

/**
 * Get connection status
 */
export function getConnectionStatus(): "connected" | "connecting" | "disconnected" {
    if (!socket) return "disconnected";
    if (socket.connected) return "connected";
    return "connecting";
}
