"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "@/components/ui/toast";

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivyProvider
        appId="cmm1k9mbf001m0bky2uzpj9wi"
        config={{
          appearance: {
            theme: "dark",
            accentColor: "#00ff88",
            logo: "/logo.png",
          },
          loginMethods: ["email", "google", "twitter", "wallet"],
          externalWallets: {
            solana: {
              connectors: solanaConnectors,
            },
          },
          embeddedWallets: {
            solana: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        {children}
        <ToastContainer />
      </PrivyProvider>
    </ThemeProvider>
  );
}

