import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { spawn } from "zigpty";
import { WebSocketServer } from "ws";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  rewriteKittyFileMediaToDirect,
  type KittyMediaRewriteState,
} from "../src/pty/kitty-media";

const port = Number(process.env.PTY_PORT ?? 8787);
const defaultShell = process.env.SHELL ?? "fish";
const textDecoder = new TextDecoder();
const forceGhosttyProfile = process.env.RESTTY_PTY_FORCE_GHOSTTY === "1";
const rewriteKittyFileMedia = process.env.RESTTY_KITTY_REWRITE_FILE_MEDIA === "1";

type PtySession = {
  url: URL;
  kittyState: KittyMediaRewriteState;
  ttyPath?: string;
};

type ShellSpec = {
  cmd: string;
  args: string[];
  label: string;
};

type ClientControlMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number; widthPx?: number; heightPx?: number };

function parseClientControlMessage(text: string): ClientControlMessage | null {
  try {
    const parsed = JSON.parse(text) as {
      type?: unknown;
      data?: unknown;
      cols?: unknown;
      rows?: unknown;
      widthPx?: unknown;
      heightPx?: unknown;
    };
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "input" && typeof parsed.data === "string") {
      return { type: "input", data: parsed.data };
    }
    if (
      parsed.type === "resize" &&
      typeof parsed.cols === "number" &&
      typeof parsed.rows === "number"
    ) {
      return {
        type: "resize",
        cols: parsed.cols,
        rows: parsed.rows,
        widthPx: typeof parsed.widthPx === "number" ? parsed.widthPx : undefined,
        heightPx: typeof parsed.heightPx === "number" ? parsed.heightPx : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function looksLikeJsonControlPayload(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) return false;
  return trimmed.includes("\"type\"");
}

function resolveTtyPath(pid: number): string | null {
  if (!Number.isFinite(pid) || pid <= 0) return null;
  const result = spawnSync("ps", ["-o", "tty=", "-p", String(pid)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  const raw = (result.stdout ?? "").trim();
  if (!raw || raw === "?" || raw === "??") return null;
  if (raw.startsWith("/dev/")) return raw;
  return `/dev/${raw}`;
}

function parseShellSpec(spec: string | null | undefined): ShellSpec | null {
  if (!spec) return null;
  const trimmed = spec.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/g);
  return {
    cmd: parts[0] ?? trimmed,
    args: parts.slice(1),
    label: trimmed,
  };
}

function buildShellCandidates(shellParam: string | null): ShellSpec[] {
  const candidates: ShellSpec[] = [];
  const add = (spec: ShellSpec | null) => {
    if (!spec) return;
    if (candidates.some((c) => c.cmd === spec.cmd && c.args.join(" ") === spec.args.join(" "))) return;
    candidates.push(spec);
  };

  add(parseShellSpec(shellParam));
  add(parseShellSpec(process.env.SHELL));
  add(parseShellSpec(defaultShell));
  add({ cmd: "/opt/homebrew/bin/fish", args: [], label: "/opt/homebrew/bin/fish" });
  add({ cmd: "/usr/local/bin/fish", args: [], label: "/usr/local/bin/fish" });
  add({ cmd: "/bin/zsh", args: [], label: "/bin/zsh" });
  add({ cmd: "/bin/bash", args: [], label: "/bin/bash" });
  add({ cmd: "/bin/sh", args: [], label: "/bin/sh" });
  add({ cmd: "/usr/bin/zsh", args: [], label: "/usr/bin/zsh" });
  add({ cmd: "/usr/bin/bash", args: [], label: "/usr/bin/bash" });
  add({ cmd: "/usr/bin/env", args: ["zsh"], label: "env zsh" });
  add({ cmd: "/usr/bin/env", args: ["bash"], label: "env bash" });
  add({ cmd: "/usr/bin/env", args: ["sh"], label: "env sh" });
  return candidates;
}

function spawnWithFallbacks(
  candidates: ShellSpec[],
  cols: number,
  rows: number,
  cwd: string,
  env: Record<string, string | undefined>,
  kittyState: KittyMediaRewriteState,
  send: (data: string | Uint8Array) => void,
) {
  const errors: string[] = [];
  const decoder = new TextDecoder();
  const readKittyMediaFile = rewriteKittyFileMedia
    ? (path: string) => new Uint8Array(readFileSync(path))
    : () => {
        throw new Error("kitty file-media rewrite disabled");
      };
  const handleOutputText = (text: string) => {
    if (!text) return;
    const rewritten = rewriteKittyFileMediaToDirect(text, kittyState, readKittyMediaFile);
    if (rewritten.length > 0) send(rewritten);
  };

  for (const candidate of candidates) {
    try {
      const pty = spawn(candidate.cmd, candidate.args, {
        cols,
        rows,
        cwd,
        env: env as Record<string, string>,
        terminal: {
          data(_term, data) {
            try {
              if (typeof data === "string") {
                handleOutputText(data);
                return;
              }
              if (data instanceof ArrayBuffer) {
                handleOutputText(decoder.decode(data, { stream: true }));
                return;
              }
              if (ArrayBuffer.isView(data)) {
                handleOutputText(decoder.decode(data as Uint8Array, { stream: true }));
                return;
              }
            } catch {}
          },
        },
      });
      return { pty, shell: candidate.label, errors };
    } catch (err) {
      errors.push(`${candidate.label}: ${(err as Error)?.message ?? err}`);
    }
  }
  return { pty: null, shell: "", errors };
}

// --- HTTP + WebSocket server ---

const sessionMap = new WeakMap<import("ws").WebSocket, PtySession>();

const httpServer = createServer((_req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("restty pty server");
});

const wss = new WebSocketServer({ server: httpServer, path: "/pty" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/pty", `http://${req.headers.host ?? "localhost"}`);
  const session: PtySession = { url, kittyState: { remainder: "" } };
  sessionMap.set(ws, session);

  const cols = Number(url.searchParams.get("cols") ?? 80);
  const rows = Number(url.searchParams.get("rows") ?? 24);
  const shellParam = url.searchParams.get("shell") ?? defaultShell;
  const cwd = url.searchParams.get("cwd") ?? process.cwd();

  const env: Record<string, string | undefined> = { ...process.env };
  if (forceGhosttyProfile) {
    env.TERM = env.TERM || "xterm-ghostty";
    env.COLORTERM = env.COLORTERM || "truecolor";
    env.NVIM_TUI_ENABLE_TRUE_COLOR = env.NVIM_TUI_ENABLE_TRUE_COLOR || "1";
    env.TERM_PROGRAM = "ghostty";
    env.TERM_PROGRAM_VERSION = env.TERM_PROGRAM_VERSION || "1.0";
    env.SNACKS_GHOSTTY = "1";
  }

  const candidates = buildShellCandidates(shellParam);
  const { pty, shell, errors } = spawnWithFallbacks(
    candidates,
    Number.isFinite(cols) ? cols : 80,
    Number.isFinite(rows) ? rows : 24,
    cwd,
    env,
    session.kittyState,
    (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    },
  );

  if (!pty) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to spawn shell",
      errors,
    }));
    ws.close();
    return;
  }

  session.ttyPath = resolveTtyPath(pty.pid);

  try {
    ws.send(JSON.stringify({ type: "status", shell }));
  } catch {}

  // Wait for the PTY process to exit
  pty.exited
    .then((code: number) => {
      try {
        ws.send(JSON.stringify({ type: "exit", code }));
      } catch {}
      try {
        ws.close();
      } catch {}
    })
    .catch(() => {
      try {
        ws.send(JSON.stringify({ type: "exit", code: 1 }));
      } catch {}
      try {
        ws.close();
      } catch {}
    });

  ws.on("message", (raw) => {
    const data = typeof raw === "string" ? raw : raw instanceof Buffer ? raw : raw instanceof ArrayBuffer
      ? Buffer.from(raw)
      : Buffer.from(raw as Uint8Array);

    const handleControlText = (text: string): boolean => {
      const msg = parseClientControlMessage(text);
      if (!msg) return false;
      if (msg.type === "input") {
        pty.write(msg.data);
        return true;
      }
      const resizeCols = Number(msg.cols);
      const resizeRows = Number(msg.rows);
      if (Number.isFinite(resizeCols) && Number.isFinite(resizeRows)) {
        pty.resize(resizeCols, resizeRows);
      }
      return true;
    };

    if (typeof data === "string") {
      const text = data;
      if (handleControlText(text)) return;
      if (looksLikeJsonControlPayload(text)) return;
      pty.write(text);
      return;
    }

    if (Buffer.isBuffer(data)) {
      const text = textDecoder.decode(data as Uint8Array);
      if (handleControlText(text)) return;
      if (looksLikeJsonControlPayload(text)) return;
      pty.write(text);
      return;
    }
  });

  ws.on("close", () => {
    try {
      pty.kill();
    } catch {}
  });
});

httpServer.listen(port, () => {
  console.log(`restty pty server running on ws://localhost:${port}/pty`);
});
