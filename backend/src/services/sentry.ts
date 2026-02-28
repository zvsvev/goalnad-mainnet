import * as Sentry from "@sentry/node";
import { config } from "../config.js";

export function initSentry() {
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: 1.0,
        });
        console.log("✅ Sentry initialized");
    }
}
