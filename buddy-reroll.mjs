#!/usr/bin/env node
/**
 * 🎰 cc-buddy v3.0.0
 * Interactive pet reroller for Claude Code /buddy.
 * Cross-platform: Node.js 16+ / Bun. Bilingual: EN / 中文.
 */
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, copyFileSync, realpathSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'
import * as acorn from 'acorn'

// ── Constants ────────────────────────────────────────────
const VERSION = '3.1.8'
const MARKER = '__ccbuddy_v3__'
const SALT = 'friend-2026-401'
const CONFIG_PATH = join(homedir(), '.claude.json')
const PREF_PATH = join(homedir(), '.claude-buddy.json')
const MIN_CC_VER = '2.1.89'

const SPECIES = ['duck','goose','blob','cat','dragon','octopus','owl','penguin','turtle','snail','ghost','axolotl','capybara','cactus','robot','rabbit','mushroom','chonk']
const RARITIES = ['common','uncommon','rare','epic','legendary']
const RARITY_W = { common:60, uncommon:25, rare:10, epic:4, legendary:1 }
const RARITY_RANK = { common:0, uncommon:1, rare:2, epic:3, legendary:4 }
const EYES = ['·','✦','×','◉','@','°']
const HATS = ['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck']
const SPRITE_PRESETS = {
  neko:{name:{en:'🐱 Catgirl',zh:'🐱 猫耳娘'},face:'({E}ω{E})',sprite:[
    ['            ','  /\\    /\\  ',' ( {E}  w  {E} )','  |  ♡  |  ','  (______)  '],
    ['            ','  /\\    /\\  ',' ( {E}  w  {E} )','  |     |  ','  (______)~ '],
    ['  ♡    ♡   ','  /\\    /\\  ',' ( {E}  w  {E} )','  |  ♡  |  ','  (______)  ']]},
  fox:{name:{en:'🦊 Fox',zh:'🦊 狐狸'},face:'({E}ω{E})',sprite:[
    ['            ','   /\\_/\\    ','  ( {E} ω {E})  ','  /|    |\\  ',' (_|    |_) '],
    ['            ','   /\\_/\\    ','  ( {E} ω {E})  ','  /|    |\\  ',' (_|    |_)~'],
    ['    ~ ~     ','   /\\_/\\    ','  ( {E} ω {E})  ','  /|    |\\  ',' (_|    |_) ']]},
  bunny:{name:{en:'🐰 Bunny',zh:'🐰 兔耳娘'},face:'({E}·{E})',sprite:[
    ['    ||  ||  ','    ||  ||  ',' ( {E}  · {E} ) ','   \\    /   ','    (==)    '],
    ['    ||  ||  ','    |\\  /|  ',' ( {E}  · {E} ) ','   \\    /   ','    (==)  ~ '],
    ['   ♡ ♡♡ ♡  ','    ||  ||  ',' ( {E}  · {E} ) ','   \\    /   ','    (==)    ']]},
  pika:{name:{en:'⚡ Pikachu',zh:'⚡ 皮卡丘'},face:'({E}▽{E})',sprite:[
    ['            ','  /|    |\\  ',' ( {E}  ▽ {E} )','   (    )  ','    ~~~~    '],
    ['            ','  /|    |\\  ',' ( {E}  ▽ {E} )','   (    )  ','    ~~~~  ⚡'],
    ['   ⚡  ⚡   ','  /|    |\\  ',' ( {E}  ▽ {E} )','   (    )  ','    ~~~~    ']]},
  bear:{name:{en:'🐻 Bear',zh:'🐻 小熊'},face:'({E}ᴥ{E})',sprite:[
    ['            ','  (\\  /)   ',' ( {E} ᴥ {E} )  ','  />  <\\   ',' (__\\/__) '],
    ['            ','  (\\  /)   ',' ( {E} ᴥ {E} )  ','  />  <\\   ',' (__\\/__) ~'],
    ['    z Z     ','  (\\  /)   ',' ( -  ᴥ  - )  ','  />  <\\   ',' (__\\/__) ']]},
  devil:{name:{en:'😈 Devil',zh:'😈 小恶魔'},face:'{E}v{E}',sprite:[
    ['   )    (   ','  /\\    /\\  ',' ( {E}  v  {E} )','   \\~~~~/ ^ ','    \\  /    '],
    ['   )    (   ','  /\\    /\\  ',' ( {E}  v  {E} )','   \\~~~~/ ^ ','    \\  / ~  '],
    ['   ) ** (   ','  /\\    /\\  ',' ( {E}  v  {E} )','   \\~~~~/ ^ ','    \\  /    ']]},
  alien:{name:{en:'👽 Alien',zh:'👽 外星人'},face:'{E}_{E}',sprite:[
    ['            ','   .-""-.   ','  / {E}  {E} \\  ','  |  __  |  ','   \\____/   '],
    ['            ','   .-""-.   ','  / {E}  {E} \\  ','  |  __  |  ','   \\____/ ~ '],
    ['   *  . *   ','   .-""-.   ','  / {E}  {E} \\  ','  |  __  |  ','   \\____/   ']]},
  slime:{name:{en:'🟢 Slime',zh:'🟢 史莱姆'},face:'({E}~{E})',sprite:[
    ['            ','    ____    ','  / {E}  {E} \\  ','  | ~~~~ |  ','  (______)  '],
    ['            ','    ____    ','  / {E}  {E} \\  ','  | ~~~~ |  ',' (__________) '],
    ['    ~ ~     ','    ____    ','  / {E}  {E} \\  ','  | ~~~~ |  ','  (______)  ']]},
  kirby:{name:{en:'🩷 Kirby',zh:'🩷 卡比'},face:'({E}▽{E})',sprite:[
    ['            ','   .----.   ','  ( {E} ▽ {E} )  ','  /|    |\\  ','   o    o   '],
    ['            ','   .----.   ','  ( {E} ▽ {E} )~ ','  /|    |\\  ','   o    o   '],
    ['    ☆  ☆   ','   .----.   ','  ( {E} ▽ {E} )  ','  /|    |\\  ','   o    o   ']]},
  totoro:{name:{en:'🌳 Totoro',zh:'🌳 龙猫'},face:'({E}△{E})',sprite:[
    ['            ','   /~~~~\\   ','  ( {E} △ {E} )  ','  |VVVVVV|  ','  (__)(__)  '],
    ['            ','   /~~~~\\   ','  ( {E} △ {E} )  ','  |VVVVVV|  ','  (__)(__)~ '],
    ['    🌂      ','   /~~~~\\   ','  ( {E} △ {E} )  ','  |VVVVVV|  ','  (__)(__)  ']]},
  cthulhu:{name:{en:'🦑 Cthulhu',zh:'🦑 克苏鲁'},face:'{E}}{E}',sprite:[
    ['            ','   /\\  /\\   ','  ( {E} }{ {E} ) ','   |/\\/\\|   ','  ~~~~~~~~  '],
    ['            ','   /\\  /\\   ','  ( {E} }{ {E} ) ','   |\\/\\/|   ','  ~~~~~~~~~ '],
    ['   * .  *   ','   /\\  /\\   ','  ( {E} }{ {E} ) ','   |/\\/\\|   ','  ~~~~~~~~  ']]},
  miku:{name:{en:'🎤 Miku',zh:'🎤 初音'},face:'({E}∀{E})',sprite:[
    ['    ♪   ♪   ',' ]==   ==[ ',' ( {E}  ∀  {E} )','   \\    /   ','    |  |    '],
    ['     ♪  ♪   ',' ]==   ==[ ',' ( {E}  ∀  {E} )','   \\    /   ','    |  |  ~ '],
    ['   ♪ ♫ ♪   ',' ]==   ==[ ',' ( {E}  ∀  {E} )','   \\    /   ','    |  |    ']]},
  panda:{name:{en:'🐼 Panda',zh:'🐼 熊猫'},face:'({E}_{E})',sprite:[
    ['            ','  ○\\  /○   ','  ( {E}  _ {E} ) ','   \\    /   ','   (====)   '],
    ['            ','  ○\\  /○   ','  ( {E}  _ {E} ) ','   \\    /   ','   (====) ~ '],
    ['    🎋      ','  ○\\  /○   ','  ( {E}  _ {E} ) ','   \\    /   ','   (====)   ']]},
  bat:{name:{en:'🦇 Bat',zh:'🦇 蝙蝠'},face:'{E}w{E}',sprite:[
    ['  /|    |\\  ',' / |    | \\ ','   ({E} w {E})  ','    \\  /    ','     \\/     '],
    ['  /|    |\\  ',' / |    | \\ ','   ({E} w {E})  ','    \\  /    ','     \\/   ~ '],
    [' ~/|    |\\~ ',' / |    | \\ ','   ({E} w {E})  ','    \\  /    ','     \\/     ']]},
  cxk:{name:{en:'🏀 CXK',zh:'🏀 坤哥'},face:'({E} _ {E})',sprite:[
    ['            ','  ({E} _ {E})   ','  \\|--|/    ',' / o    \\   ','d        b  '],
    ['            ',' \\({E} _ {E})/  ','   |--|     ','   |  |     ','  d  b   o  '],
    ['  ♪    ♫    ','   ({E} _ {E})  ','  \\|--|/    ',' /   o   \\  ','d         b ']]},
}
const STATS = ['DEBUGGING','PATIENCE','CHAOS','WISDOM','SNARK']
const RARITY_FLOOR = { common:5, uncommon:15, rare:25, epic:35, legendary:50 }

