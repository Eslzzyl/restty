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

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

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
