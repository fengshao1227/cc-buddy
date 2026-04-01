#!/usr/bin/env node

/**
 * 🎰 Claude Buddy Reroller v2.0.0
 *
 * Interactive pet reroller for Claude Code /buddy.
 * Just run it — no args needed. Guided step by step.
 *
 * Interactive:  npx claude-buddy-reroll
 * CLI mode:     node buddy-reroll.mjs search --species duck --rarity legendary
 *
 * Cross-platform: Node.js (v16+) / Bun. Bilingual: EN / 中文.
 * Based on Claude Code 2.1.89 source analysis.
 */

import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, copyFileSync, realpathSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'

// ══════════════════════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════════════════════

const VERSION = '2.0.0'
const SALT = 'friend-2026-401'
const CONFIG_PATH = join(homedir(), '.claude.json')
const PREF_PATH = join(homedir(), '.claude-buddy.json')
const MIN_CLAUDE_VERSION = '2.1.89'

const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl',
  'penguin', 'turtle', 'snail', 'ghost', 'axolotl', 'capybara',
  'cactus', 'robot', 'rabbit', 'mushroom', 'chonk',
]
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
const EYES = ['·', '✦', '×', '◉', '@', '°']
const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck']
const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']
const RARITY_FLOOR = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 }

const SPECIES_EMOJI = {
  duck: '🦆', goose: '🪿', blob: '🫧', cat: '🐱', dragon: '🐉',
  octopus: '🐙', owl: '🦉', penguin: '🐧', turtle: '🐢', snail: '🐌',
  ghost: '👻', axolotl: '🦎', capybara: '🦫', cactus: '🌵', robot: '🤖',
  rabbit: '🐰', mushroom: '🍄', chonk: '🐈',
}
const HAT_EMOJI = {
  none: '—', crown: '👑', tophat: '🎩', propeller: '🧢',
  halo: '😇', wizard: '🧙', beanie: '⛑', tinyduck: '🐤',
}
const RARITY_STARS = { common: '★', uncommon: '★★', rare: '★★★', epic: '★★★★', legendary: '★★★★★' }

// ══════════════════════════════════════════════════════════
//  ANSI Colors
// ══════════════════════════════════════════════════════════

const NO_COLOR = !!process.env.NO_COLOR || process.argv.includes('--no-color')
const IS_TTY = process.stdout.isTTY !== false
const ESC = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  white: '\x1b[37m', gray: '\x1b[90m',
}
const RARITY_CLR = { common: ESC.white, uncommon: ESC.green, rare: ESC.blue, epic: ESC.magenta, legendary: ESC.yellow }
const c = (code, text) => (!NO_COLOR && IS_TTY) ? `${code}${text}${ESC.reset}` : text

// ══════════════════════════════════════════════════════════
//  i18n
// ══════════════════════════════════════════════════════════

