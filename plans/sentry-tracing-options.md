# Sentry tracing options

Breadcrum currently initializes Sentry for error reporting while keeping OpenTelemetry ownership in `packages/web/otel.js`:

```js
Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  skipOpenTelemetrySetup: true,
})
```

The app also starts its own OpenTelemetry `NodeSDK` with Prometheus metrics, runtime metrics, host metrics, HTTP instrumentation, and Fastify instrumentation.

If we later want Sentry performance traces, there are a few reasonable paths.

## Option A: Let Sentry own tracing and Fastify instrumentation

Use Sentry's Node SDK tracing setup and Fastify integration directly.

```js
Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0.05'),
  integrations: [
    Sentry.fastifyIntegration({
      shouldHandleError (error, _request, reply) {
        return shouldHandleSentryError(error, reply.statusCode)
      },
    }),
  ],
})
```

Then use Sentry's Fastify error helper:

```js
Sentry.setupFastifyErrorHandler(fastify, {
  shouldHandleError (error, _request, reply) {
    return shouldHandleSentryError(error, reply.statusCode)
  },
})
```

### Benefits

- Uses Sentry's intended Node/Fastify integration path.
- Sentry's Fastify integration is present, so `shouldHandleError` is wired through the SDK.
- Sentry can coordinate Fastify diagnostics-channel and `onError` hook behavior.

### Risks / work required

- Breadcrum already has a custom OpenTelemetry `NodeSDK`.
- Letting Sentry also set up OpenTelemetry can cause duplicate instrumentation, duplicate spans, competing global providers, or duplicate trace propagation.
- This path likely requires removing or refactoring parts of the current custom OTel setup, especially `HttpInstrumentation` and `FastifyOtelInstrumentation`.
- Sentry's Node OTel setup does not create a metrics provider, `PrometheusExporter`, or metric readers, so Prometheus metrics ownership must stay in Breadcrum or be replaced deliberately.
- `RuntimeNodeInstrumentation` is Breadcrum-owned runtime metrics instrumentation; Sentry does not currently set it up.
- `HostMetrics` and custom `otel-metrics` plugin metrics are also Breadcrum-owned.

### When to choose this

Choose this if Sentry should become the primary owner of tracing instrumentation and we are willing to simplify or migrate the current OTel bootstrap.

## Option B: Keep Breadcrum's OTel setup and export spans to Sentry

Keep `skipOpenTelemetrySetup: true`, continue owning OTel in `packages/web/otel.js`, and wire Sentry into the existing OTel provider with `@sentry/opentelemetry`.

Conceptually:

```js
import {
  SentryAsyncLocalStorageContextManager,
  SentryPropagator,
  SentrySampler,
  SentrySpanProcessor,
  setupEventContextTrace,
  setOpenTelemetryContextAsyncContextStrategy,
} from '@sentry/opentelemetry'

Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  skipOpenTelemetrySetup: true,
  tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0.05'),
})

const sentryClient = Sentry.getClient()
setupEventContextTrace(sentryClient)

export const sdk = new NodeSDK({
  sampler: new SentrySampler(sentryClient),
  spanProcessors: [
    new SentrySpanProcessor(),
  ],
  textMapPropagator: new SentryPropagator(),
  contextManager: new SentryAsyncLocalStorageContextManager(),
  metricReader: new PrometheusExporter({ port: 9091 }),
  instrumentations: [
    new HttpInstrumentation(),
    new RuntimeNodeInstrumentation({ monitoringPrecision: 5000 }),
    new FastifyOtelInstrumentation({
      registerOnInitialization: true,
      ignorePaths: routeOptions => routeOptions.url in ignoredRoutes,
    }),
  ],
})

sdk.start()
setOpenTelemetryContextAsyncContextStrategy()
```

### Benefits

- Preserves Breadcrum's current OTel ownership.
- Keeps Prometheus metrics, host metrics, runtime metrics, and custom Fastify instrumentation in one place.
- Avoids enabling a second OTel SDK/provider.
- Lets Sentry receive spans without taking over instrumentation.

### Risks / work required

- More advanced setup than Sentry's default `Sentry.init` path.
- Need to verify context propagation and trace correlation between Sentry errors and OTel spans.
- The Sentry Fastify integration may still not be present unless explicitly added, so the direct Fastify `onError` hook remains the simpler error-capture path.
- Requires adding and validating `@sentry/opentelemetry` usage if it is not already available.

### When to choose this

Choose this if Breadcrum should keep its existing OTel/Prometheus setup and only export sampled traces to Sentry.

## Option C: Sentry owns tracing, Breadcrum owns metrics

Let Sentry set up the tracer provider, context manager, propagator, and the tracing instrumentations it ships with. Keep Breadcrum responsible for metrics that Sentry does not set up.

