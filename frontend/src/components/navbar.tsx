import Link from "next/link";
import { Bot } from "lucide-react";
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
