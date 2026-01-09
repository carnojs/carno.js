import { Elysia } from "elysia";

const DEFAULT_PORT = 3002;

function buildUserPayload(id: string) {
  return {
    id,
    name: "User",
  };
}

function buildEchoPayload(body: Record<string, unknown>) {
  return {
    ok: true,
    body,
  };
}

function resolvePort(): number {
  const envValue = Number(process.env.PORT);

  if (Number.isFinite(envValue) && envValue > 0) {
    return envValue;
  }

  return DEFAULT_PORT;
}

function handleHealth() {
  const payload = "ok";

  return payload;
}

function handleJson() {
  const payload = { ok: true };

  return payload;
}

function handleUser(params: { id: string }) {
  const payload = buildUserPayload(params.id);

  return payload;
}

function handleEcho(body: Record<string, unknown>) {
  const payload = buildEchoPayload(body);

  return payload;
}

function handleUserRoute(context: { params: { id: string } }) {
  const payload = handleUser(context.params);

  return payload;
}

function handleEchoRoute(context: { body: unknown }) {
  const body = (context.body ?? {}) as Record<string, unknown>;
  const payload = handleEcho(body);

  return payload;
}

function registerHealthRoute(app: Elysia): void {
  app.get("/", handleHealth);
}

function registerJsonRoute(app: Elysia): void {
  app.get("/json", handleJson);
}

function registerUserRoute(app: Elysia): void {
  app.get("/users/:id", handleUserRoute);
}

function registerEchoRoute(app: Elysia): void {
  app.post("/json", handleEchoRoute);
}

function registerRoutes(app: Elysia): void {
  registerHealthRoute(app);
  registerJsonRoute(app);
  registerUserRoute(app);
  registerEchoRoute(app);
}

async function start(): Promise<void> {
  const app = new Elysia();
  const port = resolvePort();

  registerRoutes(app);

  app.listen(port);
}

await start();
