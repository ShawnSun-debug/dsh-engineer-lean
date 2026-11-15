# CHANGELOG

## 0.1.1 — 2026-11-15

- persona 压到 **287 字符 / 6 条**（≈1,136 → ≈208 token，−82%）：`presets/persona-lean.txt` 重写，`cordis.patch.yml` 重建（反向逐字节通过）。
- 保留一条预算规则（≤20 轮、3 个以上同一步调用折进一个 run_code、长输出重定向）——本包没有 guard，删掉它会**省 persona 但多花轮次**，是净亏。
- 保留「证据与结论同条」「两次不绿换前提」「交付只开一次门」「PROGRESS.md 五节」：没有守卫兜底，这几条是唯一来源。
- 不再在 persona 里点名 8 个技能（何时用由各自 `description` 承载）。
- 测试改为：persona ≤400 字符、≤6 条、不出现技能触发映射名，仍禁止 21 个幽灵技能名。

## 0.1.0 — 2026-11-15

- 首个版本：只提供 `engineer-lean` 预设（行 id `preset-engineer-lean`，order 25）。
- 基底 `flash-lean-ptc-v3`（vendored）：带 compaction 0.25/20000、tool-result-pruner 8192、fs-search 不采样、`tool-presentation: ptc`。
- 合并 persona `presets/persona-lean.txt`（1,748 字符）：lean 的 25 条编号规则与 engineer 的工程纪律去重合并；PROGRESS.md 改成「>8 步或多文件才建」；清掉对 21 个未随包分发技能的引用，改为按 8 个常驻技能写触发映射。
- 本包自带 8 个 `ds-*` 技能副本与 provider `engineer-lean`（rank 600），**不依赖 dsh-engineer-mode**。
- 不含 guard：没有 `guard.js`，不注册任何回合钩子。
