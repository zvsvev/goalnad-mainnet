/**
 * WebSocket Server for real-time updates
 *
 * Broadcasts events to connected frontend clients:
 * - bet_placed: when a new bet is indexed
 * - match_resolved: when a match is resolved
 * - match_cancelled: when a match is cancelled
 */

import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer | null = null;

export interface WsEvent {
    type: "bet_placed" | "match_resolved" | "match_cancelled" | "match_updated";
    matchId: number;
    data?: any;
}

/**
 * Initialize WebSocket server on the existing HTTP server.
 */
export function initWebSocket(server: Server): WebSocketServer {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws) => {
        console.log("[WS] Client connected");

        ws.on("close", () => {
            console.log("[WS] Client disconnected");
        });

        ws.on("error", (err) => {
            console.error("[WS] Error:", err.message);
        });

        // Send welcome message
        ws.send(JSON.stringify({ type: "connected", message: "GoalScore WS" }));
    });

    console.log("🔌 WebSocket server ready on /ws");
    return wss;
}

/**
 * Broadcast an event to all connected clients.
 */
export function broadcast(event: WsEvent): void {
    if (!wss) return;

    const msg = JSON.stringify(event);
    let sent = 0;

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
            sent++;
        }
    });

    if (sent > 0) {
        console.log(`[WS] Broadcast ${event.type} (matchId=${event.matchId}) to ${sent} client(s)`);
    }
}

/**
 * Get connection count.
 */
export function getWsConnectionCount(): number {
    if (!wss) return 0;
    let count = 0;
    wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) count++;
    });
    return count;
}
