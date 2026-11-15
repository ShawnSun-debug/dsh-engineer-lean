/**
 * 预设契约：cordis.patch.yml 是生成物，一次手改或一次基底漂移就会让
 * "省钱机制"或"只留一种 PTC"悄悄失效，而失效时的症状是加载报错或费用翻倍。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PATCH = readFileSync(join(ROOT, "cordis.patch.yml"), "utf8");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const PERSONA = readFileSync(join(ROOT, "presets", "persona-lean.txt"), "utf8").replace(/\r\n/g, "\n").trimEnd();

const PHANTOM = [
  "ds-adopt", "ds-best-of-n", "ds-blueprint", "ds-catchup", "ds-design", "ds-design-audit",
  "ds-explain", "ds-help", "ds-jury", "ds-ledger", "ds-lessons", "ds-pr", "ds-pr-comments",
  "ds-ready", "ds-review-loop", "ds-revive", "ds-sharpen", "ds-ship", "ds-swarm",
  "ds-unslop", "ds-watch-pr",
];
const mentions = (text, name) => new RegExp("(^|[^A-Za-z0-9_-])" + name + "(?![A-Za-z0-9_-])").test(text);

test("只声明一个预设，注入清单只有一个 insert", () => {
  assert.equal((PATCH.match(/^- insert:/gm) || []).length, 1, "多出来的 insert 会让预设列表出现重复项");
  assert.match(PATCH, /^ {4}- id: preset-engineer-lean$/m);
  assert.match(PATCH, /^ {8}id: engineer-lean$/m);
  assert.match(PATCH, /^ {8}order: 25$/m);
});

test("带着精简档的四条省钱机制", () => {
  assert.match(PATCH, /thresholdRatio: 0\.25/, "压缩阈值不是 0.25，会退回默认 0.8");
  assert.match(PATCH, /retainTokens: 20000/);
  assert.match(PATCH, /thresholdChars: 8192/);
  assert.match(PATCH, /sampleOverCapGlobResults: false/);
});

test("只留一种 PTC 实现，且是 tool-presentation", () => {
  assert.match(PATCH, /@deepseek-ai\/dsh-agent-tool-presentation/);
  assert.match(PATCH, /^ {14}mode: ptc$/m);
  assert.ok(!PATCH.includes("tool-executor-ptc"), "两种 PTC 并存会重复注册 run_code");
});

test("技能载体指向本包，且不带 guard 配置", () => {
  assert.match(PATCH, / {10}- id: skill-engineer\n {12}name: dsh-engineer-lean\n/);
  assert.ok(!/ {10}- id: skill-engineer\n {12}name: dsh-engineer-lean\n {12}config:/.test(PATCH), "本包没有 guard，不该出现 config");
});

test("persona 在最精简预算内，且只引用真实存在的技能", () => {
  assert.ok(PERSONA.length <= 400, "persona 超预算（极端档上限 400 字符）：" + PERSONA.length + " 字符");
  const rules = PERSONA.split("\n").filter((line) => line.trim().startsWith("- "));
  assert.ok(rules.length <= 6, "persona 超过 6 条：" + rules.length);
  for (const name of PHANTOM) {
    assert.ok(!mentions(PERSONA, name), "persona 引用了未随包分发的技能：" + name);
  }
  // 不点名 8 个常驻技能是刻意设计：何时用由各技能自己的 description 承载，persona 不再写第二份目录。
  assert.ok(!mentions(PERSONA, "ds-tdd"), "极端档里不该再写技能触发映射");
});

test("patch 里的 persona 与 presets/persona-lean.txt 同步", () => {
  const lines = PERSONA.split("\n").filter(Boolean);
  assert.ok(PATCH.includes(" ".repeat(16) + lines[0]), "首行不同步：忘了重跑 build-bundle");
  assert.ok(PATCH.includes(" ".repeat(16) + lines[lines.length - 1]), "末行不同步：忘了重跑 build-bundle");
});

test("vendored 基底在盘上且会被打包", () => {
  const base = "presets/base/flash-lean-ptc-v3.patch.yml";
  assert.ok(existsSync(join(ROOT, base)), "缺 vendored 基底：" + base);
  assert.ok((PKG.files ?? []).some((e) => base === e || base.startsWith(e + "/")), "基底不会被打包");
});
