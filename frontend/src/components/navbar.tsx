import Link from "next/link";
import { Zap, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            goalnad<span className="text-primary">.fun</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden border-primary/30 font-mono text-[10px] text-primary sm:inline-flex"
          >
            MONAD TESTNET
          </Badge>
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
