# dsh-engineer-lean

一个 DSH 插件包，只提供一个 agent preset：**Engineer lean**。

它把两件事合在一起：

1. **精简·PTC v3 的省钱机制** —— 四个真实杠杆，全部来自 `presets/base/flash-lean-ptc-v3.patch.yml`：
   `compaction thresholdRatio 0.25 / retainTokens 20000`、`tool-result-pruner thresholdChars 8192`、
   `fs-search sampleOverCapGlobResults: false`、`tool-presentation: ptc`（run_code 折叠工具调用）。
2. **engineer 的深度** —— 8 个常驻 `ds-*` 技能（本包自带副本 + 自己的 provider，rank 600）与一套压缩后的工程纪律。

**没有 guard**：本包不注册 `agent/pre-step` / `agent/turn-stopping` 任何钩子，纪律只靠人设散文。

## 它每轮注入什么

`presets/persona-lean.txt` 全文作为 system prompt 后缀注入。它把 lean 的预算/安全规则与 engineer 的工程纪律**去重合并成一份连续编号**：

| 组合 | persona | 8 条技能 description | 每轮常驻 |
|---|---|---|---|
| 精简·PTC v3（对照） | 4,023 字符 ≈ 1,006 tok | 0 | ≈ 1,006 tok |
| engineer mode（对照，guard 开） | **295 字符 ≈ 198 tok** | ≈ 360 tok | ≈ 558 tok |
| **Engineer lean（本包）** | **287 字符 ≈ 208 tok**（2026-11-15 从 1,748/1,136 压缩） | ≈ 360 tok | **≈ 568 tok** |
| 两套直接相加 | 5,477 字符 ≈ 1,845 tok | ≈ 360 tok | ≈ 2,205 tok |

口径：中文按 1 token/字、ASCII 按 1/4 字符**估算**，不是 API 实测。

## 装

```powershell
node scripts/install.mjs --apply --profile desktop
node scripts/install.mjs --verify --profile desktop
```

装完重启 DSH，预设列表里的 **Engineer lean** 就是本包提供的。

## 改

```powershell
# 改人设 → 改 presets/persona-lean.txt，然后必须重建（测试会拦不同步）
node scripts/build-bundle.mjs
# 校对生成结果（反向逐字节校验，不写盘）
node scripts/build-bundle.mjs --check
# 测试
node --test test/preset.test.mjs test/package.test.mjs
```

`cordis.patch.yml` 是生成物，不要手改：`test/preset.test.mjs` 会断言它与 `presets/persona-lean.txt` 同步。

## 边界

- 基底已 vendored 在 `presets/base/`，重建不依赖本机 DSH 装在哪。上游升级后刷新该文件再重跑 build-bundle。
- 技能副本与 `dsh-engineer-mode` 是两份文件：改了那边不同步这里，两边会漂移。用 `node scripts/check-drift.mjs` 看差异（只 warn，不阻断）。
- 只留一种 PTC 实现：本包用 `tool-presentation: ptc`，**不含** `tool-executor-ptc`。两者并存会重复注册 `run_code`。
- 默认档不归本包管：预设列表里选它才会用它。