let L = 'en'
const I = {
  banner:          { en: '🎰 Claude Buddy Reroller',          zh: '🎰 Claude Buddy 宠物重铸器' },
  runtime_bun:     { en: 'Runtime: Bun ✓',                    zh: '运行时: Bun ✓' },
  runtime_node:    { en: 'Runtime: Node.js (wyhash fallback)', zh: '运行时: Node.js (wyhash 回退)' },
  // Menu
  menu_title:      { en: 'What would you like to do?',        zh: '你想做什么？' },
  menu_search:     { en: '🔍  Search for a buddy',            zh: '🔍  搜索宠物' },
  menu_check:      { en: '👀  Check current buddy',           zh: '👀  查看当前宠物' },
  menu_gallery:    { en: '📋  Species gallery',               zh: '📋  物种图鉴' },
  menu_selftest:   { en: '🧪  Self-test hash',                zh: '🧪  自检 Hash' },
  menu_lang:       { en: '🌐  Switch language',               zh: '🌐  切换语言' },
  menu_exit:       { en: '👋  Exit',                          zh: '👋  退出' },
  // Search interactive
  si_species:      { en: 'Pick a species (or Enter to skip):',  zh: '选择物种 (回车跳过):' },
  si_rarity:       { en: 'Pick rarity (or Enter for auto-best):', zh: '选择稀有度 (回车自动找最好):' },
  si_auto_best:    { en: 'Auto (find highest rarity)',         zh: '自动 (找最高稀有度)' },
  si_eye:          { en: 'Pick eyes (or Enter to skip):',      zh: '选择眼睛 (回车跳过):' },
  si_hat:          { en: 'Pick hat (or Enter to skip):',       zh: '选择帽子 (回车跳过):' },
  si_any:          { en: 'Any',                                zh: '不限' },
  si_shiny:        { en: 'Require shiny? [y/N]:',             zh: '要求闪光? [y/N]:' },
  si_limit:        { en: 'Max attempts (default 5000000):',    zh: '最大迭代次数 (默认 5000000):' },
  si_apply_ask:    { en: 'Apply this buddy to your config? [Y/n]:', zh: '将此宠物写入配置? [Y/n]:' },
  si_applied:      { en: 'Done! Restart Claude Code and run /buddy.', zh: '完成! 重启 Claude Code 并输入 /buddy。' },
  si_skipped:      { en: 'Not applied. You can apply later with:', zh: '未写入。你可以稍后运行:' },
  si_again:        { en: 'Search again? [Y/n]:',              zh: '再搜一次? [Y/n]:' },
  si_back:         { en: 'Back to menu.',                      zh: '返回菜单。' },
  // Check
  chk_oauth_cur:   { en: '🔍 Current Buddy (OAuth):',         zh: '🔍 当前宠物 (OAuth):' },
  chk_oauth_warn:  { en: '⚠ OAuth active — this is what /buddy shows.', zh: '⚠ OAuth 已登录 — 这是 /buddy 显示的宠物。' },
  chk_after:       { en: '🔄 After apply (userID):',          zh: '🔄 apply 后 (userID):' },
  chk_cur:         { en: '🔍 Current Buddy (userID):',        zh: '🔍 当前宠物 (userID):' },
  chk_none:        { en: 'No config found. Search for a buddy first!', zh: '未找到配置。先搜索一个宠物吧!' },
  chk_no_id:       { en: 'No userID or OAuth account found.',  zh: '未找到 userID 或 OAuth 账号。' },
  // Gallery
  gal_species:     { en: '📋 All 18 Species:',                zh: '📋 全部 18 个物种:' },
  gal_rarities:    { en: '🎲 Rarities:',                      zh: '🎲 稀有度:' },
  gal_eyes:        { en: '👀 Eyes:',                           zh: '👀 眼睛:' },
  gal_hats:        { en: '🎩 Hats:',                          zh: '🎩 帽子:' },
  gal_shiny:       { en: 'Shiny: 1% chance. Common pets have no hats.', zh: '闪光: 1% 概率。普通品质没有帽子。' },
  // Search engine
  s_target:        { en: '🎯 Searching:',                     zh: '🎯 搜索:' },
  s_found:         { en: '→ Found:',                           zh: '→ 命中:' },
  s_done:          { en: 'Searched {0} in {1}s',               zh: '已搜索 {0} 次, 耗时 {1}s' },
  s_no_match:      { en: '✗ No match found. Try relaxing criteria.', zh: '✗ 未找到。试试放宽条件。' },
  s_best:          { en: '✓ BEST RESULT',                     zh: '✓ 最佳结果' },
  s_node_warn:     { en: '⚠ Node.js mode — use Bun for guaranteed accuracy.', zh: '⚠ Node.js 模式 — 建议用 Bun 确保准确。' },
  // Apply
  a_preview:       { en: 'Preview:',                           zh: '预览:' },
  a_backup:        { en: 'Backup:',                            zh: '备份:' },
  a_oauth:         { en: 'OAuth → removed accountUuid (login unaffected)', zh: 'OAuth → 已移除 accountUuid (登录不受影响)' },
  a_ok:            { en: '✓ Config updated!',                  zh: '✓ 配置已更新!' },
  a_restart:       { en: 'Restart Claude Code → /buddy',       zh: '重启 Claude Code → /buddy' },
  // Version
  v_ok:            { en: 'Claude Code {0} ✓',                 zh: 'Claude Code {0} ✓' },
  v_old:           { en: '✗ Claude Code {0} too old! Need >= {1}. Run: claude update', zh: '✗ Claude Code {0} 过旧! 需要 >= {1}。运行: claude update' },
  v_unknown:       { en: '⚠ Cannot detect Claude Code version. Need >= {0}.', zh: '⚠ 无法检测版本。需要 >= {0}。' },
  // Selftest
  t_title:         { en: '🧪 Self-Test: Hash',                zh: '🧪 自检: Hash' },
  t_ok:            { en: '✓ All match! wyhash-js accurate.',  zh: '✓ 全部匹配! wyhash-js 准确。' },
  t_fail:          { en: '✗ Mismatch! Use Bun for reliable results.', zh: '✗ 不匹配! 请用 Bun 运行。' },
  t_no_bun:        { en: '⚠ Install Bun to verify: curl -fsSL https://bun.sh/install | bash', zh: '⚠ 安装 Bun 验证: curl -fsSL https://bun.sh/install | bash' },
  // Lang
  lang_saved:      { en: '✓ Language: English',               zh: '✓ 语言: 中文' },
  // DIY soul
  diy_name:        { en: 'Give it a name (Enter to skip):',    zh: '给它取个名字 (回车跳过):' },
  diy_personality:  { en: 'Describe its personality (Enter to skip):', zh: '写一句性格描述 (回车跳过):' },
  diy_set:         { en: '✓ Custom soul applied: {0}',         zh: '✓ 自定义灵魂已写入: {0}' },
  diy_skip:        { en: 'Soul will be auto-generated by Claude on first /buddy.', zh: '灵魂将在首次 /buddy 时由 Claude 自动生成。' },
  // Menu
  menu_diy:        { en: '✏️   Customize name/personality',     zh: '✏️   自定义名字/性格' },
  menu_patch:      { en: '🔓  Full customize (patch cli.js)',   zh: '🔓  完全自定义 (patch cli.js)' },
  diy_no_buddy:    { en: 'No buddy found. Search and apply one first!', zh: '未找到宠物。先搜索并 apply 一个吧!' },
  diy_current:     { en: 'Current buddy:',                     zh: '当前宠物:' },
  diy_done:        { en: '✓ Buddy soul updated!',              zh: '✓ 宠物灵魂已更新!' },
  diy_cur_name:    { en: 'Current name: {0}',                  zh: '当前名字: {0}' },
  diy_cur_pers:    { en: 'Current personality: {0}',            zh: '当前性格: {0}' },
  // Patch
  patch_title:     { en: '🔓 Full Customize (patch mode)',      zh: '🔓 完全自定义 (patch 模式)' },
  patch_desc:      { en: 'This patches Claude Code cli.js so config values override computed bones.\n  You can set ANY species, rarity, eyes, hat, shiny, and stats.', zh: '此功能修改 Claude Code 的 cli.js，让配置值覆盖计算值。\n  可以自定义任意物种、稀有度、眼睛、帽子、闪光和属性。' },
  patch_npm_only:  { en: '⚠ Only works with npm global install (npm i -g @anthropic-ai/claude-code).\n  Does NOT work with native binary install (cli.anthropic.com).', zh: '⚠ 仅适用于 npm 全局安装 (npm i -g @anthropic-ai/claude-code)。\n  不适用于原生二进制安装 (cli.anthropic.com)。' },
  patch_not_found: { en: '✗ Claude Code cli.js not found at npm global path.\n  Install via: npm i -g @anthropic-ai/claude-code', zh: '✗ 未在 npm 全局路径找到 Claude Code cli.js。\n  安装方法: npm i -g @anthropic-ai/claude-code' },
  patch_already:   { en: '✓ Already patched!',                 zh: '✓ 已经 patch 过了!' },
  patch_backup:    { en: 'Backup: {0}',                        zh: '备份: {0}' },
  patch_ok:        { en: '✓ cli.js patched! Config values now override computed bones.', zh: '✓ cli.js 已 patch! 配置值现在可以覆盖计算值。' },
  patch_fail:      { en: '✗ Could not find the target pattern in cli.js. Version mismatch?', zh: '✗ 未在 cli.js 中找到目标代码。版本不匹配？' },
  patch_restore:   { en: 'Restore original: cp {0} {1}',       zh: '恢复原版: cp {0} {1}' },
  patch_species:   { en: 'Species (Enter = keep current):',    zh: '物种 (回车保持当前):' },
  patch_rarity:    { en: 'Rarity (Enter = keep current):',     zh: '稀有度 (回车保持当前):' },
  patch_eye:       { en: 'Eyes (Enter = keep current):',       zh: '眼睛 (回车保持当前):' },
  patch_hat:       { en: 'Hat (Enter = keep current):',        zh: '帽子 (回车保持当前):' },
  patch_shiny_q:   { en: 'Shiny? [y/N/Enter=keep]:',          zh: '闪光? [y/N/回车保持]:' },
  patch_stat:      { en: '{0} (0-100, Enter = keep):',         zh: '{0} (0-100, 回车保持):' },
  patch_written:   { en: '✓ Custom companion written! Restart Claude Code → /buddy', zh: '✓ 自定义宠物已写入! 重启 Claude Code → /buddy' },
  patch_confirm:   { en: 'Proceed with patch? [Y/n]:',         zh: '确认 patch? [Y/n]:' },
  // Prompt
  press_enter:     { en: 'Press Enter to continue...',         zh: '按回车继续...' },
}

