import Link from "next/link";
import { Youtube, Mail } from "lucide-react";

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

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <a href="https://www.youtube.com/@GoalNadFun" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              <Youtube className="h-4 w-4" />
            </a>
            <a href="https://x.com/GoalNadFun" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <a href="mailto:human@goalnad.fun" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            Contact (MANAGED BY HUMANS): human@goalnad.fun
          </a>
        </div>
      </div>
    </footer>
  );
}
