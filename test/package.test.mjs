/**
 * 打包契约：package.json 的 files 必须覆盖运行与重建会用到的文件。
 * 理由：tarball 里缺了 persona 或 vendored 基底，拿到包的人既改不了人设也重建不了 patch。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const REQUIRED = [
  "lib/index.js",
  "cordis.patch.yml",
  "presets/persona-lean.txt",
  "presets/base/flash-lean-ptc-v3.patch.yml",
  "assets/skills/ds-mode/SKILL.md",
  "skills.manifest.json",
  "scripts/install.mjs",
  "scripts/build-bundle.mjs",
  "scripts/check-drift.mjs",
  "README.md",
];

const coveredByFiles = (relative) => (pkg.files ?? []).some((entry) => relative === entry || relative.startsWith(entry + "/"));

test("files 覆盖运行与重建需要的文件", () => {
  const missing = REQUIRED.filter((relative) => existsSync(join(ROOT, relative)) && !coveredByFiles(relative));
  assert.deepEqual(missing, [], "这些文件不会被打包：" + missing.join(", "));
});

test("files 里的条目真实存在", () => {
  const missing = (pkg.files ?? []).filter((entry) => !existsSync(join(ROOT, entry)));
  assert.deepEqual(missing, [], "files 列了不存在的条目：" + missing.join(", "));
});

test("dsh.bundle.patch 指向真实文件", () => {
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.ok(existsSync(join(ROOT, "cordis.patch.yml")));
});
