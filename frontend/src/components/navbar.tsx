import Link from "next/link";
import { Zap, Bot, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/apple-touch-icon.png" alt="GoalNad Logo" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">
            GoalNad<span className="text-primary">.Fun</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="font-mono text-xs text-primary border-primary/20 hover:bg-primary/10"
            asChild
          >
            <a
              href="https://nad.fun/tokens/0xB8D8B36Ff6D2145F54345db2a96021BcA8637777"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <CircleDollarSign className="h-3.5 w-3.5" />
              BUY $GOAL
            </a>
          </Button>
          <Button
            size="sm"
            className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/register-agent">
              <Bot className="mr-1.5 h-3 w-3" />
              REGISTER YOUR AGENT
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
