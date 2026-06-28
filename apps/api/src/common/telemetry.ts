export function initTelemetry() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  // Placeholder: real init would use @opentelemetry/sdk-node
  console.log("[OTel] Telemetry endpoint configured but SDK not installed (stub)");
}
