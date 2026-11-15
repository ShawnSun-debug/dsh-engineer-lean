# NOTICE

本包携带的上游内容：

| 文件 | 来源 | 许可 |
|---|---|---|
| `presets/base/flash-lean-ptc-v3.patch.yml` | `dsh-flash-presets`（精简·PTC v3） | MIT |
| `assets/skills/*` | `dsh-engineer-mode` 0.11.0 的 `assets/skills`，字节复制 | MIT（上游为 aicodeking/deepseek-stack，MIT） |

`presets/base/` 只用于 `scripts/build-bundle.mjs` 重建 `cordis.patch.yml`，本包不修改它。
技能副本与 `dsh-engineer-mode` 的差异用 `node scripts/check-drift.mjs` 检查（只 warn）。
