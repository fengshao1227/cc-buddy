# cc-buddy

Custom buddy toolkit for Claude Code `/buddy`. Full control over your companion's appearance, stats, and sprite.

```bash
npx cc-buddy
```

Node.js 16+ / Bun. Cross-platform. Bilingual (EN / ZH).

> 我的开源项目已链接认可 [LINUX DO](https://linux.do/) 社区

---

## What it does

Claude Code generates your `/buddy` pet deterministically from a hash. This tool patches `cli.js` to support a `companionOverride` config key, letting you set species, rarity, eyes, hat, shiny, stats, custom face, and custom sprite — all from an interactive menu.

Patching is AST-based (acorn), so it survives minifier renames across Claude Code versions.

## Usage

```bash
npx cc-buddy
```

```
[1] Customize buddy        ← pick species, rarity, stats, sprite...
[2] Search & apply buddy   ← hash brute-force (advanced)
[3] Check current buddy
[4] Species gallery
[5] Self-test hash
[6] Switch language
[7] Exit
```

The customize menu covers everything:

```
Customize Current Buddy
cat | legendary | eye:✦ | hat:crown | Nimbus

 [1] Name/Personality
 [2] Species
 [3] Rarity
 [4] Eyes
 [5] Hat
 [6] Shiny
 [7] Stats (0-100 per stat)
 [8] Custom face expression
 [9] Custom sprite (15 presets + paste JSON)
[10] Back
```

## Sprite presets

15 built-in animated sprites (3 frames each):

| Preset | Face | Preset | Face |
|--------|------|--------|------|
| Catgirl | `( ✦ w ✦ )` | Bear | `( ✦ ᴥ ✦ )` |
| Fox | `( ✦ ω ✦)` | Devil | `( ✦ v ✦ )` |
| Bunny | `( ✦ · ✦ )` | Alien | `/ ✦ ✦ \` |
| Pikachu | `( ✦ ▽ ✦ )` | Slime | `/ ✦ ✦ \` |
| Kirby | `( ✦ ▽ ✦ )` | Totoro | `( ✦ △ ✦ )` |
| Cthulhu | `( ✦ }{ ✦ )` | Miku | `( ✦ ∀ ✦ )` |
| Panda | `( ✦ _ ✦ )` | Bat | `(✦ w ✦)` |
| CXK | `(◉ _ ◉)` | | |

You can also paste custom sprite JSON directly in the menu.

## CLI

```bash
npx cc-buddy search -s dragon -r legendary --shiny
npx cc-buddy check
npx cc-buddy apply <userID>
npx cc-buddy --check-patches
npx cc-buddy gallery
```

## Manual config

Power users can edit `~/.claude.json` directly:

```jsonc
{
  "companion": {
    "name": "Foxfire",
    "personality": "A mischievous fox who smells memory leaks",
    "hatchedAt": 1743465600000
  },
  "companionOverride": {
    "species": "fox",
    "rarity": "legendary",
    "eye": "◉",
    "hat": "wizard",
    "shiny": true,
    "stats": { "DEBUGGING": 100, "PATIENCE": 100, "CHAOS": 0, "WISDOM": 100, "SNARK": 0 },
    "customFace": "({E}ω{E})",
    "customSprite": [
      ["            ", "   /\\_/\\    ", "  ( {E} ω {E})  ", "  /|    |\\  ", " (_|    |_) "],
      ["            ", "   /\\_/\\    ", "  ( {E} ω {E})  ", "  /|    |\\  ", " (_|    |_)~"],
      ["    ~ ~     ", "   /\\_/\\    ", "  ( {E} ω {E})  ", "  /|    |\\  ", " (_|    |_) "]
    ]
  }
}
```

Only include fields you want to override. Restart Claude Code after editing.

### Custom sprite format

- JSON array, 1-3 frames, each frame = 5 strings
- ~12 chars per line, equal width
- `{E}` = eye placeholder (replaced at runtime)
- Line 0 = hat slot (blank in frame 0-1, effects in frame 2)
- Frame 0 = idle, 1 = fidget, 2 = sparkle

## How it works

Uses acorn to parse Claude Code's minified `cli.js`, walks the AST to find 6 functions by structural signature, and injects override support:

| Target | Patch |
|--------|-------|
| `isBuddyLive()` | Remove access gates, unlock `/buddy` |
| `buddyReactAPI()` | Remove essentialTraffic check, enable speech bubbles |
| `getCompanion()` | Read `companionOverride` from config, merge into bones |
| `renderSprite()` | Fall back to `customSprite` if set |
| `spriteFrameCount()` | Return `customSprite.length` |
| `renderFace()` | Fall back to `customFace` if set |

Claude Code auto-updates replace `cli.js`. Re-run `npx cc-buddy` after each update.

## Species (18)

duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk

## Requirements

- Claude Code >= 2.1.89
- Node.js >= 16 or Bun

## License

MIT

---

## 中文

工具默认英文，首次运行时可切换到中文。

自定义宠物菜单覆盖所有属性（物种/稀有度/眼睛/帽子/闪光/属性/表情/精灵图），15 款精灵图预设可直接选用。高手可以编辑 `~/.claude.json` 的 `companionOverride` 字段。

Claude Code 更新后补丁会丢失，重新跑 `npx cc-buddy` 即可。

> 我的开源项目已链接认可 [LINUX DO](https://linux.do/) 社区