function t(key, ...args) {
  const msg = I[key]?.[L] || I[key]?.['en'] || key
  return args.length ? msg.replace(/\{(\d+)\}/g, (_, i) => args[+i] ?? '') : msg
}

// ══════════════════════════════════════════════════════════
//  Prompt Helpers
// ══════════════════════════════════════════════════════════

function ask(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, ans => { rl.close(); resolve(ans.trim()) })
  })
}

async function select(title, items, allowSkip = false) {
  console.log(`\n  ${c(ESC.bold, title)}\n`)
  items.forEach((item, i) => console.log(`    ${c(ESC.cyan, `[${i + 1}]`)} ${item}`))
  if (allowSkip) console.log(`    ${c(ESC.dim, `[Enter] ${t('si_any')}`)}`)
  const ans = await ask(`\n  ${c(ESC.cyan, '>')} `)
  if (ans === '' && allowSkip) return -1
  const idx = parseInt(ans) - 1
  return idx >= 0 && idx < items.length ? idx : (allowSkip ? -1 : 0)
}

async function confirm(question, defaultYes = true) {
  const ans = await ask(`  ${question} `)
  if (ans === '') return defaultYes
  return ans.toLowerCase().startsWith('y')
}

// ══════════════════════════════════════════════════════════
//  Language Persistence
// ══════════════════════════════════════════════════════════

function loadLang() {
  const idx = process.argv.indexOf('--lang')
  if (idx !== -1) {
    const v = (process.argv[idx + 1] || '').toLowerCase()
    return (v === 'zh' || v === 'cn') ? 'zh' : 'en'
  }
  try {
    const d = JSON.parse(readFileSync(PREF_PATH, 'utf8'))
    if (d.lang === 'zh' || d.lang === 'en') return d.lang
  } catch {}
  return null
}

function saveLang(lang) {
  writeFileSync(PREF_PATH, JSON.stringify({ lang }, null, 2), 'utf8')
}

async function pickLang() {
  console.log('')
  console.log(c(ESC.bold + ESC.cyan, '  🎰 Claude Buddy Reroller') + c(ESC.dim, ` v${VERSION}`))
  console.log(`\n  ${c(ESC.bold, '🌐 Select language / 选择语言:')}\n`)
  console.log(`    ${c(ESC.cyan, '[1]')} English`)
  console.log(`    ${c(ESC.cyan, '[2]')} 中文`)
  const ans = await ask(`\n  ${c(ESC.cyan, '>')} `)
  const lang = ans.trim() === '2' ? 'zh' : 'en'
  saveLang(lang)
  console.log(c(ESC.green, `\n  ${lang === 'zh' ? I.lang_saved.zh : I.lang_saved.en}`))
  return lang
}

// ══════════════════════════════════════════════════════════
//  wyhash (pure JS, final v4)
// ══════════════════════════════════════════════════════════

const M64 = (1n << 64n) - 1n
const WYP = [0xa0761d6478bd642fn, 0xe7037ed1a0b428dbn, 0x8ebc6af09c88c6e3n, 0x589965cc75374cc3n]
function _wymix(A, B) { const r = (A & M64) * (B & M64); return ((r >> 64n) ^ r) & M64 }
function _wyr8(p, i) {
  return BigInt(p[i])|(BigInt(p[i+1])<<8n)|(BigInt(p[i+2])<<16n)|(BigInt(p[i+3])<<24n)|
    (BigInt(p[i+4])<<32n)|(BigInt(p[i+5])<<40n)|(BigInt(p[i+6])<<48n)|(BigInt(p[i+7])<<56n)
}
function _wyr4(p, i) { return BigInt(p[i])|(BigInt(p[i+1])<<8n)|(BigInt(p[i+2])<<16n)|(BigInt(p[i+3])<<24n) }
function _wyr3(p, i, k) { return (BigInt(p[i])<<16n)|(BigInt(p[i+(k>>1)])<<8n)|BigInt(p[i+k-1]) }
function wyhash(key, seed = 0n) {
  const len = key.length; seed = (seed ^ _wymix(seed ^ WYP[0], WYP[1])) & M64; let a, b
  if (len <= 16) {
    if (len >= 4) { a = ((_wyr4(key,0)<<32n)|_wyr4(key,((len>>3)<<2)))&M64; b = ((_wyr4(key,len-4)<<32n)|_wyr4(key,len-4-((len>>3)<<2)))&M64 }
    else if (len > 0) { a = _wyr3(key,0,len); b = 0n } else { a = 0n; b = 0n }
  } else {
    let i = len, p = 0
    if (i > 48) { let s1 = seed, s2 = seed; do { seed = _wymix(_wyr8(key,p)^WYP[1],_wyr8(key,p+8)^seed); s1 = _wymix(_wyr8(key,p+16)^WYP[2],_wyr8(key,p+24)^s1); s2 = _wymix(_wyr8(key,p+32)^WYP[3],_wyr8(key,p+40)^s2); p+=48;i-=48 } while(i>48); seed=(seed^s1^s2)&M64 }
    while (i > 16) { seed = _wymix(_wyr8(key,p)^WYP[1],_wyr8(key,p+8)^seed); i-=16; p+=16 }
    a = _wyr8(key,p+i-16); b = _wyr8(key,p+i-8)
  }
  a=(a^WYP[1])&M64; b=(b^seed)&M64; const r=(a&M64)*(b&M64); a=r&M64; b=(r>>64n)&M64
  return _wymix((a^WYP[0]^BigInt(len))&M64,(b^WYP[1])&M64)
}

