import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { getToken } from "../services/authStore";
import { onTokenChange } from "../services/tokenEvents";
import {
    disconnectSocket as disconnectChatSocket,
    resetChatSocketState,
} from "../services/socket";
import { io, Socket } from "socket.io-client";

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

// Event types
export type NewLikeEvent = {
    fromUserId: string;
    fromUserName: string;
    fromUserPhoto?: string;
    isMatch: boolean;
    matchId?: string;
    conversationId?: string;
};

export type NewMatchEvent = {
    matchId: string;
    conversationId: string;
    otherUser: {
        userId: string;
        displayName: string;
        photos: string[];
    };
};

export type ConversationUpdatedEvent = {
    conversationId: string;
    lastMessage: {
        text: string;
        createdAt: string;
        senderUserId: string;
    };
    unreadCount: number;
};

export type NewChatRequestEvent = {
    requestId: string;
    fromUser: {
        userId: string;
        displayName: string;
        photos: string[];
    };
    firstMessage: {
        text: string;
        createdAt: string;
    };
};

type SocketContextType = {
    isConnected: boolean;
    likesCount: number;
    newMatches: NewMatchEvent[];
    conversationUpdates: Map<string, ConversationUpdatedEvent>;
    chatRequests: NewChatRequestEvent[];
    clearNewMatches: () => void;
    clearLikesCount: () => void;
    refreshConnection: () => Promise<void>;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [connected, setConnected] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [newMatches, setNewMatches] = useState<NewMatchEvent[]>([]);
    const [conversationUpdates, setConversationUpdates] = useState<Map<string, ConversationUpdatedEvent>>(new Map());
    const [chatRequests, setChatRequests] = useState<NewChatRequestEvent[]>([]);
    const socketRef = useRef<Socket | null>(null);

    // Token the current socket was opened with; a different token means a
    // different user (or a fresh login), so the old socket must be replaced.
    const socketTokenRef = useRef<string | null>(null);

    const teardownSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        socketTokenRef.current = null;
        setConnected(false);
    }, []);

    const setupSocket = useCallback(async (tokenOverride?: string | null) => {
        const token = tokenOverride !== undefined ? tokenOverride : await getToken();
        if (!token) {
            console.log("[SocketProvider] No token, skipping connection");
            teardownSocket();
            return;
        }

        if (socketRef.current && socketTokenRef.current === token) {
            // Same session: socket.io reconnects on its own; just make sure it is trying.
            if (!socketRef.current.connected) socketRef.current.connect();
            return;
        }

        // New or different token: drop the old socket before opening a new one.
        teardownSocket();

        try {
            const socket = io(API_URL, {
                auth: { token },
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 10000,
            });

            socketRef.current = socket;
            socketTokenRef.current = token;

            socket.on("connect", () => {
                console.log("[SocketProvider] Connected:", socket.id);
                setConnected(true);
            });

            socket.on("disconnect", (reason) => {
                console.log("[SocketProvider] Disconnected:", reason);
                setConnected(false);
            });

            socket.on("connect_error", (error) => {
                console.log("[SocketProvider] Connection error:", error.message);
                setConnected(false);
            });

            // Listen for new likes
            socket.on("new_like", (data: NewLikeEvent) => {
                console.log("[SocketProvider] New like received:", data.fromUserName);
                if (data.isMatch) {
                    // If it's a match, show match popup instead
                    setNewMatches((prev) => [...prev, {
                        matchId: data.matchId!,
                        conversationId: data.conversationId!,
                        otherUser: {
                            userId: data.fromUserId,
                            displayName: data.fromUserName,
                            photos: data.fromUserPhoto ? [data.fromUserPhoto] : [],
                        },
                    }]);
                } else {
                    setLikesCount((prev) => prev + 1);
                }
            });

            // Listen for new matches
            socket.on("new_match", (data: NewMatchEvent) => {
                console.log("[SocketProvider] New match:", data.otherUser.displayName);
                setNewMatches((prev) => [...prev, data]);
            });

            // Listen for conversation updates (for chat list)
            socket.on("conversation_updated", (data: ConversationUpdatedEvent) => {
                console.log("[SocketProvider] Conversation updated:", data.conversationId);
                setConversationUpdates((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(data.conversationId, data);
                    return newMap;
                });
            });

            // Listen for new chat requests (FAVORITE)
            socket.on("new_chat_request", (data: NewChatRequestEvent) => {
                console.log("[SocketProvider] New chat request from:", data.fromUser.displayName);
                setChatRequests((prev) => [...prev, data]);
            });

        } catch (error) {
            console.error("[SocketProvider] Setup error:", error);
        }
    }, [teardownSocket]);

    // Connect on mount, then follow the auth token: reconnect with the new
    // token after login, disconnect (and reset per-user state) on logout.
    useEffect(() => {
        setupSocket();

        const unsubscribe = onTokenChange((token) => {
            if (token) {
                if (token !== socketTokenRef.current) {
                    setLikesCount(0);
                    setNewMatches([]);
                    setChatRequests([]);
                    setConversationUpdates(new Map());
                    // Chat socket carries the old token too; the conversation
                    // screen reopens it with the new one when it is needed.
                    disconnectChatSocket();
                    resetChatSocketState();
                }
                setupSocket(token);
            } else {
                teardownSocket();
                disconnectChatSocket();
                resetChatSocketState();
                setLikesCount(0);
                setNewMatches([]);
                setChatRequests([]);
                setConversationUpdates(new Map());
            }
        });

        // Back in the foreground after the OS dropped the socket or the
        // reconnect attempts ran out: reconnect with the current token.
        const appStateSub = AppState.addEventListener("change", (state) => {
            if (state !== "active") return;
            if (!socketRef.current || !socketRef.current.connected) setupSocket();
        });

        return () => {
            unsubscribe();
            appStateSub.remove();
            teardownSocket();
        };
    }, [setupSocket, teardownSocket]);

    const clearNewMatches = useCallback(() => {
        setNewMatches([]);
    }, []);

    const clearLikesCount = useCallback(() => {
        setLikesCount(0);
    }, []);

    const refreshConnection = useCallback(async () => {
        teardownSocket();
        await setupSocket();
    }, [setupSocket, teardownSocket]);

    return (
        <SocketContext.Provider
            value={{
                isConnected: connected,
                likesCount,
                newMatches,
                conversationUpdates,
                chatRequests,
                clearNewMatches,
                clearLikesCount,
                refreshConnection,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
