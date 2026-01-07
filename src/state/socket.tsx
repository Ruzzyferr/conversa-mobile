import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
    connectSocket,
    disconnectSocket,
    isConnected,
    onNewMessage,
} from "../services/socket";
import { getToken } from "../services/authStore";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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

    const setupSocket = useCallback(async () => {
        const token = await getToken();
        if (!token) {
            console.log("[SocketProvider] No token, skipping connection");
            return;
        }

        if (socketRef.current?.connected) {
            console.log("[SocketProvider] Already connected");
            setConnected(true);
            return;
        }

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
    }, []);

    // Connect on mount
    useEffect(() => {
        setupSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [setupSocket]);

    const clearNewMatches = useCallback(() => {
        setNewMatches([]);
    }, []);

    const clearLikesCount = useCallback(() => {
        setLikesCount(0);
    }, []);

    const refreshConnection = useCallback(async () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        await setupSocket();
    }, [setupSocket]);

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
