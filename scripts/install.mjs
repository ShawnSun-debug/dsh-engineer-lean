#!/usr/bin/env node
/**
 * 把本包注册成 profile bundle（设置里的插件清单里才看得见它）。
 *
 *   node scripts/install.mjs --check
 *   node scripts/install.mjs --apply  --profile <name>
 *   node scripts/install.mjs --remove --profile <name>
 *   node scripts/install.mjs --verify --profile <name>
 *
 * --apply 写三处（都留 .bak-<时间戳>）：
 *   1. profile/package.json 依赖 link:<本目录>
 *   2. profile/package.json 的 dsh.profile.bundles 追加包名（追加到末尾）
 *   3. profile/node_modules/<包名> 的 junction（失败回退为目录复制）
 * 预设行由本包的 cordis.patch.yml 提供，加载器按 bundle 自动应用。
 */
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const PKG = JSON.parse(readFileSync(join(HERE, "package.json"), "utf8"));
const PKG_NAME = PKG.name;
const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");
const SKILLS_DIR = join(HERE, "assets", "skills");
const MANIFEST = join(HERE, "skills.manifest.json");

const readJson = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return undefined; } };
const backup = (file) => copyFileSync(file, file + ".bak-" + new Date().toISOString().replace(/[:.]/g, "-"));
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

const skills = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  : [];

const argv = process.argv.slice(2);
const mode = argv[0] || "--check";
const at = argv.indexOf("--profile");
const PROFILE_NAME = at >= 0 ? argv[at + 1] : null;
const profileDir = PROFILE_NAME ? join(DSH_HOME, "profiles", PROFILE_NAME) : null;

console.log(`package: ${PKG_NAME} ${PKG.version} | resident skills: ${skills.length}`);

if (mode === "--check") {
  console.log("check: no profile touched");
  process.exit(0);
}

if (!profileDir) {
  console.error("usage: node scripts/install.mjs [--check|--apply|--remove|--verify] --profile <name>");
  process.exit(2);
}

const pkgFile = join(profileDir, "package.json");
const linkPath = join(profileDir, "node_modules", PKG_NAME);

function ensureLink() {
  mkdirSync(join(profileDir, "node_modules"), { recursive: true });
  if (existsSync(linkPath)) {
    const st = lstatSync(linkPath);
    if (st.isSymbolicLink()) unlinkSync(linkPath);
    else rmSync(linkPath, { recursive: true, force: true });
  }
  try {
    symlinkSync(HERE, linkPath, "junction");
    return "junction";
  } catch {
    cpSync(HERE, linkPath, { recursive: true });
    return "copy";
  }
}

if (mode === "--apply") {
  const pkg = readJson(pkgFile);
  if (!pkg) { console.error("读不了 " + pkgFile); process.exit(1); }
  backup(pkgFile);
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies[PKG_NAME] = "link:" + HERE.replace(/\\/g, "/");
  pkg.dsh = pkg.dsh || {};
  pkg.dsh.profile = pkg.dsh.profile || {};
  const bundles = pkg.dsh.profile.bundles || [];
  if (!bundles.includes(PKG_NAME)) bundles.push(PKG_NAME); // 追加到末尾：层叠顺序里最后才生效
  pkg.dsh.profile.bundles = bundles;
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  const how = ensureLink();
  console.log("dependency: link:" + HERE);
  console.log("bundles: " + bundles.join(", "));
  console.log("node_modules: " + how);
  console.log("");
  console.log("装好了 —— 重启 DSH，预设列表里选 「Engineer lean」");
  process.exit(0);
}

if (mode === "--remove") {
  const pkg = readJson(pkgFile);
  if (!pkg) { console.error("读不了 " + pkgFile); process.exit(1); }
  backup(pkgFile);
  if (pkg.dependencies) delete pkg.dependencies[PKG_NAME];
  const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || [];
  if (pkg.dsh && pkg.dsh.profile) pkg.dsh.profile.bundles = bundles.filter((b) => b !== PKG_NAME);
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  if (existsSync(linkPath)) rmSync(linkPath, { recursive: true, force: true });
  console.log("已移除依赖、bundles 条目与 node_modules 链接");
  process.exit(0);
}