const SP_E = { duck:'🦆',goose:'🪿',blob:'🫧',cat:'🐱',dragon:'🐉',octopus:'🐙',owl:'🦉',penguin:'🐧',turtle:'🐢',snail:'🐌',ghost:'👻',axolotl:'🦎',capybara:'🦫',cactus:'🌵',robot:'🤖',rabbit:'🐰',mushroom:'🍄',chonk:'🐈' }
const HAT_E = { none:'—',crown:'👑',tophat:'🎩',propeller:'🧢',halo:'😇',wizard:'🧙',beanie:'⛑',tinyduck:'🐤' }
const RAR_S = { common:'★',uncommon:'★★',rare:'★★★',epic:'★★★★',legendary:'★★★★★' }

// ── ANSI ─────────────────────────────────────────────────
const NO_CLR = !!process.env.NO_COLOR || process.argv.includes('--no-color')
const TTY = process.stdout.isTTY !== false
const E = { rs:'\x1b[0m',b:'\x1b[1m',d:'\x1b[2m',r:'\x1b[31m',g:'\x1b[32m',y:'\x1b[33m',bl:'\x1b[34m',m:'\x1b[35m',c:'\x1b[36m',w:'\x1b[37m',gr:'\x1b[90m' }
const RC = { common:E.w, uncommon:E.g, rare:E.bl, epic:E.m, legendary:E.y }
const c = (code, text) => (!NO_CLR && TTY) ? `${code}${text}${E.rs}` : text

// ── i18n ─────────────────────────────────────────────────
let L = 'en'
const I = {
  banner:       { en:'🎰 Claude Buddy Reroller',         zh:'🎰 Claude Buddy 宠物重铸器' },
  rt_bun:       { en:'Runtime: Bun ✓',                   zh:'运行时: Bun ✓' },
  rt_node:      { en:'Runtime: Node.js (wyhash)',         zh:'运行时: Node.js (wyhash)' },
  menu_title:   { en:'What would you like to do?',       zh:'你想做什么？' },
  menu_search:  { en:'🔍  Search & apply buddy',         zh:'🔍  搜索并应用宠物' },
  menu_check:   { en:'👀  Check current buddy',          zh:'👀  查看当前宠物' },
  menu_diy:     { en:'✏️   Customize buddy',               zh:'✏️   自定义宠物' },
  menu_gallery: { en:'📋  Species gallery',              zh:'📋  物种图鉴' },
  menu_test:    { en:'🧪  Self-test hash',               zh:'🧪  自检 Hash' },
  menu_lang:    { en:'🌐  Switch language',              zh:'🌐  切换语言' },
  menu_exit:    { en:'👋  Exit',                         zh:'👋  退出' },
  si_species:   { en:'Pick a species (Enter to skip):',  zh:'选择物种 (回车跳过):' },
  si_rarity:    { en:'Pick rarity (Enter = auto-best):', zh:'选择稀有度 (回车自动找最好):' },
  si_auto:      { en:'Auto (find highest rarity)',       zh:'自动 (找最高稀有度)' },
  si_eye:       { en:'Pick eyes (Enter to skip):',       zh:'选择眼睛 (回车跳过):' },
  si_hat:       { en:'Pick hat (Enter to skip):',        zh:'选择帽子 (回车跳过):' },
  si_any:       { en:'Any',                              zh:'不限' },
  si_shiny:     { en:'Require shiny? [y/N]:',            zh:'要求闪光? [y/N]:' },
  si_apply:     { en:'Apply this buddy? [Y/n]:',         zh:'应用此宠物? [Y/n]:' },
  si_done:      { en:'Done! Restart Claude Code → /buddy.',zh:'完成! 重启 Claude Code → /buddy。' },
  si_skip:      { en:'Not applied.',                     zh:'未写入。' },
  si_again:     { en:'Search again? [Y/n]:',             zh:'再搜一次? [Y/n]:' },
  chk_oauth:    { en:'🔍 Current Buddy (OAuth):',        zh:'🔍 当前宠物 (OAuth):' },
  chk_oauth_w:  { en:'⚠ OAuth active — this is what /buddy shows.',zh:'⚠ OAuth 已登录 — 这是 /buddy 显示的宠物。' },
  chk_after:    { en:'🔄 After apply (userID):',         zh:'🔄 apply 后 (userID):' },
  chk_cur:      { en:'🔍 Current Buddy (userID):',       zh:'🔍 当前宠物 (userID):' },
  chk_none:     { en:'No config found.',                 zh:'未找到配置。' },
  chk_no_id:    { en:'No userID or OAuth found.',        zh:'未找到 userID 或 OAuth。' },
  gal_sp:       { en:'📋 All 18 Species:',               zh:'📋 全部 18 个物种:' },
  gal_rar:      { en:'🎲 Rarities:',                     zh:'🎲 稀有度:' },
  gal_eye:      { en:'👀 Eyes:',                          zh:'👀 眼睛:' },
  gal_hat:      { en:'🎩 Hats:',                          zh:'🎩 帽子:' },
  gal_note:     { en:'Shiny: 1%. Common pets have no hats.',zh:'闪光: 1%。普通品质没有帽子。' },
  s_target:     { en:'🎯 Searching:',                    zh:'🎯 搜索:' },
  s_found:      { en:'→ Found:',                          zh:'→ 命中:' },
  s_done:       { en:'Searched {0} in {1}s',              zh:'已搜索 {0} 次, 耗时 {1}s' },
  s_none:       { en:'✗ No match. Try relaxing criteria.',zh:'✗ 未找到。试试放宽条件。' },
  s_best:       { en:'✓ BEST RESULT',                    zh:'✓ 最佳结果' },
  a_bak:        { en:'Backup:',                           zh:'备份:' },
  a_oauth:      { en:'OAuth → removed accountUuid',       zh:'OAuth → 已移除 accountUuid' },
  a_ok:         { en:'✓ Config updated!',                 zh:'✓ 配置已更新!' },
  a_restart:    { en:'Restart Claude Code → /buddy',      zh:'重启 Claude Code → /buddy' },
  v_ok:         { en:'Claude Code {0} ✓',                zh:'Claude Code {0} ✓' },
  v_old:        { en:'✗ Claude Code {0} too old! Need >= {1}. Run: claude update',zh:'✗ Claude Code {0} 过旧! 需要 >= {1}。运行: claude update' },
  v_unk:        { en:'⚠ Cannot detect version. Need >= {0}.',zh:'⚠ 无法检测版本。需要 >= {0}。' },
  t_title:      { en:'🧪 Self-Test: Hash',               zh:'🧪 自检: Hash' },
  t_ok:         { en:'✓ All match! wyhash-js accurate.', zh:'✓ 全部匹配! wyhash-js 准确。' },
  t_fail:       { en:'✗ Mismatch! Use Bun.',             zh:'✗ 不匹配! 请用 Bun。' },
  t_no_bun:     { en:'⚠ Install Bun to verify: curl -fsSL https://bun.sh/install | bash',zh:'⚠ 安装 Bun 验证: curl -fsSL https://bun.sh/install | bash' },
  lang_saved:   { en:'✓ Language: English',               zh:'✓ 语言: 中文' },
  diy_name:     { en:'Give it a name (Enter to skip):',   zh:'给它取个名字 (回车跳过):' },
  diy_pers:     { en:'Describe personality (Enter to skip):',zh:'写一句性格 (回车跳过):' },
  diy_set:      { en:'✓ Custom soul: {0}',                zh:'✓ 自定义灵魂: {0}' },
  diy_auto:     { en:'Soul auto-generated on first /buddy.',zh:'灵魂将在首次 /buddy 时自动生成。' },
  diy_none:     { en:'No buddy found. Search first!',     zh:'未找到宠物。先搜索一个!' },
  diy_cur:      { en:'Current buddy:',                    zh:'当前宠物:' },
  diy_done:     { en:'✓ Soul updated!',                   zh:'✓ 灵魂已更新!' },
  press:        { en:'Press Enter to continue...',         zh:'按回车继续...' },
  env_warn:     { en:'⚠ Detected ANTHROPIC_BASE_URL (proxy) with {0}.\n  Proxy users don\'t need these! Remove from settings.json.',zh:'⚠ 检测到 ANTHROPIC_BASE_URL (中转站) 同时设置了 {0}。\n  中转站用户不需要这些变量！请从 settings.json 中删除。' },
  p_unk_attr:   { en:'⚠ Custom attributes: cli.js format changed, skipped',zh:'⚠ 属性自定义: cli.js 格式已变，跳过' },
  p_unk_buddy:  { en:'⚠ /buddy unlock: cli.js format changed, skipped',zh:'⚠ /buddy 解锁: cli.js 格式已变，跳过' },
  p_unk_tele:   { en:'⚠ Speech bubbles: cli.js format changed, skipped',zh:'⚠ 气泡反应: cli.js 格式已变，跳过' },
  n_skip:       { en:'⚠ Native binary: SALT not found, patching skipped. Custom buddy may not take effect.',zh:'⚠ 原生二进制: 未找到 SALT，跳过补丁。自定义宠物可能不生效。' },
  p_ast_dl:     { en:'Downloading AST parser...',zh:'正在下载 AST 解析器...' },
  p_ast_fail:   { en:'✗ AST parse failed',zh:'✗ AST 解析失败' },
  p_ast_ok:     { en:'✓ All patches applied (AST verified)',zh:'✓ 全部补丁已应用 (AST 验证通过)' },
  p_ast_v3:     { en:'✓ All patches already applied (v3)',zh:'✓ 全部补丁已生效 (v3)' },
  p_chk_none:   { en:'✗ No patches found. Run apply to patch.',zh:'✗ 未找到补丁。请执行 apply。' },
  p_chk_v3:     { en:'✓ v3 AST patches active',zh:'✓ v3 AST 补丁生效中' },
  p_chk_old:    { en:'⚠ Old patches found. Run apply to upgrade to v3.',zh:'⚠ 发现旧版补丁。请执行 apply 升级到 v3。' },
  tip_override:  { en:'💡 Tip: edit ~/.claude.json → "companionOverride" to fine-tune species/rarity/eye/hat/shiny/stats/customFace/customSprite anytime.',zh:'💡 提示: 编辑 ~/.claude.json → "companionOverride" 可随时微调物种/稀有度/眼睛/帽子/闪光/属性/自定义表情/精灵图。' },
}
function t(k,...a){const m=I[k]?.[L]||I[k]?.['en']||k;return a.length?m.replace(/\{(\d+)\}/g,(_,i)=>a[+i]??''):m}

