"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface WsEvent {
    type: "bet_placed" | "match_resolved" | "match_cancelled" | "match_updated" | "connected";
    matchId?: number;
    data?: any;
    message?: string;
}

type WsListener = (event: WsEvent) => void;

const WS_URL = (() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return apiUrl.replace(/^http/, "ws").replace(/\/api\/?$/, "") + "/ws";
})();

/**
 * Hook for real-time WebSocket updates from the backend.
 * Automatically reconnects on disconnect.
 * Filter events by matchId to only receive updates for a specific match.
 */
export function useWebSocket(matchId?: number) {
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const listenersRef = useRef<WsListener[]>([]);
    const reconnectRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                setConnected(true);
                console.log("[WS] Connected");
            };

            ws.onmessage = (evt) => {
                try {
                    const event: WsEvent = JSON.parse(evt.data);

                    // Filter by matchId if specified
                    if (matchId && event.matchId && event.matchId !== matchId) return;

                    setLastEvent(event);
                    listenersRef.current.forEach((fn) => fn(event));
                } catch {
                    // Ignore malformed messages
                }
            };

            ws.onclose = () => {
                setConnected(false);
                console.log("[WS] Disconnected, reconnecting in 5s...");
                reconnectRef.current = setTimeout(connect, 5000);
            };

            ws.onerror = () => {
                ws.close();
            };

            wsRef.current = ws;
        } catch {
            reconnectRef.current = setTimeout(connect, 5000);
        }
    }, [matchId]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const subscribe = useCallback((listener: WsListener) => {
        listenersRef.current.push(listener);
        return () => {
            listenersRef.current = listenersRef.current.filter((fn) => fn !== listener);
        };
    }, []);

    return { connected, lastEvent, subscribe };
}
