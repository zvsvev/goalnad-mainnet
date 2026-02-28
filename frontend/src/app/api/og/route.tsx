import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet") || "";
    const username = searchParams.get("username") || "";
    const wins = searchParams.get("wins") || "0";
    const losses = searchParams.get("losses") || "0";
    const pnl = searchParams.get("pnl") || "0";
    const totalBets = searchParams.get("totalBets") || "0";

    const displayName = username ? `@${username}` : `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
    const avatarSeed = username || wallet;
    const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${avatarSeed}&size=96`;

    const pnlNum = parseFloat(pnl);
    const pnlColor = pnlNum >= 0 ? "#22c55e" : "#ef4444";
    const pnlSign = pnlNum >= 0 ? "+" : "";
    const winRate = parseInt(wins) + parseInt(losses) > 0
        ? ((parseInt(wins) / (parseInt(wins) + parseInt(losses))) * 100).toFixed(1)
        : "0";

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1200px",
                    height: "630px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)",
                    fontFamily: "monospace",
                    color: "#ffffff",
                    position: "relative",
                }}
            >
                {/* Border frame */}
                <div
                    style={{
                        position: "absolute",
                        inset: "16px",
                        border: "2px solid #22c55e33",
                        display: "flex",
                    }}
                />

                {/* Top badge */}
                <div
                    style={{
                        position: "absolute",
                        top: "28px",
                        left: "32px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <span style={{ color: "#22c55e", fontSize: "18px", fontWeight: "bold" }}>
                        GoalScore.fun
                    </span>
                    <span style={{ color: "#666", fontSize: "14px" }}>Player Card</span>
                </div>

                {/* Avatar */}
                <img
                    src={avatarUrl}
                    width={96}
                    height={96}
                    style={{
                        border: "3px solid #22c55e",
                        marginBottom: "16px",
                        imageRendering: "pixelated",
                    }}
                />

                {/* Name */}
                <div
                    style={{
                        fontSize: "42px",
                        fontWeight: "bold",
                        color: "#ffffff",
                        marginBottom: "8px",
                    }}
                >
                    {displayName}
                </div>

                {/* Stats grid */}
                <div
                    style={{
                        display: "flex",
                        gap: "48px",
                        marginTop: "24px",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#22c55e" }}>{wins}</span>
                        <span style={{ fontSize: "14px", color: "#888", textTransform: "uppercase", letterSpacing: "2px" }}>Wins</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#ef4444" }}>{losses}</span>
                        <span style={{ fontSize: "14px", color: "#888", textTransform: "uppercase", letterSpacing: "2px" }}>Losses</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#fff" }}>{winRate}%</span>
                        <span style={{ fontSize: "14px", color: "#888", textTransform: "uppercase", letterSpacing: "2px" }}>Win Rate</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: pnlColor }}>{pnlSign}{pnl}</span>
                        <span style={{ fontSize: "14px", color: "#888", textTransform: "uppercase", letterSpacing: "2px" }}>P&L (SOL)</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#fff" }}>{totalBets}</span>
                        <span style={{ fontSize: "14px", color: "#888", textTransform: "uppercase", letterSpacing: "2px" }}>Total Bets</span>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "28px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#555",
                        fontSize: "14px",
                    }}
                >
                    <span>devnet.goalscore.fun</span>
                    <span>•</span>
                    <span>AI-Powered Football Predictions on Solana</span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