// ── Prompt helpers ───────────────────────────────────────
const ask = q => new Promise(r => { const rl = createInterface({input:process.stdin,output:process.stdout}); rl.question(q, a => { rl.close(); r(a.trim()) }) })
async function sel(title, items, skip=false) {
  console.log(`\n  ${c(E.b,title)}\n`)
  items.forEach((it,i) => console.log(`    ${c(E.c,`[${i+1}]`)} ${it}`))
  if (skip) console.log(`    ${c(E.d,`[Enter] ${t('si_any')}`)}`)
  const a = await ask(`\n  ${c(E.c,'>')} `)
  if (a===''&&skip) return -1
  const idx = parseInt(a)-1
  return idx>=0&&idx<items.length ? idx : (skip?-1:0)
}
async function yn(q, def=true) { const a = await ask(`  ${q} `); return a===''?def:a.toLowerCase().startsWith('y') }

// ── Language ─────────────────────────────────────────────
function loadLang(){const i=process.argv.indexOf('--lang');if(i!==-1){const v=(process.argv[i+1]||'').toLowerCase();return(v==='zh'||v==='cn')?'zh':'en'}try{const d=JSON.parse(readFileSync(PREF_PATH,'utf8'));if(d.lang==='zh'||d.lang==='en')return d.lang}catch{}return null}
function saveLang(l){writeFileSync(PREF_PATH,JSON.stringify({lang:l},null,2),'utf8')}
async function pickLang(){console.log('');console.log(c(E.b+E.c,'  🎰 Claude Buddy Reroller')+c(E.d,` v${VERSION}`));console.log(`\n  ${c(E.b,'🌐 Select language / 选择语言:')}\n`);console.log(`    ${c(E.c,'[1]')} English`);console.log(`    ${c(E.c,'[2]')} 中文`);const a=await ask(`\n  ${c(E.c,'>')} `);const l=a.trim()==='2'?'zh':'en';saveLang(l);console.log(c(E.g,`\n  ${l==='zh'?I.lang_saved.zh:I.lang_saved.en}`));return l}

// ── wyhash (pure JS, final v4) ───────────────────────────
const M64=(1n<<64n)-1n,WYP=[0xa0761d6478bd642fn,0xe7037ed1a0b428dbn,0x8ebc6af09c88c6e3n,0x589965cc75374cc3n]
function _mx(A,B){const r=(A&M64)*(B&M64);return((r>>64n)^r)&M64}
function _r8(p,i){return BigInt(p[i])|(BigInt(p[i+1])<<8n)|(BigInt(p[i+2])<<16n)|(BigInt(p[i+3])<<24n)|(BigInt(p[i+4])<<32n)|(BigInt(p[i+5])<<40n)|(BigInt(p[i+6])<<48n)|(BigInt(p[i+7])<<56n)}
function _r4(p,i){return BigInt(p[i])|(BigInt(p[i+1])<<8n)|(BigInt(p[i+2])<<16n)|(BigInt(p[i+3])<<24n)}
function _r3(p,i,k){return(BigInt(p[i])<<16n)|(BigInt(p[i+(k>>1)])<<8n)|BigInt(p[i+k-1])}
function wyhash(key,seed=0n){const len=key.length;seed=(seed^_mx(seed^WYP[0],WYP[1]))&M64;let a,b;if(len<=16){if(len>=4){a=((_r4(key,0)<<32n)|_r4(key,((len>>3)<<2)))&M64;b=((_r4(key,len-4)<<32n)|_r4(key,len-4-((len>>3)<<2)))&M64}else if(len>0){a=_r3(key,0,len);b=0n}else{a=0n;b=0n}}else{let i=len,p=0;if(i>48){let s1=seed,s2=seed;do{seed=_mx(_r8(key,p)^WYP[1],_r8(key,p+8)^seed);s1=_mx(_r8(key,p+16)^WYP[2],_r8(key,p+24)^s1);s2=_mx(_r8(key,p+32)^WYP[3],_r8(key,p+40)^s2);p+=48;i-=48}while(i>48);seed=(seed^s1^s2)&M64}while(i>16){seed=_mx(_r8(key,p)^WYP[1],_r8(key,p+8)^seed);i-=16;p+=16}a=_r8(key,p+i-16);b=_r8(key,p+i-8)}a=(a^WYP[1])&M64;b=(b^seed)&M64;const r=(a&M64)*(b&M64);a=r&M64;b=(r>>64n)&M64;return _mx((a^WYP[0]^BigInt(len))&M64,(b^WYP[1])&M64)}

