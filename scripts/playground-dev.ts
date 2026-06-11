import { spawn } from "node:child_process";

const children = [
  spawn("tsx", ["playground/pty-server.ts"], {
    stdio: "inherit",
  }),
  spawn("pnpx", ["vite", "--config", "vite.playground.config.ts"], {
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(signalCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
  process.exit(signalCode);
}

// Cross-platform signal handling.
// SIGINT/SIGTERM work on Windows since Node.js 0.10+.
process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

// Windows fallback: when spawned children share the console, Ctrl+C may
// be intercepted by the child before reaching the parent's SIGINT handler.
// This raw-mode stdin listener catches Ctrl+C at the input level.
if (process.platform === "win32" && process.stdin?.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (data: Buffer) => {
    if (data.length === 1 && data[0] === 0x03) {
      shutdown(130);
    }
  });
}

// Wait for any child to exit
await Promise.race(
  children.map(
    (child) =>
      new Promise<void>((resolve) => {
        child.on("exit", (code) => {
          shutdown(code ?? 1);
          resolve();
        });
      }),
  ),
);
