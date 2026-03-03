import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex flex-col max-w-6xl items-center justify-center px-4 py-6 gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/apple-touch-icon.png" width={24} height={24} alt="GoalScore Logo" className="h-6 w-6 rounded-none" />
          <span className="text-sm font-bold">
            GoalScore<span className="text-primary">.fun</span>
          </span>
        </Link>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/GoalScoreFun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
              aria-label="X (Twitter)"
            >
              <svg className="h-4 w-4 fill-muted-foreground hover:fill-primary transition-colors" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span>Built on Solana</span>
            <span className="text-border">·</span>
            <a
              href="https://docs.goalscore.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Docs
            </a>
            <span className="text-border">·</span>
            <Link href="/goal" className="hover:text-primary transition-colors">
              $GOAL Token
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