// ══════════════════════════════════════════════════════════
//  Hash / PRNG / Roll
// ══════════════════════════════════════════════════════════

const IS_BUN = typeof globalThis.Bun !== 'undefined'
function hashString(s) { return IS_BUN ? Number(BigInt(Bun.hash(s))&0xffffffffn) : Number(wyhash(Buffer.from(s,'utf8'))&0xffffffffn) }
function fnv1a(s) { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)} return h>>>0 }
function mulberry32(seed) { let a=seed>>>0; return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296} }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)] }
function rollRarity(rng) { let roll=rng()*100; for(const r of RARITIES){roll-=RARITY_WEIGHTS[r];if(roll<0)return r} return 'common' }
function rollStats(rng, rarity) {
  const floor=RARITY_FLOOR[rarity], peak=pick(rng,STAT_NAMES); let dump=pick(rng,STAT_NAMES); while(dump===peak)dump=pick(rng,STAT_NAMES)
  const s={}; for(const n of STAT_NAMES){if(n===peak)s[n]=Math.min(100,floor+50+Math.floor(rng()*30));else if(n===dump)s[n]=Math.max(1,floor-10+Math.floor(rng()*15));else s[n]=floor+Math.floor(rng()*40)} return s
}
function rollBuddy(userId) {
  const rng=mulberry32(hashString(userId+SALT)),rarity=rollRarity(rng)
  return{rarity,species:pick(rng,SPECIES),eye:pick(rng,EYES),hat:rarity==='common'?'none':pick(rng,HATS),shiny:rng()<0.01,stats:rollStats(rng,rarity)}
}

// ══════════════════════════════════════════════════════════
//  Display
// ══════════════════════════════════════════════════════════

function statBar(v, w=20) { const f=Math.round((v/100)*w); return `${c(v>=80?ESC.green:v>=50?ESC.yellow:v>=30?ESC.white:ESC.red,'█'.repeat(f)+'░'.repeat(w-f))} ${v}` }
function formatBuddy(b, uid, verbose=true) {
  const lines = [''], rC = RARITY_CLR[b.rarity]
  lines.push(c(rC+ESC.bold, `  ${SPECIES_EMOJI[b.species]||'?'} ${b.species.toUpperCase()}`))
  lines.push(c(rC, `  ${RARITY_STARS[b.rarity]} ${b.rarity}`) + (b.shiny ? c(ESC.yellow+ESC.bold,' ✨ SHINY!') : ''))
  lines.push(c(ESC.gray, `  Eyes: ${b.eye}  |  Hat: ${HAT_EMOJI[b.hat]} ${b.hat}`))
  if (verbose) { lines.push(''); for (const [n,v] of Object.entries(b.stats)) lines.push(`  ${n.padEnd(10)} ${statBar(v)}`) }
  if (uid) { lines.push(''); lines.push(c(ESC.dim, `  UserID: ${uid}`)) }
  lines.push(''); return lines.join('\n')
}
function banner() {
  console.log(''); console.log(c(ESC.bold+ESC.cyan, `  ${t('banner')}`)+c(ESC.dim, ` v${VERSION}`))
  console.log(c(ESC.dim, `  ${IS_BUN ? t('runtime_bun') : t('runtime_node')}`)); console.log('')
}

// ══════════════════════════════════════════════════════════
//  Config / Version
// ══════════════════════════════════════════════════════════

function readConfig() { if(!existsSync(CONFIG_PATH))return null; try{return JSON.parse(readFileSync(CONFIG_PATH,'utf8'))}catch{return null} }
function compareVersions(a, b) { const pa=a.split('.').map(Number),pb=b.split('.').map(Number); for(let i=0;i<3;i++){if((pa[i]||0)>(pb[i]||0))return 1;if((pa[i]||0)<(pb[i]||0))return-1} return 0 }
function getClaudeVersion() {
  try { for(const p of [join(homedir(),'.local','bin','claude'),'/usr/local/bin/claude']){if(!existsSync(p))continue;try{const m=realpathSync(p).match(/(\d+\.\d+\.\d+)/);if(m)return m[1]}catch{}}
    const d=join(homedir(),'.local','share','claude','versions'); if(existsSync(d)){const v=readdirSync(d).filter(f=>/^\d+\.\d+\.\d+$/.test(f)).sort(compareVersions);if(v.length)return v[v.length-1]} } catch{}
  try{const m=execSync('claude --version',{timeout:5000,encoding:'utf8'}).match(/(\d+\.\d+\.\d+)/);if(m)return m[1]}catch{} return null
}
function checkVersion() {
  const v=getClaudeVersion()
  if(!v){console.log(c(ESC.yellow,`  ${t('v_unknown',MIN_CLAUDE_VERSION)}`));return'unknown'}
  if(compareVersions(v,MIN_CLAUDE_VERSION)<0){console.log(c(ESC.red+ESC.bold,`  ${t('v_old',v,MIN_CLAUDE_VERSION)}`));return'outdated'}
  console.log(c(ESC.dim,`  ${t('v_ok',v)}`));return'ok'
}
function doApply(newUid, soul = null) {
  const cfg=readConfig()||{}, isOAuth=!!cfg.oauthAccount?.accountUuid
  if(existsSync(CONFIG_PATH)){const bak=CONFIG_PATH+`.bak.${Date.now()}`;copyFileSync(CONFIG_PATH,bak);console.log(c(ESC.dim,`  ${t('a_backup')} ${bak}`))}
  if(isOAuth){const old=cfg.oauthAccount.accountUuid;delete cfg.oauthAccount.accountUuid;console.log(c(ESC.cyan,`  ${t('a_oauth')}`));console.log(c(ESC.dim,`  Old UUID: ${old}\n`))}
  cfg.userID=newUid
  if (soul && (soul.name || soul.personality)) {
    // Write custom soul — bones are always regenerated by Claude Code, but name/personality persist
    cfg.companion = { name: soul.name || '', personality: soul.personality || '', hatchedAt: Date.now() }
    console.log(c(ESC.magenta, `  ${t('diy_set', soul.name || '?')}`))
  } else {
    delete cfg.companion // Let Claude generate soul on first /buddy
    console.log(c(ESC.dim, `  ${t('diy_skip')}`))
  }
  writeFileSync(CONFIG_PATH,JSON.stringify(cfg,null,2),'utf8')
  console.log(c(ESC.green+ESC.bold,`  ${t('a_ok')}`));console.log(c(ESC.yellow,`  ${t('a_restart')}\n`))
}