// ── Hash / PRNG / Roll ──────────────────────────────────
const IS_BUN = typeof globalThis.Bun!=='undefined'
function hWy(s){return IS_BUN?Number(BigInt(Bun.hash(s))&0xffffffffn):Number(wyhash(Buffer.from(s,'utf8'))&0xffffffffn)}
function hFnv(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

let HASH_MODE='wyhash'
const IS_WIN=process.platform==='win32'
function whichBin(name){try{const cmd=IS_WIN?`where ${name}`:`which ${name}`;return execSync(cmd,{timeout:3000,encoding:'utf8'}).trim().split(/\r?\n/)[0]}catch{return null}}
function detectHash(){const i=process.argv.indexOf('--hash');if(i!==-1){const v=(process.argv[i+1]||'').toLowerCase();return(v==='fnv'||v==='fnv1a')?'fnv1a':'wyhash'}try{const d=JSON.parse(readFileSync(PREF_PATH,'utf8'));if(d.hashMode)return d.hashMode}catch{}try{const w=whichBin('claude');if(w){const r=realpathSync(w);if(r.includes('node_modules')||r.endsWith('.js'))return'fnv1a'}}catch{}if(findCliJs())return'fnv1a';return'wyhash'}
function hash(s){return HASH_MODE==='fnv1a'?hFnv(s):hWy(s)}

function prng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function pick(rng,arr){return arr[Math.floor(rng()*arr.length)]}
function rollRar(rng){let r=rng()*100;for(const x of RARITIES){r-=RARITY_W[x];if(r<0)return x}return'common'}
function rollStats(rng,rar){const fl=RARITY_FLOOR[rar],pk=pick(rng,STATS);let dp=pick(rng,STATS);while(dp===pk)dp=pick(rng,STATS);const s={};for(const n of STATS){if(n===pk)s[n]=Math.min(100,fl+50+Math.floor(rng()*30));else if(n===dp)s[n]=Math.max(1,fl-10+Math.floor(rng()*15));else s[n]=Math.min(100,fl+Math.floor(rng()*40))}return s}
function roll(uid,salt=SALT,hashFn=hash){const rng=prng(hashFn(uid+salt)),rar=rollRar(rng);return{rarity:rar,species:pick(rng,SPECIES),eye:pick(rng,EYES),hat:rar==='common'?'none':pick(rng,HATS),shiny:rng()<0.01,stats:rollStats(rng,rar)}}

// ── Display ──────────────────────────────────────────────
function bar(v,w=20){const f=Math.round((v/100)*w);return`${c(v>=80?E.g:v>=50?E.y:v>=30?E.w:E.r,'█'.repeat(f)+'░'.repeat(w-f))} ${v}`}
function fmt(b,uid,verbose=true){const ln=[''],rC=RC[b.rarity];ln.push(c(rC+E.b,`  ${SP_E[b.species]||'?'} ${b.species.toUpperCase()}`));ln.push(c(rC,`  ${RAR_S[b.rarity]} ${b.rarity}`)+(b.shiny?c(E.y+E.b,' ✨ SHINY!'):'')); ln.push(c(E.gr,`  Eyes: ${b.eye}  |  Hat: ${HAT_E[b.hat]} ${b.hat}`));if(verbose){ln.push('');for(const[n,v]of Object.entries(b.stats))ln.push(`  ${n.padEnd(10)} ${bar(v)}`)}if(uid){ln.push('');ln.push(c(E.d,`  UserID: ${uid}`))}ln.push('');return ln.join('\n')}
function banner(){console.log('');console.log(c(E.b+E.c,`  ${t('banner')}`)+c(E.d,` v${VERSION}`));const h=HASH_MODE==='fnv1a'?'FNV-1a (npm)':'wyhash (native)';console.log(c(E.d,`  ${IS_BUN?t('rt_bun'):t('rt_node')} | Hash: ${h}`));console.log('')}

// ── Config / Version ─────────────────────────────────────
function readCfg(){if(!existsSync(CONFIG_PATH))return null;try{return JSON.parse(readFileSync(CONFIG_PATH,'utf8'))}catch{return null}}
function cmpVer(a,b){const pa=a.split('.').map(Number),pb=b.split('.').map(Number);for(let i=0;i<3;i++){if((pa[i]||0)>(pb[i]||0))return 1;if((pa[i]||0)<(pb[i]||0))return-1}return 0}
function getCCVer(){try{for(const p of [join(homedir(),'.local','bin','claude'),'/usr/local/bin/claude']){if(!existsSync(p))continue;try{const m=realpathSync(p).match(/(\d+\.\d+\.\d+)/);if(m)return m[1]}catch{}}const d=join(homedir(),'.local','share','claude','versions');if(existsSync(d)){const v=readdirSync(d).filter(f=>/^\d+\.\d+\.\d+$/.test(f)).sort(cmpVer);if(v.length)return v[v.length-1]}}catch{}try{const m=execSync('claude --version',{timeout:5000,encoding:'utf8'}).match(/(\d+\.\d+\.\d+)/);if(m)return m[1]}catch{}return null}
function chkVer(){const v=getCCVer();if(!v){console.log(c(E.y,`  ${t('v_unk',MIN_CC_VER)}`));return'unknown'}if(cmpVer(v,MIN_CC_VER)<0){console.log(c(E.r+E.b,`  ${t('v_old',v,MIN_CC_VER)}`));return'outdated'}console.log(c(E.d,`  ${t('v_ok',v)}`));return'ok'}

// ── Shared: pet selection UI ─────────────────────────────
async function selectPet() {
  const spIdx = await sel(t('si_species'), SPECIES.map(s=>`${SP_E[s]}  ${s}`), true)
  const rarIdx = await sel(t('si_rarity'), [t('si_auto'), ...RARITIES.map(r=>`${c(RC[r],RAR_S[r])} ${r} (${RARITY_W[r]}%)`)])
  const eyeIdx = await sel(t('si_eye'), EYES.map(e=>`  ${e}`), true)
  const hatIdx = await sel(t('si_hat'), HATS.map(h=>`${HAT_E[h]}  ${h}`), true)
  const shA = await ask(`\n  ${t('si_shiny')} `)
  const cr = {}
  if (spIdx>=0) cr.species = SPECIES[spIdx]
  if (rarIdx>0) cr.rarity = RARITIES[rarIdx-1]
  if (eyeIdx>=0) cr.eye = EYES[eyeIdx]
  if (hatIdx>=0) cr.hat = HATS[hatIdx]
  if (shA.toLowerCase().startsWith('y')) cr.shiny = true
  if (!Object.keys(cr).length) cr.rarity = 'legendary'
  return cr
}

function criteriaLabel(cr) {
  const p = []
  if(cr.shiny)p.push('✨'); if(cr.rarity)p.push(cr.rarity)
  if(cr.species)p.push(`${SP_E[cr.species]} ${cr.species}`)
  if(cr.eye)p.push(`eye:${cr.eye}`); if(cr.hat)p.push(`hat:${cr.hat}`)
  return p.join(' ')
}

// ── Search engine (unified) ──────────────────────────────
function match(b,cr){if(cr.species&&b.species!==cr.species)return false;if(cr.rarity&&b.rarity!==cr.rarity)return false;if(cr.eye&&b.eye!==cr.eye)return false;if(cr.hat&&b.hat!==cr.hat)return false;if(cr.shiny!=null&&b.shiny!==cr.shiny)return false;return true}

function search(cr, limit=5_000_000, saltOverride=null) {
  const results=[],start=Date.now();let best=null
  const hashFn = saltOverride ? hWy : hash  // native always wyhash
  const useSalt = saltOverride || SALT
  for(let i=0;i<limit;i++){
    const uid=randomBytes(32).toString('hex')
    const buddy=roll(uid, useSalt, hashFn)
    if(match(buddy,cr)){
      if(!cr.rarity){
        if(!best||RARITY_RANK[buddy.rarity]>RARITY_RANK[best.buddy.rarity]){
          best={uid,buddy,attempts:i+1};results.push(best)
          console.log(c(RC[buddy.rarity],`  ${t('s_found')} ${RAR_S[buddy.rarity]} ${buddy.rarity} ${buddy.species}${buddy.shiny?' ✨':''}`+c(E.d,` @ ${(i+1).toLocaleString()}`)))
          if(buddy.rarity==='legendary')break
        }
      } else {
        results.push({uid,buddy,attempts:i+1})
        console.log(c(RC[buddy.rarity],`  ${t('s_found')} ${RAR_S[buddy.rarity]} ${buddy.rarity} ${buddy.species}${buddy.shiny?' ✨':''}`+c(E.d,` @ ${(i+1).toLocaleString()}`)))
        break
      }
    }
    if(i>0&&i%500_000===0&&TTY)console.log(c(E.d,`  ... ${i.toLocaleString()} (${((Date.now()-start)/1000).toFixed(1)}s) ...`))
  }
  console.log(c(E.d,`\n  ${t('s_done',limit.toLocaleString(),((Date.now()-start)/1000).toFixed(2))}`))
  return results
}

// ── Install detection ────────────────────────────────────
function findCliJs(){const cands=[];try{const o=execSync('npm root -g',{timeout:5000,encoding:'utf8'}).trim();if(o&&!o.includes('Unknown'))cands.push(join(o,'@anthropic-ai','claude-code','cli.js'))}catch{}cands.push(join(homedir(),'.npm-global','lib','node_modules','@anthropic-ai','claude-code','cli.js'),join('/usr','local','lib','node_modules','@anthropic-ai','claude-code','cli.js'),join(process.env.APPDATA||'','npm','node_modules','@anthropic-ai','claude-code','cli.js'));for(const p of cands)if(existsSync(p))return p;return null}

function findNative(){const home=homedir(),cands=[join(home,'.local','bin','claude'),join(home,'.claude','local','claude'),'/usr/local/bin/claude'];const la=process.env.LOCALAPPDATA||'';if(la)cands.push(join(la,'Programs','ClaudeCode','claude.exe'));for(const p of cands){if(!existsSync(p))continue;try{const r=realpathSync(p);if(r.endsWith('.js')||r.includes('node_modules'))continue;return r}catch{}}const vd=join(home,'.local','share','claude','versions');if(existsSync(vd)){const vs=readdirSync(vd).filter(f=>/^\d+\.\d+\.\d+$/.test(f)).sort(cmpVer);if(vs.length)return join(vd,vs[vs.length-1])}return null}

function detectInstall(){const cli=findCliJs(),bin=findNative();if(cli){try{const w=whichBin('claude');if(w){const r=realpathSync(w);if(r.includes('node_modules')||r.endsWith('.js'))return{mode:'npm',cli,bin}}}catch{}return{mode:bin?'native':'npm',cli,bin}}return{mode:bin?'native':null,cli,bin}}

function detectEnvMisconfig(){const evs={...process.env};for(const sp of [join(homedir(),'.claude','settings.json'),join(process.cwd(),'.claude','settings.json')]){try{const s=JSON.parse(readFileSync(sp,'utf8'));if(s.env)Object.assign(evs,s.env)}catch{}}const hasUrl=!!evs.ANTHROPIC_BASE_URL;const cloud=[evs.CLAUDE_CODE_USE_BEDROCK==='1'&&'BEDROCK',evs.CLAUDE_CODE_USE_VERTEX==='1'&&'VERTEX',evs.CLAUDE_CODE_USE_FOUNDRY==='1'&&'FOUNDRY'].filter(Boolean);if(hasUrl&&cloud.length)return t('env_warn',cloud.join(', '));return null}

// ── npm patches (AST-based via acorn) ────────────────────
function walkAst(node,cb){
  if(!node||typeof node!=='object')return;cb(node)
  for(const k in node)if(node[k]&&typeof node[k]==='object'){if(Array.isArray(node[k]))node[k].forEach(ch=>walkAst(ch,cb));else walkAst(node[k],cb)}
}

function npmPatchAll(cliPath){
  const bak=cliPath+'.original';if(!existsSync(bak))copyFileSync(cliPath,bak)
  let code=readFileSync(cliPath,'utf8')
  // Handle shebang
  let shebang='';if(code.startsWith('#!')){const idx=code.indexOf('\n');shebang=code.slice(0,idx+1);code=code.slice(idx+1)}
  // Already patched v3?
  if(code.includes(MARKER)){console.log(c(E.g,`  ✓ ${t('p_ast_v3')}`));return}
  // Strip old markers
  code=code.replace(/\n;globalThis\.__buddyConfig=\{[^;]+\};\/\*__ccbuddy(?:_v2)?__(?::ctrl)?\*\/\n/g,'')
  // Phase 1: Parse
  let ast;try{ast=acorn.parse(code,{ecmaVersion:2022,sourceType:'module'})}catch(e){console.log(c(E.r,`  ${t('p_ast_fail')}: ${e.message}`));return}
  const src=n=>code.slice(n.start,n.end)
  // Phase 1b: Find isEssentialTraffic function name
  let etFnName=null
  walkAst(ast,n=>{
    if(n.type!=='FunctionDeclaration'||!n.id||n.params.length!==0)return
    const b=n.body.body;if(!b||b.length!==1||b[0].type!=='ReturnStatement')return
    const arg=b[0].argument;if(!arg||arg.type!=='BinaryExpression'||arg.operator!=='===')return
    if((arg.right.type==='Literal'&&arg.right.value==='essential-traffic')||(arg.left.type==='Literal'&&arg.left.value==='essential-traffic'))etFnName=n.id.name
  })
  // Phase 2: Locate 6 target functions
  const T={},V={}
  walkAst(ast,n=>{
    if(n.type!=='FunctionDeclaration'||!n.id)return
    const s=src(n),name=n.id.name,body=n.body
    // 1. isBuddyLive
    if(!T.buddyLive&&n.params.length===0&&etFnName&&s.includes('"firstParty"')&&s.includes('getMonth')&&s.includes(etFnName+'()')){
      const stmts=[];for(const st of body.body){if(st.type!=='IfStatement')continue;const test=st.test
        if(test.type==='BinaryExpression'&&test.operator==='!=='&&((test.right.type==='Literal'&&test.right.value==='firstParty')||(test.left.type==='Literal'&&test.left.value==='firstParty')))stmts.push({stmt:st,type:'firstParty'})
        if(test.type==='CallExpression'&&test.callee.type==='Identifier'&&test.callee.name===etFnName)stmts.push({stmt:st,type:'essentialTraffic'})
      }
      T.buddyLive=n;V.buddyLive={fnName:name,stmtsToRemove:stmts}
    }
    // 2. buddyReactAPI
    if(!T.buddyReact&&n.async&&s.includes('buddy_react')){
      const stmts=[];for(const st of body.body){if(st.type!=='IfStatement')continue;const test=st.test
        if(test.type==='BinaryExpression'&&test.operator==='!=='&&((test.right.type==='Literal'&&test.right.value==='firstParty')||(test.left.type==='Literal'&&test.left.value==='firstParty')))stmts.push({stmt:st,type:'firstParty'})
        if(etFnName&&test.type==='CallExpression'&&test.callee.type==='Identifier'&&test.callee.name===etFnName)stmts.push({stmt:st,type:'essentialTraffic'})
      }
      T.buddyReact=n;V.buddyReact={fnName:name,stmtsToRemove:stmts}
    }
    // 3. getCompanion
    if(!T.getCompanion&&n.params.length===0&&body.body?.length===4){
      const[s1,s2,s3,s4]=body.body
      if(s1?.type!=='VariableDeclaration')return;const d1=s1.declarations[0]
      if(!d1?.init||d1.init.type!=='MemberExpression'||d1.init.property?.name!=='companion')return
      if(d1.init.object?.type!=='CallExpression')return
      if(s2?.type!=='IfStatement')return
      if(s3?.type!=='VariableDeclaration')return;const d3=s3.declarations[0]
      if(!d3?.id||d3.id.type!=='ObjectPattern')return;const bp=d3.id.properties?.find(p=>p.key?.name==='bones');if(!bp)return
      if(s4?.type!=='ReturnStatement')return
      T.getCompanion=n;V.getCompanion={fnName:name,configVar:d1.id.name,configCall:src(d1.init.object),bonesVar:bp.value.name,rollCall:src(d3.init)}
    }
    // 4. renderSprite
    if(!T.renderSprite&&n.params.length===2){const p1=n.params[1]
      if(p1?.type!=='AssignmentPattern'||p1.right?.value!==0)return
      if(!s.includes('replaceAll')||!s.includes('{E}')||!s.includes('.species'))return
      const fs0=body.body[0];if(!fs0||fs0.type!=='VariableDeclaration'||fs0.declarations.length!==2)return
      T.renderSprite=n;V.renderSprite={fnName:name,bonesParam:n.params[0].name,frameParam:p1.left.name,framesVar:fs0.declarations[0].id.name,linesVar:fs0.declarations[1].id.name,bodiesVar:src(fs0.declarations[0].init.object),stmt0Node:fs0,decl1InitSrc:src(fs0.declarations[1].init)}
    }
    // 5. spriteFrameCount
    if(!T.spriteFrameCount&&n.params.length===1&&body.body?.length===1&&(n.end-n.start)<80){
      const ret=body.body[0];if(ret?.type!=='ReturnStatement')return;const arg=ret.argument
      if(!arg||arg.type!=='MemberExpression'||arg.property?.name!=='length')return
      if(arg.object?.type!=='MemberExpression')return
      T.spriteFrameCount=n;V.spriteFrameCount={fnName:name,speciesParam:n.params[0].name,bodiesVar:src(arg.object.object)}
    }
    // 6. renderFace
    if(!T.renderFace&&n.params.length===1&&body.body?.length===2){
      const[st1,st2]=body.body
      if(st1?.type!=='VariableDeclaration')return;if(st1.declarations[0]?.init?.property?.name!=='eye')return
      if(st2?.type!=='SwitchStatement')return;if(st2.discriminant?.property?.name!=='species')return
      T.renderFace=n;V.renderFace={fnName:name,bonesParam:n.params[0].name,eyeVar:st1.declarations[0].id.name}
    }
  })
  // Phase 3: Verify
  const found=Object.keys(T),missing=['buddyLive','buddyReact','getCompanion','renderSprite','spriteFrameCount','renderFace'].filter(k=>!T[k])
  if(!found.length){console.log(c(E.r,`  ✗ ${L==='zh'?'未找到任何目标函数':'No target functions found'}`));return}
  for(const m of missing)console.log(c(E.y,`  ⚠ ${m}() ${L==='zh'?'未找到':'not found'}`))
  if(!T.getCompanion){console.log(c(E.r,`  ✗ getCompanion() ${L==='zh'?'必须找到才能补丁':'required — cannot patch'}`));return}
  const cfgCall=V.getCompanion.configCall
  // Phase 4: Build replacements
  const reps=[]
  // A1: isBuddyLive — remove guards
  if(T.buddyLive)for(const{stmt,type}of V.buddyLive.stmtsToRemove)reps.push({start:stmt.start,end:stmt.end,replacement:`/*${MARKER}:${type}_bypass*/`,name:'buddyLive.'+type})
  // A2: buddyReactAPI — remove essentialTraffic only (keep firstParty)
  if(T.buddyReact)for(const{stmt,type}of V.buddyReact.stmtsToRemove)if(type==='essentialTraffic')reps.push({start:stmt.start,end:stmt.end,replacement:`/*${MARKER}:${type}_bypass*/`,name:'buddyReact.'+type})
  // B3: getCompanion — inject companionOverride merge
  if(T.getCompanion){const v=V.getCompanion
    reps.push({start:T.getCompanion.start,end:T.getCompanion.end,name:'getCompanion',replacement:
      `function ${v.fnName}(){/*${MARKER}*/let ${v.configVar}=${v.configCall}.companion;if(!${v.configVar})return;let{bones:${v.bonesVar}}=${v.rollCall};`+
      `var _ov=${v.configCall}.companionOverride;if(_ov){var _origSt=${v.bonesVar}.stats;if(_ov.stats)_origSt=Object.assign({},_origSt,_ov.stats);`+
      `Object.assign(${v.bonesVar},_ov);${v.bonesVar}.stats=_ov.stats?Object.assign({},${v.rollCall}.bones.stats,_ov.stats):_origSt;`+
      `delete ${v.bonesVar}.customSprite;delete ${v.bonesVar}.customFace}return{...${v.configVar},...${v.bonesVar}}}`})}
  // B4: renderSprite — customSprite fallback
  if(T.renderSprite){const v=V.renderSprite
    reps.push({start:v.stmt0Node.start,end:v.stmt0Node.end,name:'renderSprite',replacement:
      `var _csp=${cfgCall}.companionOverride;let ${v.framesVar}=(_csp&&Array.isArray(_csp.customSprite)&&_csp.customSprite.length>0)?_csp.customSprite:${v.bodiesVar}[${v.bonesParam}.species],${v.linesVar}=${v.decl1InitSrc};`})}
  // B5: spriteFrameCount — customSprite length
  if(T.spriteFrameCount){const v=V.spriteFrameCount
    reps.push({start:T.spriteFrameCount.start,end:T.spriteFrameCount.end,name:'spriteFrameCount',replacement:
      `function ${v.fnName}(${v.speciesParam}){var _csp3=${cfgCall}.companionOverride;if(_csp3&&Array.isArray(_csp3.customSprite)&&_csp3.customSprite.length>0)return _csp3.customSprite.length;return ${v.bodiesVar}[${v.speciesParam}].length}`})}
  // B6: renderFace — customFace fallback
  if(T.renderFace){const v=V.renderFace;const bs=T.renderFace.body.start+1
    reps.push({start:bs,end:bs,name:'renderFace',replacement:
      `var _cf4=${cfgCall}.companionOverride;if(_cf4&&typeof _cf4.customFace==="string")return _cf4.customFace.replaceAll("{E}",${v.bonesParam}.eye);`})}
  // C: Control switches
  reps.push({start:code.length,end:code.length,name:'controlSwitch',replacement:
    `\n;globalThis.__buddyConfig={unlocked:${!!T.buddyLive},customized:${!!T.getCompanion},version:"3.0",patches:${JSON.stringify(reps.map(r=>r.name))},tool:"cc-buddy"};/*${MARKER}:ctrl*/\n`})
  // Phase 5: Apply end-to-start + verify
  reps.sort((a,b)=>b.start-a.start);let newCode=code;for(const r of reps)newCode=newCode.slice(0,r.start)+r.replacement+newCode.slice(r.end)
  if(newCode===code){console.log(c(E.y,'  ⚠ No changes made'));return}
  try{acorn.parse(newCode,{ecmaVersion:2022,sourceType:'module'})}catch(e){console.log(c(E.r,`  ✗ AST verify failed: ${e.message}`));return}
  writeFileSync(cliPath,shebang+newCode,'utf8')
  // Log results
  const patchNames=[...new Set(reps.map(r=>r.name.split('.')[0]))]
  const labels={buddyLive:'/buddy unlock',buddyReact:L==='zh'?'气泡反应':'Speech bubbles',getCompanion:'companionOverride',renderSprite:'customSprite',spriteFrameCount:'spriteFrameCount',renderFace:'customFace',controlSwitch:'__buddyConfig'}
  for(const p of patchNames)console.log(c(E.g,`  ✓ ${labels[p]||p}`))
  console.log(c(E.g,`  ${t('p_ast_ok')}`))
}

async function npmCheckPatches(cliPath){
  const code=readFileSync(cliPath,'utf8')
  if(code.includes(MARKER)){console.log(c(E.g,`  ${t('p_chk_v3')}`));return}
  if(code.includes('__ccbuddy_v2__')||code.includes('__ccbuddy__')||code.includes('_ccbov')){console.log(c(E.y,`  ${t('p_chk_old')}`));return}
  console.log(c(E.y,`  ${t('p_chk_none')}`))
}

// ── Native patches ───────────────────────────────────────
const P_SPREAD_B=/if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\1,\.\.\.\2\}/
const P_SPREAD_A=/if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\2,\.\.\.\1\}/
const N_BUDDY_RE=/function (\w+)\(\)\{if\(\w+\(\)!=="firstParty"\)return!1;if\(\w+\(\)\)return!1;let (\w)=new Date;return \2\.getFullYear\(\)>2026\|\|\2\.getFullYear\(\)===2026&&\2\.getMonth\(\)>=3\}/

