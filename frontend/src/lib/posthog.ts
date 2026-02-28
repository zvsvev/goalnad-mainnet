import posthog from "posthog-js";

// Initialize PostHog on the frontend
// Replace POSTHOG_API_KEY with your actual project API key
export function initPostHog() {
    if (
        typeof window !== "undefined" &&
        process.env.NEXT_PUBLIC_POSTHOG_API_KEY &&
        !posthog.has_opted_out_capturing()
    ) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
            person_profiles: "identified_only",
        });
    }
}
