import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <Zap className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">
            goalnad<span className="text-primary">.fun</span>
          </span>
        </Link>
        <p className="font-mono text-[11px] text-muted-foreground">
          Built on Monad Testnet
        </p>
      </div>
    </footer>
  );
}