function detectSalt(fp){const buf=readFileSync(fp),pats=[/friend-\d{4}-\d+/,/ccbf-\d{10}/];const chunk=10*1024*1024;for(let o=0;o<buf.length;o+=chunk-50){const s=buf.slice(o,Math.min(o+chunk,buf.length)).toString('ascii');for(const p of pats){const m=s.match(p);if(m)return{salt:m[0],len:m[0].length}}}return null}
function genSalt(){return`ccbf-${Math.floor(Date.now()/1000).toString().padStart(10,'0')}`}

function bufReplace(buf,oldStr,newStr){const oB=Buffer.from(oldStr),nB=Buffer.from(newStr);let p=0;while(true){const idx=buf.indexOf(oB,p);if(idx===-1)break;nB.copy(buf,idx);p=idx+1}}

function nativePatchAll(binPath,oldSalt,newSalt){
  try{
    const bak=binPath+'.pre-salt-patch';if(!existsSync(bak))copyFileSync(binPath,bak)
    if(process.platform==='darwin')try{execSync(`codesign --remove-signature "${binPath}"`,{timeout:10000,stdio:'pipe'})}catch{}
    let buf=readFileSync(binPath),content=buf.toString('ascii'),dirty=false
    // 1. Buddy unlock
    const bm=content.match(N_BUDDY_RE)
    if(bm){const orig=bm[0],fn=bm[1],pad=orig.length-`function ${fn}(){return!0}`.length;if(pad>=0){bufReplace(buf,orig,`function ${fn}(){return!0${';'.repeat(pad)}}`);dirty=true;console.log(c(E.g,`  ✓ ${L==='zh'?'/buddy 解锁':'/buddy unlocked'}`))}}
    // 2. Spread swap (same-length: {...X,...Y} → {...Y,...X})
    const sm=content.match(P_SPREAD_B)
    if(sm){const orig=sm[0],rep=orig.replace(`{...${sm[1]},...${sm[2]}}`,`{...${sm[2]},...${sm[1]}}`);bufReplace(buf,orig,rep);dirty=true;console.log(c(E.g,`  ✓ ${L==='zh'?'属性自定义':'Custom attributes'}`))}
    else if(P_SPREAD_A.test(content))console.log(c(E.g,`  ✓ ${L==='zh'?'属性自定义 (已生效)':'Custom attributes (already applied)'}`))
    else console.log(c(E.y,`  ${t('p_unk_attr')}`))
    // 3. SALT swap
    const oS=Buffer.from(oldSalt),nS=Buffer.from(newSalt);let cnt=0,p=0
    while(true){const idx=buf.indexOf(oS,p);if(idx===-1)break;nS.copy(buf,idx);cnt++;p=idx+1}
    if(cnt>0){dirty=true;console.log(c(E.g,`  ✓ SALT: ${oldSalt} → ${newSalt} (${cnt}x)`))}
    // Write once
    if(dirty)writeFileSync(binPath,buf)
    // Re-sign
    if(process.platform==='darwin'){try{execSync(`codesign --force --sign - "${binPath}"`,{timeout:10000,stdio:'pipe'});console.log(c(E.g,`  ✓ ${L==='zh'?'重签名':'Re-signed'}`))}catch{console.log(c(E.r,`  ✗ codesign --force --sign - "${binPath}"`))}}
  }catch(e){
    if(e.code==='ETXTBSY')console.log(c(E.r,`  ✗ ${L==='zh'?'二进制正在运行，请先关闭 Claude Code 再重试':'Binary is in use — close Claude Code first, then retry'}`))
    else if(e.code==='EACCES'||e.code==='EPERM')console.log(c(E.r,`  ✗ ${L==='zh'?'权限不足，请用 sudo 运行':'Permission denied — try running with sudo'}`))
    else console.log(c(E.r,`  ✗ ${L==='zh'?'原生二进制补丁失败':'Native patch failed'}: ${e.code||e.message}`))
  }
}