if (mode === "--verify") {
  const fails = [];
  const say = (ok, label, detail) => {
    console.log((ok ? "PASS " : "FAIL ") + label + (detail ? "  " + detail : ""));
    if (!ok) fails.push(label);
  };
  say(existsSync(profileDir), "profile exists", profileDir);
  const pkg = readJson(pkgFile);
  if (!pkg) { console.log("FAIL 读不了 " + pkgFile); process.exit(1); }
  const dep = pkg.dependencies && pkg.dependencies[PKG_NAME];
  say(!!dep, "dependency declared", dep || "(missing)");
  const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || [];
  say(bundles.includes(PKG_NAME), "bundle registered", "index " + bundles.indexOf(PKG_NAME) + " / " + bundles.length);
  say(existsSync(linkPath), "package present in node_modules", linkPath);
  say(skills.length === 8, "resident skills on disk", skills.length + " skills");

  const patchFile = join(HERE, "cordis.patch.yml");
  if (!existsSync(patchFile)) say(false, "bundle patch exists", patchFile);
  else {
    const patch = readFileSync(patchFile, "utf8");
    const inserts = (patch.match(/^- insert:/gm) || []).length;
    say(inserts === 1, "bundle patch has exactly one insert", String(inserts));
    say(patch.includes("preset-engineer-lean"), "bundle patch has preset-engineer-lean");
    say(!patch.includes("tool-executor-ptc"), "only one PTC implementation (tool-presentation)");
    say(patch.includes("mode: ptc"), "tool-presentation is in ptc mode");
    say(/thresholdRatio: 0\.25/.test(patch), "compaction threshold 0.25");
    say(patch.includes("retainTokens: 20000"), "compaction retainTokens 20000");
    say(patch.includes("thresholdChars: 8192"), "tool-result pruner threshold 8192");
    say(patch.includes("sampleOverCapGlobResults: false"), "fs-search sampling disabled");
  }

  // skills.manifest.json 的 sha256 必须与实际文件一致
  const manifest = readJson(MANIFEST);
  let bad = [];
  if (!manifest || !Array.isArray(manifest.skills)) say(false, "skills.manifest.json readable");
  else {
    for (const entry of manifest.skills) {
      const file = join(SKILLS_DIR, entry.name, "SKILL.md");
      if (!existsSync(file)) { bad.push(entry.name + "(missing)"); continue; }
      if (sha256(file) !== entry.sha256) bad.push(entry.name + "(hash)");
    }
    say(bad.length === 0, "skills.manifest.json matches files", bad.length ? bad.join(", ") : manifest.skills.length + " skills");
  }

  // 与已装 dsh-engineer-mode 的漂移：只 warn
  const sibling = join(profileDir, "node_modules", "dsh-engineer-mode", "assets", "skills");
  if (existsSync(sibling) && manifest && Array.isArray(manifest.skills)) {
    const drift = [];
    for (const entry of manifest.skills) {
      const mine = join(SKILLS_DIR, entry.name, "SKILL.md");
      const theirs = join(sibling, entry.name, "SKILL.md");
      if (existsSync(mine) && existsSync(theirs) && sha256(mine) !== sha256(theirs)) drift.push(entry.name);
    }
    if (drift.length) console.log("WARN 与 dsh-engineer-mode 的技能副本漂移：" + drift.join(", ") + "（本包不自动同步）");
    say(true, "drift check done", drift.length ? drift.length + " drifted" : "in sync");
  }

  console.log("");
  console.log(fails.length ? "verify: FAILED — " + fails.join(", ") : "verify: ok — restart DSH, then pick 「Engineer lean」");
  process.exit(fails.length ? 1 : 0);
}

console.error("usage: node scripts/install.mjs [--check|--apply|--remove|--verify] --profile <name>");
process.exit(1);
