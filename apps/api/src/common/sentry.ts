export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  console.log("[Sentry] DSN configured but SDK not installed (stub). Install @sentry/nestjs to activate.");
}