// ── Config writers ───────────────────────────────────────
function writeConfig(uid, buddy=null, soul=null){
  const cfg=readCfg()||{};if(existsSync(CONFIG_PATH))copyFileSync(CONFIG_PATH,CONFIG_PATH+`.bak.${Date.now()}`)
  if(cfg.oauthAccount?.accountUuid){const old=cfg.oauthAccount.accountUuid;delete cfg.oauthAccount.accountUuid;console.log(c(E.c,`  ${t('a_oauth')}`));console.log(c(E.d,`  Old UUID: ${old}`))}
  cfg.userID=uid
  cfg.companion={hatchedAt:cfg.companion?.hatchedAt||Date.now()}
  if(buddy){
    const bones={species:buddy.species,rarity:buddy.rarity,eye:buddy.eye,hat:buddy.hat,shiny:buddy.shiny,stats:buddy.stats}
    cfg.companionOverride=bones                   // npm: injected code reads this
    Object.assign(cfg.companion,bones)             // native: spread swap reads this
  }
  if(soul?.name)cfg.companion.name=soul.name
  if(soul?.personality)cfg.companion.personality=soul.personality
  if(soul?.name)console.log(c(E.m,`  ${t('diy_set',soul.name)}`))
  else console.log(c(E.d,`  ${t('diy_auto')}`))
  writeFileSync(CONFIG_PATH,JSON.stringify(cfg,null,2),'utf8')
  console.log(c(E.g+E.b,`  ${t('a_ok')}`))
}

function writeSoul(name,pers){const cfg=readCfg();if(!cfg?.companion)return false;if(existsSync(CONFIG_PATH))copyFileSync(CONFIG_PATH,CONFIG_PATH+`.bak.${Date.now()}`);if(name)cfg.companion.name=name;if(pers)cfg.companion.personality=pers;writeFileSync(CONFIG_PATH,JSON.stringify(cfg,null,2),'utf8');return true}

// ── Interactive: Search & Apply (main flow) ──────────────
async function interactiveSearch(){
  const{mode,cli,bin}=detectInstall()
  let nSalt=null,newSalt=null
  if(mode==='native'&&bin){nSalt=detectSalt(bin);if(nSalt)newSalt=genSalt()}
  const ew=detectEnvMisconfig();if(ew)console.log(c(E.y,`  ${ew}\n`))

  const cr=await selectPet()
  console.log(`\n  ${c(E.b,`${t('s_target')} ${criteriaLabel(cr)}`)}\n`)

  const results=search(cr,5_000_000,mode==='native'?newSalt:null)
  if(!results.length){console.log(c(E.r+E.b,`\n  ${t('s_none')}\n`));return}

  const best=results[results.length-1]
  console.log(c(E.g+E.b,'\n  ════════════════════════════════════'))
  console.log(c(E.g+E.b,`  ${t('s_best')}`))
  console.log(c(E.g+E.b,'  ════════════════════════════════════'))
  console.log(fmt(best.buddy,best.uid))

  if(!(await yn(t('si_apply'),true))){console.log(c(E.d,`\n  ${t('si_skip')}\n`));return}

  console.log('')
  const nm=await ask(`  ${c(E.m,'✏️')} ${t('diy_name')} `)
  const ps=nm?await ask(`  ${c(E.m,'✏️')} ${t('diy_pers')} `):''
  const soul=(nm||ps)?{name:nm,personality:ps}:null

  if(mode==='npm'&&cli){npmPatchAll(cli);writeConfig(best.uid,best.buddy,soul)}
  else if(mode==='native'&&bin&&newSalt&&nSalt){nativePatchAll(bin,nSalt.salt,newSalt);writeConfig(best.uid,best.buddy,soul)}
  else{if(mode==='native')console.log(c(E.y,`  ${t('n_skip')}`));writeConfig(best.uid,best.buddy,soul)}

  console.log(c(E.g+E.b,`\n  ${t('si_done')}`))
  console.log(c(E.d,`  ${t('tip_override')}\n`))
}

// ── Interactive: Check ───────────────────────────────────
function applyOverride(buddy,cfg){
  const ov=cfg?.companionOverride;if(!ov)return buddy
  const b={...buddy};if(ov.species)b.species=ov.species;if(ov.rarity)b.rarity=ov.rarity
  if(ov.eye)b.eye=ov.eye;if(ov.hat)b.hat=ov.hat;if(ov.shiny!=null)b.shiny=ov.shiny
  if(ov.stats)b.stats={...b.stats,...ov.stats};return b
}
function interactiveCheck(){
  const cfg=readCfg();if(!cfg){console.log(c(E.y,`\n  ${t('chk_none')}\n`));return}
  const oa=cfg.oauthAccount?.accountUuid,uid=cfg.userID,ov=cfg.companionOverride
  const name=cfg.companion?.name
  if(oa||uid){
    const id=oa||uid,base=roll(id),actual=applyOverride(base,cfg)
    console.log(c(E.b,`\n  ${oa?t('chk_oauth'):t('chk_cur')}`))
    if(name)console.log(c(E.m+E.b,`  ${name}`))
    console.log(fmt(actual,id))
    if(ov&&Object.keys(ov).length){console.log(c(E.c,`  companionOverride: ${Object.keys(ov).join(', ')}`))}
    if(oa)console.log(c(E.y,`  ${t('chk_oauth_w')}`))
  } else console.log(c(E.r,`\n  ${t('chk_no_id')}\n`))
  chkVer()
}

