/**
 * Real-time HTTP API for the Fraud Detection Agent.
 *
 * Exposes the agent to a payment system:
 *   POST /score   -> score a single transaction (block/review/allow)
 *   GET  /metrics -> current rolling metrics & thresholds
 *   POST /reset   -> reset running counters
 *   GET  /health  -> liveness probe
 *
 * The server uses only Node's built-in `http` module so it runs with zero
 * external dependencies.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { FraudAgent, type AgentConfig } from "./agent.ts";
import type { Transaction } from "./types.ts";

export interface ApiOptions {
  port?: number;
  config?: Partial<AgentConfig>;
}

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export function createApp(agent: FraudAgent) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";
    const started = Date.now();
    if (process.env.LOG_REQUESTS === "1") {
      res.on("finish", () => {
        console.log(
          `${method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`
        );
      });
    }

    try {
      if (method === "GET" && url.pathname === "/health") {
        return send(res, 200, { status: "ok" });
      }
      if (method === "GET" && url.pathname === "/version") {
        return send(res, 200, { name: "fraud-detection-agent", version: "1.0.0" });
      }
      if (method === "GET" && url.pathname === "/metrics") {
        return send(res, 200, agent.getMetrics());
      }
      if (method === "POST" && url.pathname === "/reset") {
        agent.reset();
        return send(res, 200, { status: "reset" });
      }
      if (method === "POST" && url.pathname === "/score") {
        const raw = await readBody(req);
        let tx: Transaction;
        try {
          tx = JSON.parse(raw) as Transaction;
        } catch {
          return send(res, 400, { error: "invalid JSON body" });
        }
        if (!tx.id || typeof tx.amount !== "number") {
          return send(res, 400, { error: "missing required fields: id, amount" });
        }
        const scored = agent.process(tx);
        const httpStatus = scored.decision === "block" ? 200 : 200;
        return send(res, httpStatus, scored);
      }
      if (method === "POST" && url.pathname === "/score/batch") {
        const raw = await readBody(req);
        let txs: Transaction[];
        try {
          const parsed = JSON.parse(raw);
          txs = Array.isArray(parsed) ? parsed : parsed.transactions;
        } catch {
          return send(res, 400, { error: "invalid JSON body" });
        }
        if (!Array.isArray(txs) || txs.length === 0) {
          return send(res, 400, {
            error: "body must be a non-empty array of transactions",
          });
        }
        const results = txs.map((tx) => {
          if (!tx.id || typeof tx.amount !== "number") {
            return { error: "missing required fields: id, amount", tx };
          }
          return agent.process(tx);
        });
        return send(res, 200, { count: results.length, results });
      }
      return send(res, 404, { error: "not found" });
    } catch (err) {
      return send(res, 500, { error: (err as Error).message });
    }
  });
}

export function startServer(opts: ApiOptions = {}) {
  const agent = new FraudAgent(opts.config);
  const server = createApp(agent);
  const port = opts.port ?? 8080;
  server.listen(port, () => {
    console.log(`Fraud Detection Agent listening on http://localhost:${port}`);
  });
  return { server, agent };
}

// Allow running as a standalone process.
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env.PORT ?? 8080);
  startServer({ port });
}