# cc-buddy 🎰

> Claude Code `/buddy` 宠物重铸器 — 自选物种、稀有度、眼睛、帽子、闪光

**Interactive pet reroller for Claude Code `/buddy`. Pick your dream pet.**

## 一键运行 / Quick Start

```bash
npx cc-buddy
```

零依赖，Node.js 16+ / Bun 均可。首次运行自动选语言（中文/English）。

## 功能 / Features

- 🔍 **交互式搜索** — 逐步选择物种、稀有度、眼睛、帽子、闪光
- 👀 **查看当前宠物** — 自动检测 OAuth / userID
- 📋 **物种图鉴** — 18 物种 × 5 稀有度 × 6 眼睛 × 8 帽子 × 闪光
- ✅ **一键写入** — 自动备份配置、自动处理 OAuth 用户
- 🌐 **双语** — 中文 / English
- 🧪 **Hash 自检** — 验证 wyhash 纯 JS 实现与 Bun.hash 一致

## 物种一览

| 🦆 duck | 🪿 goose | 🫧 blob | 🐱 cat | 🐉 dragon | 🐙 octopus |
|---------|---------|---------|--------|-----------|------------|
| 🦉 owl | 🐧 penguin | 🐢 turtle | 🐌 snail | 👻 ghost | 🦎 axolotl |
| 🦫 capybara | 🌵 cactus | 🤖 robot | 🐰 rabbit | 🍄 mushroom | 🐈 chonk |

## 稀有度

| 稀有度 | 概率 |
|--------|------|
| ★ common | 60% |
| ★★ uncommon | 25% |
| ★★★ rare | 10% |
| ★★★★ epic | 4% |
| ★★★★★ legendary | 1% |

闪光（Shiny）: 任意稀有度均有 1% 概率

## CLI 模式

高级用户也可以直接传参：

```bash
# 搜传说级闪光龙 + 法师帽 + ✦ 眼
npx cc-buddy search -s dragon -r legendary --hat wizard --eye '✦' --shiny

# 查看当前配置的宠物
npx cc-buddy check

# 写入配置
npx cc-buddy apply <userID>

# 物种图鉴
npx cc-buddy gallery

# 验证 hash 实现
npx cc-buddy selftest

# 切换语言
npx cc-buddy lang
```

## 原理

Claude Code 的 `/buddy` 宠物系统分两层：

- **Bones（骨架）** — 物种、稀有度、眼睛、帽子、属性，由 `hash(userID + SALT)` 确定性生成
- **Soul（灵魂）** — 名字和性格，由模型生成，存储在 `~/.claude.json`

本工具通过暴力搜索 userID，找到能生成目标宠物的 hash 种子，写入配置即可。

### 技术细节

- Claude Code 是 Bun 打包的，使用 `Bun.hash()`（wyhash 算法）
- 本工具包含**纯 JS wyhash 实现**，已验证与 Bun.hash 输出 100% 一致
- Node.js 和 Bun 均可运行，结果完全相同
- OAuth 用户自动处理 `accountUuid` → `userID` 回退

## 要求

- **Claude Code >= 2.1.89**（`/buddy` 命令首次可用的版本）
- Node.js >= 16 或 Bun
- 工具会自动检测版本，过旧会提示更新

## 许可

MIT
