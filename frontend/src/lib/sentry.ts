import * as Sentry from "@sentry/nextjs";

// Initialize Sentry on the frontend
// Replace SENTRY_DSN with your actual DSN from standard env vars
export function initSentry() {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            tracesSampleRate: 1.0,
            debug: false,
        });
    }
}