function doCustomizeSoul(name, personality) {
  const cfg = readConfig()
  if (!cfg || !cfg.companion) return false
  if(existsSync(CONFIG_PATH)){const bak=CONFIG_PATH+`.bak.${Date.now()}`;copyFileSync(CONFIG_PATH,bak)}
  if (name) cfg.companion.name = name
  if (personality) cfg.companion.personality = personality
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
  return true
}

// ══════════════════════════════════════════════════════════
//  Search Engine
// ══════════════════════════════════════════════════════════

function matchesCriteria(buddy, cr) {
  if(cr.species&&buddy.species!==cr.species)return false;if(cr.rarity&&buddy.rarity!==cr.rarity)return false
  if(cr.eye&&buddy.eye!==cr.eye)return false;if(cr.hat&&buddy.hat!==cr.hat)return false
  if(cr.shiny!=null&&buddy.shiny!==cr.shiny)return false;return true
}
function doSearch(criteria, limit=5_000_000) {
  const results=[],start=Date.now();let best=null
  for(let i=0;i<limit;i++){
    const uid=randomBytes(32).toString('hex'),buddy=rollBuddy(uid)
    if(matchesCriteria(buddy,criteria)){
      if(!criteria.rarity){
        if(!best||RARITY_RANK[buddy.rarity]>RARITY_RANK[best.buddy.rarity]){
          best={uid,buddy,attempts:i+1};results.push(best)
          console.log(c(RARITY_CLR[buddy.rarity],`  ${t('s_found')} ${RARITY_STARS[buddy.rarity]} ${buddy.rarity} ${buddy.species}${buddy.shiny?' ✨':''}` + c(ESC.dim,` @ ${(i+1).toLocaleString()}`)))
          if(buddy.rarity==='legendary')break
        }
      } else { results.push({uid,buddy,attempts:i+1})
        console.log(c(RARITY_CLR[buddy.rarity],`  ${t('s_found')} ${RARITY_STARS[buddy.rarity]} ${buddy.rarity} ${buddy.species}${buddy.shiny?' ✨':''}` + c(ESC.dim,` @ ${(i+1).toLocaleString()}`)))
        break
      }
    }
    if(i>0&&i%500_000===0&&IS_TTY){const el=((Date.now()-start)/1000).toFixed(1);console.log(c(ESC.dim,`  ... ${i.toLocaleString()} (${el}s) ...`))}
  }
  console.log(c(ESC.dim,`\n  ${t('s_done',limit.toLocaleString(),((Date.now()-start)/1000).toFixed(2))}`))
  return results
}

// ══════════════════════════════════════════════════════════
//  Interactive Mode
// ══════════════════════════════════════════════════════════

async function interactiveSearch() {
  // 1. Species
  const spItems = SPECIES.map(s => `${SPECIES_EMOJI[s]}  ${s}`)
  const spIdx = await select(t('si_species'), spItems, true)
  const species = spIdx >= 0 ? SPECIES[spIdx] : null

  // 2. Rarity
  const rarItems = [t('si_auto_best'), ...RARITIES.map(r => `${c(RARITY_CLR[r], RARITY_STARS[r])} ${r} (${RARITY_WEIGHTS[r]}%)`)]
  const rarIdx = await select(t('si_rarity'), rarItems)
  const rarity = rarIdx > 0 ? RARITIES[rarIdx - 1] : null

  // 3. Eye
  const eyeItems = EYES.map(e => `  ${e}`)
  const eyeIdx = await select(t('si_eye'), eyeItems, true)
  const eye = eyeIdx >= 0 ? EYES[eyeIdx] : null

  // 4. Hat
  const hatItems = HATS.map(h => `${HAT_EMOJI[h]}  ${h}`)
  const hatIdx = await select(t('si_hat'), hatItems, true)
  const hat = hatIdx >= 0 ? HATS[hatIdx] : null

  // 5. Shiny
  const shinyAns = await ask(`\n  ${t('si_shiny')} `)
  const shiny = shinyAns.toLowerCase().startsWith('y') ? true : null

  // 6. Limit
  const limAns = await ask(`  ${t('si_limit')} `)
  const limit = parseInt(limAns) || 5_000_000

  // Build criteria
  const criteria = {}
  if (species) criteria.species = species
  if (rarity) criteria.rarity = rarity
  if (eye) criteria.eye = eye
  if (hat) criteria.hat = hat
  if (shiny) criteria.shiny = true

  if (Object.keys(criteria).length === 0) {
    criteria.rarity = 'legendary' // default: find any legendary
  }

  // Build display
  const parts = []
  if (criteria.shiny) parts.push('✨')
  if (criteria.rarity) parts.push(criteria.rarity)
  if (criteria.species) parts.push(`${SPECIES_EMOJI[criteria.species]} ${criteria.species}`)
  if (criteria.eye) parts.push(`eye:${criteria.eye}`)
  if (criteria.hat) parts.push(`hat:${criteria.hat}`)

  console.log(`\n  ${c(ESC.bold, `${t('s_target')} ${parts.join(' ')}`)}\n`)
  if (!IS_BUN) console.log(c(ESC.yellow, `  ${t('s_node_warn')}\n`))

  const results = doSearch(criteria, limit)

  if (results.length === 0) {
    console.log(c(ESC.red + ESC.bold, `\n  ${t('s_no_match')}\n`))
    return
  }

  const best = results[results.length - 1]
  console.log(c(ESC.bold + ESC.green, '\n  ════════════════════════════════════'))
  console.log(c(ESC.bold + ESC.green, `  ${t('s_best')}`))
  console.log(c(ESC.bold + ESC.green, '  ════════════════════════════════════'))
  console.log(formatBuddy(best.buddy, best.uid))

  // Ask to apply
  if (await confirm(t('si_apply_ask'), true)) {
    const verStatus = checkVersion()
    if (verStatus !== 'outdated') {
      // DIY soul
      console.log('')
      const customName = await ask(`  ${c(ESC.magenta, '✏️')} ${t('diy_name')} `)
      const customPers = customName ? await ask(`  ${c(ESC.magenta, '✏️')} ${t('diy_personality')} `) : ''
      const soul = (customName || customPers) ? { name: customName, personality: customPers } : null
      doApply(best.uid, soul)
      console.log(c(ESC.green + ESC.bold, `  ${t('si_applied')}\n`))
    }
  } else {
    console.log(c(ESC.dim, `\n  ${t('si_skipped')}`))
    console.log(c(ESC.cyan, `  node buddy-reroll.mjs apply ${best.uid}\n`))
  }
}