// ── Interactive: Gallery ─────────────────────────────────
function interactiveGallery(){
  console.log(c(E.b,`\n  ${t('gal_sp')}\n`));for(const s of SPECIES)console.log(`    ${SP_E[s]}  ${s}`)
  console.log(c(E.b,`\n  ${t('gal_rar')}\n`));for(const r of RARITIES){const p=RARITY_W[r];console.log(`    ${c(RC[r],`${RAR_S[r].padEnd(6)} ${r.padEnd(10)}`)} ${'█'.repeat(Math.ceil(p/3))+'░'.repeat(20-Math.ceil(p/3))} ${p}%`)}
  console.log(c(E.b,`\n  ${t('gal_eye')}\n`));console.log(`    ${EYES.join('  ')}`)
  console.log(c(E.b,`\n  ${t('gal_hat')}\n`));for(const h of HATS)console.log(`    ${HAT_E[h]}  ${h}`)
  console.log(c(E.d,`\n  ${t('gal_note')}\n`))
}

// ── Interactive: Selftest ────────────────────────────────
function interactiveSelftest(){
  console.log(c(E.b,`\n  ${t('t_title')}\n`));const tests=['hello','test-id'+SALT,randomBytes(32).toString('hex')+SALT];let ok=true
  for(const s of tests){const js=Number(wyhash(Buffer.from(s,'utf8'))&0xffffffffn);if(IS_BUN){const bh=Number(BigInt(Bun.hash(s))&0xffffffffn),m=js===bh;if(!m)ok=false;console.log(`  ${m?c(E.g,'✓'):c(E.r,'✗')} "${s.substring(0,30)}${s.length>30?'...':''}"  Bun:${bh} JS:${js}`)}else console.log(`  ● "${s.substring(0,30)}${s.length>30?'...':''}"  wyhash:${js} fnv1a:${hFnv(s)}`)}
  console.log('');if(IS_BUN)console.log(c(ok?E.g+E.b:E.r+E.b,`  ${ok?t('t_ok'):t('t_fail')}\n`));else console.log(c(E.y,`  ${t('t_no_bun')}\n`))
}

// ── Interactive: DIY customize ───────────────────────────
function writeOverride(key,val){
  const cfg=readCfg();if(!cfg){console.log(c(E.r,'  No config'));return false}
  if(!cfg.companionOverride)cfg.companionOverride={}
  if(val===undefined)delete cfg.companionOverride[key]
  else cfg.companionOverride[key]=val
  if(cfg.companion)cfg.companion[key]=val  // dual-write for native compat
  writeFileSync(CONFIG_PATH,JSON.stringify(cfg,null,2),'utf8');return true
}

async function interactiveDiy(){
  // Auto-patch if needed
  const{cli}=detectInstall();if(cli)npmPatchAll(cli)
  const cfg=readCfg()
  if(!cfg){console.log(c(E.y,`\n  ${t('diy_none')}\n`));return}
  // Ensure companion exists for buddy to work
  if(!cfg.companion){cfg.companion={hatchedAt:Date.now()};writeFileSync(CONFIG_PATH,JSON.stringify(cfg,null,2),'utf8')}
  const ov=cfg.companionOverride||{},comp=cfg.companion||{}
  while(true){
    const cur={species:ov.species||comp.species||'?',rarity:ov.rarity||comp.rarity||'?',eye:ov.eye||comp.eye||'·',hat:ov.hat||comp.hat||'none',shiny:!!(ov.shiny||comp.shiny)}
    console.log('')
    console.log(c(E.b+E.m,`  ✏️  ${L==='zh'?'自定义当前宠物':'Customize Current Buddy'}`))
    console.log(c(E.d,`  ${SP_E[cur.species]||'?'} ${cur.species} | ${RAR_S[cur.rarity]||'?'} ${cur.rarity} | ${cur.eye} | ${HAT_E[cur.hat]||'?'} ${cur.hat}${cur.shiny?' ✨':''} | ${comp.name||'(no name)'}`))
    const items=[
      `🏷️  ${L==='zh'?'名字/性格':'Name/Personality'}`,
      `🐾 ${L==='zh'?'物种':'Species'} → ${cur.species}`,
      `⭐ ${L==='zh'?'稀有度':'Rarity'} → ${cur.rarity}`,
      `👀 ${L==='zh'?'眼睛':'Eyes'} → ${cur.eye}`,
      `🎩 ${L==='zh'?'帽子':'Hat'} → ${cur.hat}`,
      `✨ ${L==='zh'?'闪光':'Shiny'} → ${cur.shiny?'yes':'no'}`,
      `📊 ${L==='zh'?'五维属性':'Stats'}`,
      `😊 ${L==='zh'?'自定义表情':'Custom Face'} → ${ov.customFace||'(default)'}`,
      `🎨 ${L==='zh'?'自定义精灵图':'Custom Sprite'} → ${ov.customSprite?`${ov.customSprite.length} frames`:'(default)'}`,
      `← ${L==='zh'?'返回':'Back'}`,
    ]
    const ch=await sel(L==='zh'?'选择要修改的项目':'What to customize?',items)
    if(ch===9||ch<0)break
    switch(ch){
      case 0:{ // Name/Personality
        const nm=await ask(`  ${c(E.m,'✏️')} ${t('diy_name')} `)
        const ps=nm?await ask(`  ${c(E.m,'✏️')} ${t('diy_pers')} `):''
        if(nm||ps){writeSoul(nm||undefined,ps||undefined);console.log(c(E.g,`  ✓ ${L==='zh'?'已更新':'Updated'}`))}
        break}
      case 1:{ // Species
        const idx=await sel(L==='zh'?'选择物种':'Pick species',SPECIES.map(s=>`${SP_E[s]}  ${s}`))
        if(idx>=0){writeOverride('species',SPECIES[idx]);Object.assign(ov,{species:SPECIES[idx]});console.log(c(E.g,`  ✓ species → ${SPECIES[idx]}`))}
        break}
      case 2:{ // Rarity
        const idx=await sel(L==='zh'?'选择稀有度':'Pick rarity',RARITIES.map(r=>`${c(RC[r],RAR_S[r])} ${r}`))
        if(idx>=0){writeOverride('rarity',RARITIES[idx]);Object.assign(ov,{rarity:RARITIES[idx]});console.log(c(E.g,`  ✓ rarity → ${RARITIES[idx]}`))}
        break}
      case 3:{ // Eyes
        const idx=await sel(L==='zh'?'选择眼睛 (或输入自定义字符)':'Pick eyes (or type custom char)',EYES.map(e=>`  ${e}`))
        if(idx>=0){writeOverride('eye',EYES[idx]);Object.assign(ov,{eye:EYES[idx]});console.log(c(E.g,`  ✓ eye → ${EYES[idx]}`))}
        else{const ce=await ask(`  ${L==='zh'?'输入自定义字符':'Enter custom char'}: `);if(ce){writeOverride('eye',ce);Object.assign(ov,{eye:ce});console.log(c(E.g,`  ✓ eye → ${ce}`))}}
        break}
      case 4:{ // Hat
        const idx=await sel(L==='zh'?'选择帽子':'Pick hat',HATS.map(h=>`${HAT_E[h]}  ${h}`))
        if(idx>=0){writeOverride('hat',HATS[idx]);Object.assign(ov,{hat:HATS[idx]});console.log(c(E.g,`  ✓ hat → ${HATS[idx]}`))}
        break}
      case 5:{ // Shiny
        const v=await yn(L==='zh'?'开启闪光?':'Enable shiny?',cur.shiny)
        writeOverride('shiny',v);Object.assign(ov,{shiny:v});console.log(c(E.g,`  ✓ shiny → ${v}`))
        break}
      case 6:{ // Stats
        console.log(c(E.b,`\n  📊 ${L==='zh'?'设置属性值 (0-100, 回车跳过)':'Set stats (0-100, Enter to skip)'}\n`))
        const curStats=ov.stats||comp.stats||{};const newStats={}
        for(const s of STATS){
          const cv=curStats[s]||0;const a=await ask(`  ${s.padEnd(10)} [${cv}] → `)
          if(a!==''){const n=Math.min(100,Math.max(0,parseInt(a)||0));newStats[s]=n}else newStats[s]=cv
        }
        writeOverride('stats',newStats);Object.assign(ov,{stats:newStats})
        console.log(c(E.g,`  ✓ ${L==='zh'?'属性已更新':'Stats updated'}`))
        break}
      case 7:{ // Custom face
        console.log(c(E.d,`\n  ${L==='zh'?'使用 {E} 作为眼睛占位符':'Use {E} as eye placeholder'}`))
        console.log(c(E.d,`  ${L==='zh'?'示例':'Example'}: ({E}ω{E}) → (✦ω✦)\n`))
        const a=await ask(`  ${L==='zh'?'输入表情 (回车清除)':'Enter face (Enter to clear)'}: `)
        if(a){writeOverride('customFace',a);Object.assign(ov,{customFace:a});console.log(c(E.g,`  ✓ customFace → ${a}`))}
        else{writeOverride('customFace',undefined);delete ov.customFace;console.log(c(E.d,`  ${L==='zh'?'已清除':'Cleared'}`))}
        break}
      case 8:{ // Custom sprite
        const presetKeys=Object.keys(SPRITE_PRESETS)
        const presetItems=presetKeys.map(k=>SPRITE_PRESETS[k].name[L]||SPRITE_PRESETS[k].name.en)
        presetItems.push(`📋 ${L==='zh'?'粘贴 JSON':'Paste JSON'}`,`🗑️  ${L==='zh'?'清除':'Clear'}`)
        // Preview first preset
        console.log(c(E.d,`\n  ${L==='zh'?'精灵图预设 (5行 × 1-3帧, {E}=眼睛)':'Sprite presets (5 lines × 1-3 frames, {E}=eyes)'}`))
        const pch=await sel(L==='zh'?'选择预设或粘贴 JSON':'Pick a preset or paste JSON',presetItems)
        if(pch>=0&&pch<presetKeys.length){
          const pk=presetKeys[pch],p=SPRITE_PRESETS[pk]
          // Preview
          console.log(c(E.d,`\n  Preview (${p.name.en}):`))
          const eye=ov.eye||comp.eye||'✦'
          for(const line of p.sprite[0])console.log(c(E.c,`    ${line.replace(/\{E\}/g,eye)}`))
          if(await yn(`\n  ${L==='zh'?'应用此精灵图?':'Apply this sprite?'}`,true)){
            writeOverride('customSprite',p.sprite);writeOverride('customFace',p.face)
            Object.assign(ov,{customSprite:p.sprite,customFace:p.face})
            console.log(c(E.g,`  ✓ customSprite → ${pk} (${p.sprite.length} frames)`))
          }
        } else if(pch===presetKeys.length){ // Paste JSON
          const exJson=JSON.stringify(SPRITE_PRESETS.neko.sprite)
          if(L==='zh'){
            console.log(c(E.b,'\n  📐 自定义精灵图规则:\n'))
            console.log(c(E.d,'  • 格式: JSON 数组，1-3 帧，每帧 5 行字符串'))
            console.log(c(E.d,'  • 每行建议 ~12 字符宽，所有行等宽'))
            console.log(c(E.d,'  • 用 {E} 标记眼睛位置（运行时替换为 eye 字段值）'))
            console.log(c(E.d,'  • 第 0 行 = 帽子槽（帧 0-1 留空白给帽子覆盖，帧 2 可放特效）'))
            console.log(c(E.d,'  • 帧 0 = 静止, 帧 1 = 微动, 帧 2 = 特效\n'))
            console.log(c(E.b,'  示例 (猫耳娘 3 帧):'))
          } else {
            console.log(c(E.b,'\n  📐 Custom Sprite Rules:\n'))
            console.log(c(E.d,'  • Format: JSON array, 1-3 frames, each frame = 5 strings'))
            console.log(c(E.d,'  • Each line ~12 chars wide, keep all lines equal width'))
            console.log(c(E.d,'  • Use {E} to mark eye positions (replaced with eye char at runtime)'))
            console.log(c(E.d,'  • Line 0 = hat slot (keep blank in frame 0-1 for hat, frame 2 for effects)'))
            console.log(c(E.d,'  • Frame 0 = idle, Frame 1 = fidget, Frame 2 = sparkle\n'))
            console.log(c(E.b,'  Example (catgirl, 3 frames):'))
          }
          const exEye=ov.eye||comp.eye||'✦'
          for(let fi=0;fi<3;fi++){
            console.log(c(E.c,`\n  Frame ${fi}:`))
            for(const line of SPRITE_PRESETS.neko.sprite[fi])console.log(c(E.c,`    ${line.replace(/\{E\}/g,exEye)}`))
          }
          console.log(c(E.d,`\n  JSON:\n  ${exJson}\n`))
          const a=await ask(`  ${L==='zh'?'粘贴你的 JSON':'Paste your JSON'} > `)
          if(a){try{const sp=JSON.parse(a)
            if(!Array.isArray(sp)||sp.length<1||sp.length>3)throw new Error(L==='zh'?'需要 1-3 帧':'Need 1-3 frames')
            for(const f of sp){if(!Array.isArray(f)||f.length!==5)throw new Error(L==='zh'?'每帧必须 5 行':'Each frame must be 5 lines')}
            writeOverride('customSprite',sp);Object.assign(ov,{customSprite:sp})
            console.log(c(E.g,`  ✓ customSprite → ${sp.length} frames`))
          }catch(e){console.log(c(E.r,`  ✗ ${e.message}`))}}
        } else if(pch===presetKeys.length+1){ // Clear
          writeOverride('customSprite',undefined);writeOverride('customFace',undefined)
          delete ov.customSprite;delete ov.customFace
          console.log(c(E.d,`  ${L==='zh'?'已清除':'Cleared'}`))
        }
        break}
    }
  }
  console.log(c(E.y,`\n  ${t('a_restart')}\n`))
}

