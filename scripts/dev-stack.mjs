import { spawn, spawnSync } from "node:child_process";

const commands = [
  ["docker", ["compose", "up", "-d"]],
  ["pnpm", ["exec", "prisma", "generate"]]
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

let migrateResult = spawnSync(
  "pnpm",
  ["exec", "prisma", "migrate", "deploy"],
  { stdio: "inherit" }
);

if (migrateResult.status !== 0) {
  migrateResult = spawnSync("pnpm", ["exec", "prisma", "migrate", "dev"], {
    stdio: "inherit"
  });
}

if (migrateResult.status !== 0) {
  process.exit(migrateResult.status ?? 1);
}

const seedResult = spawnSync("pnpm", ["db:seed"], { stdio: "inherit" });

if (seedResult.status !== 0) {
  process.exit(seedResult.status ?? 1);
}

const nextDev = spawn("pnpm", ["dev"], { stdio: "inherit" });

nextDev.on("exit", (code) => {
  process.exit(code ?? 0);
});
