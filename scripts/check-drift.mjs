#!/usr/bin/env node
/**
 * 报本包 8 个技能副本与已装 dsh-engineer-mode 的差异（只报告，不修改）。
 *
 *   node scripts/check-drift.mjs [--profile desktop]
 *
 * 退出码：0 = 一致或对方不存在；1 = 有漂移。
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");
const at = process.argv.indexOf("--profile");
const profile = at >= 0 ? process.argv[at + 1] : "desktop";
const MINE = join(HERE, "assets", "skills");
const THEIRS = join(DSH_HOME, "profiles", profile, "node_modules", "dsh-engineer-mode", "assets", "skills");

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const names = readdirSync(MINE, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

if (!existsSync(THEIRS)) {
  console.log("对端不存在，跳过：" + THEIRS);
  process.exit(0);
}

let drift = 0;
for (const name of names) {
  const mine = join(MINE, name, "SKILL.md");
  const theirs = join(THEIRS, name, "SKILL.md");
  if (!existsSync(theirs)) { console.log("ONLY-HERE " + name); drift += 1; continue; }
  if (sha256(mine) !== sha256(theirs)) {
    console.log("DRIFT     " + name);
    drift += 1;
  }
}
console.log("");
console.log(drift === 0 ? "in sync: " + names.length + " skills identical" : drift + " drifted / missing");
process.exit(drift === 0 ? 0 : 1);