// ── Interactive mode ─────────────────────────────────────
async function interactiveMode(){
  banner()
  while(true){
    const items=[t('menu_diy'),t('menu_search'),t('menu_check'),t('menu_gallery'),t('menu_test'),t('menu_lang'),t('menu_exit')]
    const ch=await sel(t('menu_title'),items)
    switch(ch){
      case 0:await interactiveDiy();break
      case 1:do{await interactiveSearch()}while(await yn(t('si_again'),true));break
      case 2:interactiveCheck();await ask(`\n  ${c(E.d,t('press'))} `);break
      case 3:interactiveGallery();await ask(`  ${c(E.d,t('press'))} `);break
      case 4:interactiveSelftest();await ask(`  ${c(E.d,t('press'))} `);break
      case 5:L=await pickLang();banner();break
      case 6:default:console.log('');return
    }
  }
}

// ── CLI mode ─────────────────────────────────────────────
function parseArgs(argv){const args={cmd:null,f:{},o:{}};const cmds=['search','check','apply','gallery','selftest','help','lang'];let i=0;for(;i<argv.length;i++){const a=argv[i];if(a==='--lang'||a==='--hash'){i++;continue}if(a==='--check-patches'){args.cmd='check-patches';continue}if(!a.startsWith('-')&&cmds.includes(a)){args.cmd=a;i++;break}}for(;i<argv.length;i++){const a=argv[i],n=argv[i+1];switch(a){case'--species':case'-s':args.f.species=n;i++;break;case'--rarity':case'-r':args.f.rarity=n;i++;break;case'--eye':case'-e':args.f.eye=n;i++;break;case'--hat':args.f.hat=n;i++;break;case'--shiny':args.f.shiny=true;break;case'--limit':case'-l':args.o.limit=parseInt(n);i++;break;case'--json':args.o.json=true;break;case'--lang':case'--hash':i++;break;default:if(!a.startsWith('-')&&(args.cmd==='apply'||args.cmd==='check'))args.o.uid=a}}return args}

function cliSearch(cr,opts){banner();if(!Object.keys(cr).length){console.log(c(E.r,'  Need at least one filter.\n'));return}const p=criteriaLabel(cr);console.log(c(E.b,`  ${t('s_target')} ${p}\n`));const res=search(cr,opts.limit||5_000_000);if(!res.length){console.log(c(E.r,`\n  ${t('s_none')}\n`));return}const best=res[res.length-1];if(opts.json){console.log(JSON.stringify(res.map(r=>({userId:r.uid,buddy:r.buddy,attempts:r.attempts})),null,2));return}console.log(c(E.g+E.b,`\n  ════════════════════════════════════\n  ${t('s_best')}\n  ════════════════════════════════════`));console.log(fmt(best.buddy,best.uid));console.log(c(E.c,`  node buddy-reroll.mjs apply ${best.uid}\n`))}

// ── Main ─────────────────────────────────────────────────
async function main(){
  let lang=loadLang();const args=parseArgs(process.argv.slice(2));const hasCmd=args.cmd||Object.keys(args.f).length>0
  if(lang===null)lang=await pickLang();L=lang;HASH_MODE=detectHash()
  if(!hasCmd){await interactiveMode();return}
  switch(args.cmd){
    case'search':cliSearch(args.f,args.o);break
    case'check':banner();if(args.o.uid){console.log(c(E.b,`  ${t('chk_cur')}`));console.log(fmt(roll(args.o.uid),args.o.uid))}else interactiveCheck();break
    case'apply':banner();if(!args.o.uid){console.log(c(E.r,'  Usage: apply <userID>\n'));break};if(chkVer()!=='outdated'){const{cli}=detectInstall();if(cli)npmPatchAll(cli);writeConfig(args.o.uid,roll(args.o.uid));console.log(c(E.d,`  ${t('tip_override')}`))}break
    case'check-patches':banner();{const{cli}=detectInstall();if(cli)npmCheckPatches(cli);else console.log(c(E.y,'  cli.js not found'))}break
    case'gallery':banner();interactiveGallery();break
    case'selftest':banner();interactiveSelftest();break
    case'lang':await pickLang();break
    default:if(Object.keys(args.f).length>0)cliSearch(args.f,args.o);else{banner();console.log(c(E.d,'  node buddy-reroll.mjs              → Interactive mode'));console.log(c(E.d,'  node buddy-reroll.mjs search ...   → CLI mode\n'));console.log(c(E.d,'  --species/-s  --rarity/-r  --eye/-e  --hat  --shiny  --limit/-l  --json  --lang <en|zh>  --hash <wyhash|fnv1a>\n'))}
  }
}
main()