The intended ownership split would be:

| Concern | Owner | Notes |
| --- | --- | --- |
| Sentry error reporting | Breadcrum plugin | Keep the direct Fastify `onError` hook and `shouldHandleSentryError` filter unless deliberately migrating back to Sentry's Fastify error helper. |
| Trace provider / propagation / span processor | Sentry | Let `Sentry.init` set these up by not using `skipOpenTelemetrySetup: true`. |
| Fastify request spans | Sentry | Use Sentry's `fastifyIntegration`; remove Breadcrum's `FastifyOtelInstrumentation` to avoid duplicate Fastify plugin/hook instrumentation. |
| HTTP client/server spans | Sentry | Let Sentry's HTTP integration own HTTP tracing; do not also patch HTTP with Breadcrum's `HttpInstrumentation` unless we have verified there is no duplicate wrapping. |
| Prometheus exporter / metric reader | Breadcrum | Sentry does not set up metrics readers/exporters. |
| Custom app metrics | Breadcrum | Keep `packages/web/plugins/otel-metrics.js` and `packages/worker/plugins/otel-metrics.js`. |
| Host metrics | Breadcrum | Keep `HostMetrics`; Sentry does not set this up. |
| Runtime Node metrics | Breadcrum | Keep `RuntimeNodeInstrumentation`; in the installed package it creates metrics collectors for event loop, GC, and V8 heap spaces, and does not create spans. Sentry does not set this up. |
| HTTP duration metrics from `HttpInstrumentation` | Unresolved | These metrics are coupled to `@opentelemetry/instrumentation-http`'s HTTP patching/span lifecycle, so they are not cleanly separable from HTTP tracing. |

Conceptually:

```js
Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  release: sentryRelease,
  tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0.05'),
  integrations: [
    Sentry.fastifyIntegration(),
  ],
})

export const sdk = new NodeSDK({
  metricReader: new PrometheusExporter({ port: 9091 }),
  instrumentations: [
    new RuntimeNodeInstrumentation({ monitoringPrecision: 5000 }),
  ],
})

sdk.start()
new HostMetrics({ meterProvider: metrics.getMeterProvider() }).start()
```

This sketch intentionally removes `FastifyOtelInstrumentation` and `HttpInstrumentation` from Breadcrum's OTel SDK because those overlap with Sentry tracing ownership.

### The HTTP metrics caveat

Breadcrum currently uses `HttpInstrumentation` metrics. In the installed `@opentelemetry/instrumentation-http`, HTTP duration histograms are recorded from the same instrumentation path that patches HTTP and closes HTTP spans. There does not appear to be a clean "metrics only, no HTTP tracing/patching" mode.

That means Option C has three sub-options:

1. Accept losing OTel HTTP instrumentation metrics initially, while keeping custom app metrics, host metrics, and runtime Node metrics.
2. Recreate the required HTTP server metrics manually in Fastify hooks, likely `onRequest`/`onResponse`, and separately decide whether outgoing HTTP metrics are needed.
3. Experiment with keeping `HttpInstrumentation` alongside Sentry HTTP tracing, but treat this as risky until verified because it may duplicate HTTP wrapping, spans, or propagation behavior.

### When to choose this

Choose this only if Sentry should own traces and we have either accepted losing current HTTP instrumentation metrics or replaced them with Breadcrum-owned metrics. This is not a drop-in migration if the HTTP metrics are important.

## Ownership summary

Sentry's Node OTel setup is tracing-oriented. It sets up tracing provider/context/propagation/span processing, but not a metrics provider or Prometheus exporter.

Breadcrum should continue to own:

- `PrometheusExporter` and metric reader setup.
- Custom application metrics.
- `HostMetrics`.
- `RuntimeNodeInstrumentation` metrics.

The only metric area that conflicts with Sentry-owned tracing is HTTP metrics from `HttpInstrumentation`, because those are tied to HTTP instrumentation that also creates spans.

## Current recommendation

Do not enable Sentry tracing just to fix benign 4xx error capture.

For now:

- Keep `skipOpenTelemetrySetup: true`.
- Keep the existing OpenTelemetry setup.
- Keep Sentry focused on error capture.
- Use the direct Fastify `onError` hook with `shouldHandleSentryError` so filtering works without depending on Sentry's Fastify tracing integration.

If we revisit tracing later, Option B is likely the safest starting point for Breadcrum because it preserves the current observability architecture, including HTTP instrumentation metrics.

If we specifically want Sentry to own tracing, Option C is viable only after deciding what replaces or intentionally drops `HttpInstrumentation` metrics. `RuntimeNodeInstrumentation` can remain Breadcrum-owned in that model because it is metrics-only and does not overlap with Sentry's tracing setup.
