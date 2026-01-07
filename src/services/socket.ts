import { io, Socket } from "socket.io-client";
import { getToken } from "./authStore";

// Get API URL from environment
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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
    createdAt: string;
}) => void;

type TypingHandler = (data: { conversationId: string; userId: string }) => void;

const messageListeners = new Map<string, Set<MessageHandler>>();
const typingListeners = new Map<string, Set<TypingHandler>>();
const typingStopListeners = new Map<string, Set<TypingHandler>>();

/**
 * Connect to Socket.IO server
 */
export async function connectSocket(): Promise<Socket | null> {
    if (socket?.connected) {
        console.log("[Socket] Already connected");
        return socket;
    }

    const token = await getToken();
    if (!token) {
        console.log("[Socket] No auth token, cannot connect");
        return null;
    }

    try {
        socket = io(API_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socket.on("connect", () => {
            console.log("[Socket] Connected:", socket?.id);
            reconnectAttempts = 0;
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
        });

        socket.on("connect_error", (error) => {
            console.log("[Socket] Connection error:", error.message);
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
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
        socket.disconnect();
        socket = null;
        console.log("[Socket] Disconnected manually");
    }
}

/**
 * Join a conversation room to receive real-time messages
 */
export function joinConversation(conversationId: string): void {
    if (!socket?.connected) {
        console.log("[Socket] Not connected, cannot join conversation");
        return;
    }
    socket.emit("join_conversation", conversationId);
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: string): void {
    if (!socket?.connected) return;
    socket.emit("leave_conversation", conversationId);
}

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