async function interactiveCheck() {
  const cfg = readConfig()
  if (!cfg) { console.log(c(ESC.yellow, `\n  ${t('chk_none')}\n`)); return }
  const oauthUuid = cfg.oauthAccount?.accountUuid, localUid = cfg.userID
  if (oauthUuid) {
    console.log(c(ESC.bold, `\n  ${t('chk_oauth_cur')}`))
    console.log(formatBuddy(rollBuddy(oauthUuid), oauthUuid))
    console.log(c(ESC.yellow, `  ${t('chk_oauth_warn')}\n`))
    if (localUid) { console.log(c(ESC.bold, `  ${t('chk_after')}`)); console.log(formatBuddy(rollBuddy(localUid), localUid)) }
  } else if (localUid) {
    console.log(c(ESC.bold, `\n  ${t('chk_cur')}`))
    console.log(formatBuddy(rollBuddy(localUid), localUid))
  } else { console.log(c(ESC.red, `\n  ${t('chk_no_id')}\n`)) }
  checkVersion()
}

function interactiveGallery() {
  console.log(c(ESC.bold, `\n  ${t('gal_species')}\n`))
  for (const sp of SPECIES) console.log(`    ${SPECIES_EMOJI[sp]}  ${sp}`)
  console.log(c(ESC.bold, `\n  ${t('gal_rarities')}\n`))
  for (const r of RARITIES) {
    const pct = RARITY_WEIGHTS[r], bar = '█'.repeat(Math.ceil(pct / 3)) + '░'.repeat(20 - Math.ceil(pct / 3))
    console.log(`    ${c(RARITY_CLR[r], `${RARITY_STARS[r].padEnd(6)} ${r.padEnd(10)}`)} ${bar} ${pct}%`)
  }
  console.log(c(ESC.bold, `\n  ${t('gal_eyes')}\n`)); console.log(`    ${EYES.join('  ')}`)
  console.log(c(ESC.bold, `\n  ${t('gal_hats')}\n`))
  for (const h of HATS) console.log(`    ${HAT_EMOJI[h]}  ${h}`)
  console.log(c(ESC.dim, `\n  ${t('gal_shiny')}\n`))
}

function interactiveSelftest() {
  console.log(c(ESC.bold, `\n  ${t('t_title')}\n`))
  const tests = ['hello', 'test-user-id' + SALT, randomBytes(32).toString('hex') + SALT]
  let ok = true
  for (const s of tests) {
    const js = Number(wyhash(Buffer.from(s, 'utf8')) & 0xffffffffn)
    if (IS_BUN) {
      const bh = Number(BigInt(Bun.hash(s)) & 0xffffffffn), m = js === bh; if (!m) ok = false
      console.log(`  ${m ? c(ESC.green,'✓') : c(ESC.red,'✗')} "${s.substring(0,30)}${s.length>30?'...':''}"  Bun:${bh} JS:${js}`)
    } else { console.log(`  ● "${s.substring(0,30)}${s.length>30?'...':''}"  wyhash:${js} fnv1a:${fnv1a(s)}`) }
  }
  console.log('')
  if (IS_BUN) console.log(c(ok ? ESC.green+ESC.bold : ESC.red+ESC.bold, `  ${ok ? t('t_ok') : t('t_fail')}\n`))
  else console.log(c(ESC.yellow, `  ${t('t_no_bun')}\n`))
}

async function interactiveDiy() {
  const cfg = readConfig()
  const uid = cfg?.oauthAccount?.accountUuid ? null : cfg?.userID
  if (!uid) { console.log(c(ESC.yellow, `\n  ${t('diy_no_buddy')}\n`)); return }
  const buddy = rollBuddy(uid)
  const stored = cfg?.companion

  console.log(c(ESC.bold, `\n  ${t('diy_current')}`))
  console.log(formatBuddy(buddy, null, false))

  if (stored?.name) console.log(c(ESC.dim, `  ${t('diy_cur_name', stored.name)}`))
  if (stored?.personality) console.log(c(ESC.dim, `  ${t('diy_cur_pers', stored.personality.substring(0, 60) + (stored.personality.length > 60 ? '...' : ''))}`))
  console.log('')

  const newName = await ask(`  ${c(ESC.magenta, '✏️')} ${t('diy_name')} `)
  const newPers = await ask(`  ${c(ESC.magenta, '✏️')} ${t('diy_personality')} `)

  if (!newName && !newPers) { console.log(c(ESC.dim, `\n  ${t('diy_skip')}\n`)); return }

  if (doCustomizeSoul(newName || undefined, newPers || undefined)) {
    console.log(c(ESC.green + ESC.bold, `\n  ${t('diy_done')}`))
    if (newName) console.log(c(ESC.magenta, `  Name: ${newName}`))
    if (newPers) console.log(c(ESC.magenta, `  Personality: ${newPers}`))
    console.log(c(ESC.yellow, `\n  ${t('a_restart')}`))
  } else {
    console.log(c(ESC.yellow, `\n  ${t('diy_no_buddy')}\n`))
  }
}

