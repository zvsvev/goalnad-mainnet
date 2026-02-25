"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /register-agent — GoalScore.fun no longer has AI agents.
 * Redirect to the homepage.
 */
export default function RegisterAgentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
