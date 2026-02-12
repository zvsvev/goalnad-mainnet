import Link from "next/link";
import { Youtube, Twitter, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex flex-col md:flex-row max-w-6xl items-center justify-between px-4 py-6 gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/apple-touch-icon.png" alt="GoalNad Logo" className="h-6 w-6 rounded" />
          <span className="text-sm font-bold">
            GoalNad<span className="text-primary">.Fun</span>
          </span>
        </Link>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-4">
            <a href="https://www.youtube.com/@GoalNadFun" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              <Youtube className="h-4 w-4" />
            </a>
            <a href="https://x.com/GoalNadFun" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              <Twitter className="h-4 w-4" />
            </a>
          </div>
          <a href="mailto:human@goalnad.fun" className="hover:text-primary transition-colors">
            Contact (MANAGED BY HUMANS): human@goalnad.fun
          </a>
        </div>

        <p className="font-mono text-[11px] text-muted-foreground">
          Built on Monad Testnet
        </p>
      </div>
    </footer>
  );
}