// ══════════════════════════════════════════════════════════
//  Patch Mode — Full Customize (npm install only)
// ══════════════════════════════════════════════════════════

function findCliJs() {
  // Common npm global paths
  const candidates = []
  try {
    const out = execSync('npm root -g', { timeout: 5000, encoding: 'utf8' }).trim()
    if (out && !out.includes('Unknown')) candidates.push(join(out, '@anthropic-ai', 'claude-code', 'cli.js'))
  } catch {}
  candidates.push(
    join(homedir(), '.npm-global', 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    join('/usr', 'local', 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    join('/usr', 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    // Windows
    join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
  )
  for (const p of candidates) { if (existsSync(p)) return p }
  return null
}

const PATCH_PATTERN_BEFORE = /if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\1,\.\.\.\2\}/
const PATCH_PATTERN_AFTER = /if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\2,\.\.\.\1\}/

function checkPatchStatus(cliPath) {
  const content = readFileSync(cliPath, 'utf8')
  if (PATCH_PATTERN_AFTER.test(content)) return 'patched'
  if (PATCH_PATTERN_BEFORE.test(content)) return 'unpatched'
  return 'unknown'
}

function applyPatch(cliPath) {
  let content = readFileSync(cliPath, 'utf8')
  const match = content.match(PATCH_PATTERN_BEFORE)
  if (!match) return false
  const stored = match[1], bones = match[2]
  // Swap: {...stored,...bones} → {...bones,...stored}
  content = content.replace(PATCH_PATTERN_BEFORE, (m) =>
    m.replace(`{...${stored},...${bones}}`, `{...${bones},...${stored}}`)
  )
  writeFileSync(cliPath, content, 'utf8')
  return true
}

async function interactivePatch() {
  console.log(c(ESC.bold, `\n  ${t('patch_title')}\n`))
  console.log(c(ESC.dim, `  ${t('patch_desc')}\n`))
  console.log(c(ESC.yellow, `  ${t('patch_npm_only')}\n`))

  const cliPath = findCliJs()
  if (!cliPath) {
    console.log(c(ESC.red, `  ${t('patch_not_found')}\n`))
    return
  }
  console.log(c(ESC.dim, `  cli.js: ${cliPath}\n`))

  const status = checkPatchStatus(cliPath)
  if (status === 'patched') {
    console.log(c(ESC.green, `  ${t('patch_already')}`))
  } else if (status === 'unpatched') {
    if (!(await confirm(t('patch_confirm'), true))) return
    // Backup
    const bakPath = cliPath + '.original'
    if (!existsSync(bakPath)) {
      copyFileSync(cliPath, bakPath)
      console.log(c(ESC.dim, `  ${t('patch_backup', bakPath)}`))
    }
    if (applyPatch(cliPath)) {
      console.log(c(ESC.green + ESC.bold, `  ${t('patch_ok')}`))
      console.log(c(ESC.dim, `  ${t('patch_restore', bakPath, cliPath)}\n`))
    } else {
      console.log(c(ESC.red, `  ${t('patch_fail')}\n`))
      return
    }
  } else {
    console.log(c(ESC.red, `  ${t('patch_fail')}\n`))
    return
  }

  // Now offer full customization
  console.log(c(ESC.bold, `\n  ✏️  ${L === 'zh' ? '设置自定义宠物属性:' : 'Set custom companion attributes:'}\n`))

  const cfg = readConfig() || {}
  const stored = cfg.companion || {}

  // Species
  const spItems = SPECIES.map(s => `${SPECIES_EMOJI[s]}  ${s}`)
  const spIdx = await select(t('patch_species'), spItems, true)
  const species = spIdx >= 0 ? SPECIES[spIdx] : stored.species

  // Rarity
  const rarItems = RARITIES.map(r => `${c(RARITY_CLR[r], RARITY_STARS[r])} ${r}`)
  const rarIdx = await select(t('patch_rarity'), rarItems, true)
  const rarity = rarIdx >= 0 ? RARITIES[rarIdx] : stored.rarity

  // Eye
  const eyeItems = EYES.map(e => `  ${e}`)
  const eyeIdx = await select(t('patch_eye'), eyeItems, true)
  const eye = eyeIdx >= 0 ? EYES[eyeIdx] : stored.eye

  // Hat
  const hatItems = HATS.map(h => `${HAT_EMOJI[h]}  ${h}`)
  const hatIdx = await select(t('patch_hat'), hatItems, true)
  const hat = hatIdx >= 0 ? HATS[hatIdx] : stored.hat

  // Shiny
  const shinyAns = await ask(`  ${t('patch_shiny_q')} `)
  const shiny = shinyAns.toLowerCase() === 'y' ? true : shinyAns.toLowerCase() === 'n' ? false : stored.shiny

  // Stats
  const stats = { ...(stored.stats || {}) }
  for (const sn of STAT_NAMES) {
    const cur = stats[sn] ?? '?'
    const ans = await ask(`  ${t('patch_stat', `${sn} [${cur}]`)} `)
    if (ans !== '') { const v = parseInt(ans); if (!isNaN(v)) stats[sn] = Math.max(0, Math.min(100, v)) }
  }

  // Name + personality
  const nameAns = await ask(`\n  ${c(ESC.magenta, '✏️')} ${t('diy_name')} `)
  const persAns = await ask(`  ${c(ESC.magenta, '✏️')} ${t('diy_personality')} `)

  // Build companion
  const companion = {
    name: nameAns || stored.name || 'Buddy',
    personality: persAns || stored.personality || 'A mysterious creature.',
    hatchedAt: stored.hatchedAt || Date.now(),
  }
  if (species) companion.species = species
  if (rarity) companion.rarity = rarity
  if (eye) companion.eye = eye
  if (hat !== undefined) companion.hat = hat
  if (shiny !== undefined) companion.shiny = shiny
  if (Object.keys(stats).length) companion.stats = stats

  // Write
  if (existsSync(CONFIG_PATH)) {
    copyFileSync(CONFIG_PATH, CONFIG_PATH + `.bak.${Date.now()}`)
  }
  cfg.companion = companion
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')

  console.log('')
  console.log(c(ESC.green + ESC.bold, `  ${t('patch_written')}`))
  const preview = { species, rarity, eye, hat, shiny, stats, name: companion.name }
  console.log(c(ESC.dim, `  ${JSON.stringify(preview)}\n`))
}

async function interactiveMode() {
  banner()

  while (true) {
    const menuItems = [
      t('menu_search'), t('menu_check'), t('menu_diy'), t('menu_patch'),
      t('menu_gallery'), t('menu_selftest'), t('menu_lang'), t('menu_exit'),
    ]
    const choice = await select(t('menu_title'), menuItems)

    switch (choice) {
      case 0: // Search
        await interactiveSearch()
        if (!(await confirm(t('si_again'), true))) continue
        break
      case 1: // Check
        await interactiveCheck()
        await ask(`\n  ${c(ESC.dim, t('press_enter'))} `)
        break
      case 2: // DIY name/personality
        await interactiveDiy()
        await ask(`\n  ${c(ESC.dim, t('press_enter'))} `)
        break
      case 3: // Patch full customize
        await interactivePatch()
        await ask(`\n  ${c(ESC.dim, t('press_enter'))} `)
        break
      case 4: // Gallery
        interactiveGallery()
        await ask(`  ${c(ESC.dim, t('press_enter'))} `)
        break
      case 5: // Selftest
        interactiveSelftest()
        await ask(`  ${c(ESC.dim, t('press_enter'))} `)
        break
      case 6: // Language
        L = await pickLang()
        banner()
        break
      case 7: // Exit
      default:
        console.log(''); return
    }
  }
}

// ══════════════════════════════════════════════════════════
//  CLI Mode (backward compat)
// ══════════════════════════════════════════════════════════

function parseArgs(argv) {
  const args = { command: null, filters: {}, options: {} }
  const cmds = ['search', 'check', 'apply', 'gallery', 'selftest', 'help', 'lang', 'patch']
  let i = 0
  for (; i < argv.length; i++) { const a = argv[i]; if (a === '--lang') { i++; continue }; if (!a.startsWith('-') && cmds.includes(a)) { args.command = a; i++; break } }
  for (; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1]
    switch (a) {
      case '--species': case '-s': args.filters.species = n; i++; break
      case '--rarity': case '-r': args.filters.rarity = n; i++; break
      case '--eye': case '-e': args.filters.eye = n; i++; break
      case '--hat': args.filters.hat = n; i++; break
      case '--shiny': args.filters.shiny = true; break
      case '--not-shiny': args.filters.shiny = false; break
      case '--limit': case '-l': args.options.limit = parseInt(n); i++; break
      case '--count': case '-n': args.options.count = parseInt(n); i++; break
      case '--json': args.options.json = true; break
      case '--lang': i++; break
      default: if (!a.startsWith('-') && (args.command === 'apply' || args.command === 'check')) args.options.userId = a
    }
  }
  return args
}

