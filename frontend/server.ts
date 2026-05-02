import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// email → WebSocket connection
const clients = new Map<string, WebSocket>();
// email → last known unread count (to avoid redundant pushes)
const lastCount = new Map<string, number>();

async function pollUser(email: string, ws: WebSocket): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/notifications?unread_only=true`, {
      headers: { "X-User-Email": email, "Content-Type": "application/json" },
    });
    if (!res.ok) return;
    const body = await res.json();
    const notifications: unknown[] = body.notifications ?? [];
    const newCount = notifications.length;
    const known = lastCount.get(email) ?? -1;
    if (newCount !== known) {
      lastCount.set(email, newCount);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "notifications", data: notifications }));
      }
    }
  } catch {
    // network errors are expected when backend is down — ignore silently
  }
}

async function pollAll(): Promise<void> {
  for (const [email, ws] of clients) {
    if (ws.readyState !== WebSocket.OPEN) {
      clients.delete(email);
      lastCount.delete(email);
      continue;
    }
    await pollUser(email, ws);
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server, path: "/ws/notifications" });

  wss.on("connection", (ws) => {
    let registeredEmail: string | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "auth" && typeof msg.email === "string" && msg.email) {
          const email: string = msg.email.toLowerCase().trim();
          registeredEmail = email;
          // Evict any previous socket for this email
          const prev = clients.get(email);
          if (prev && prev !== ws) {
            prev.close();
          }
          clients.set(email, ws);
          lastCount.set(email, -1); // force push on first poll
          pollUser(email, ws);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (registeredEmail) {
        clients.delete(registeredEmail);
        lastCount.delete(registeredEmail);
      }
    });

    ws.on("error", () => ws.close());
  });

  // Poll backend for every connected user every 15 seconds
  setInterval(pollAll, 15_000);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