function cliSearch(cr, opts) {
  banner()
  if (!cr.species && !cr.rarity && !cr.eye && !cr.hat && cr.shiny == null) { console.log(c(ESC.red, '  Need at least one filter.\n')); return }
  if (!IS_BUN) console.log(c(ESC.yellow, `  ${t('s_node_warn')}\n`))
  const parts = []; if (cr.shiny) parts.push('✨'); if (cr.rarity) parts.push(cr.rarity); if (cr.species) parts.push(`${SPECIES_EMOJI[cr.species]} ${cr.species}`); if (cr.eye) parts.push(`eye:${cr.eye}`); if (cr.hat) parts.push(`hat:${cr.hat}`)
  const limit = opts.limit || 5_000_000
  console.log(c(ESC.bold, `  ${t('s_target')} ${parts.join(' ')}\n`))
  const results = doSearch(cr, limit)
  if (!results.length) { console.log(c(ESC.red, `\n  ${t('s_no_match')}\n`)); return }
  const best = results[results.length - 1]
  if (opts.json) { console.log(JSON.stringify(results.map(r => ({ userId: r.uid, buddy: r.buddy, attempts: r.attempts })), null, 2)); return }
  console.log(c(ESC.bold + ESC.green, `\n  ════════════════════════════════════\n  ${t('s_best')}\n  ════════════════════════════════════`))
  console.log(formatBuddy(best.buddy, best.uid))
  console.log(c(ESC.cyan, `  node buddy-reroll.mjs apply ${best.uid}\n`))
}

// ══════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════

async function main() {
  let lang = loadLang()
  const args = parseArgs(process.argv.slice(2))
  const hasCmd = args.command || Object.keys(args.filters).length > 0

  // First run: pick language
  if (lang === null) lang = await pickLang()
  L = lang

  // No arguments → interactive mode
  if (!hasCmd) { await interactiveMode(); return }

  // CLI mode
  switch (args.command) {
    case 'search': cliSearch(args.filters, args.options); break
    case 'check': banner(); interactiveCheck(); break
    case 'apply': banner(); if(!args.options.userId){console.log(c(ESC.red,'  Usage: apply <userID>\n'));break}; checkVersion()!=='outdated'&&doApply(args.options.userId); break
    case 'gallery': banner(); interactiveGallery(); break
    case 'selftest': banner(); interactiveSelftest(); break
    case 'patch': await interactivePatch(); break
    case 'lang': await pickLang(); break
    case 'help': default:
      if (Object.keys(args.filters).length > 0) cliSearch(args.filters, args.options)
      else { banner(); console.log(c(ESC.dim, '  node buddy-reroll.mjs              → Interactive mode')); console.log(c(ESC.dim, '  node buddy-reroll.mjs search ...   → CLI mode\n')); console.log(c(ESC.dim, '  --species/-s  --rarity/-r  --eye/-e  --hat  --shiny  --limit/-l  --count/-n  --json  --lang <en|zh>\n')) }
  }
}

main()
