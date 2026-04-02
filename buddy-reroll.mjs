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

// ── Constants ────────────────────────────────────────────
const VERSION = '3.0.10'
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
  menu_diy:     { en:'✏️   Customize name/personality',   zh:'✏️   自定义名字/性格' },
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
function detectHash(){const i=process.argv.indexOf('--hash');if(i!==-1){const v=(process.argv[i+1]||'').toLowerCase();return(v==='fnv'||v==='fnv1a')?'fnv1a':'wyhash'}try{const d=JSON.parse(readFileSync(PREF_PATH,'utf8'));if(d.hashMode)return d.hashMode}catch{}try{const w=whichBin('claude');if(w){const r=realpathSync(w);if(r.includes('node_modules')||r.endsWith('.js'))return'fnv1a'}}catch{}return'wyhash'}
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

// ── npm patches ──────────────────────────────────────────
const P_SPREAD_B=/if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\1,\.\.\.\2\}/
const P_SPREAD_A=/if\(!(\w)\)return;let\{bones:(\w)\}=\w+\(\w+\(\)\);return\{\.\.\.\2,\.\.\.\1\}/
const P_TELE=/if\(\w+\(\)!=="firstParty"\)return null;if\((\w+)\(\)\)return null;(let \w=\w+\(\))/
const P_BUDDY=/function (\w+)\(\)\{if\(\w+\(\)!=="firstParty"\)return!1;if\(\w+\(\)\)return!1;let \w+=new Date;return \w+\.getFullYear\(\)>2026\|\|\w+\.getFullYear\(\)===2026&&\w+\.getMonth\(\)>=3\}/

const P_BUDDY_DONE=/function \w+\(\)\{return!0\}/
const P_TELE_DONE=/if\(\w+\(\)!=="firstParty"\)return null;let \w+=\w+\(\)/

function npmPatchAll(cliPath){
  const bak=cliPath+'.original';if(!existsSync(bak))copyFileSync(cliPath,bak)
  let f=readFileSync(cliPath,'utf8'),changed=false
  // Spread swap
  if(P_SPREAD_B.test(f)){const m=f.match(P_SPREAD_B);if(m){f=f.replace(P_SPREAD_B,x=>x.replace(`{...${m[1]},...${m[2]}}`,`{...${m[2]},...${m[1]}}`));changed=true;console.log(c(E.g,`  ✓ ${L==='zh'?'属性自定义':'Custom attributes'}`))}}
  else if(P_SPREAD_A.test(f))console.log(c(E.g,`  ✓ ${L==='zh'?'属性自定义 (已生效)':'Custom attributes (already applied)'}`))
  else console.log(c(E.y,`  ${t('p_unk_attr')}`))
  // Buddy unlock
  if(P_BUDDY.test(f)){const m=f.match(P_BUDDY);if(m){f=f.replace(P_BUDDY,`function ${m[1]}(){return!0}`);changed=true;console.log(c(E.g,`  ✓ ${L==='zh'?'/buddy 解锁':'/buddy unlocked'}`))}}
  else if(P_BUDDY_DONE.test(f))console.log(c(E.g,`  ✓ ${L==='zh'?'/buddy 解锁 (已生效)':'/buddy unlocked (already applied)'}`))
  else console.log(c(E.y,`  ${t('p_unk_buddy')}`))
  // Telemetry bypass
  if(P_TELE.test(f)){const m=f.match(P_TELE);if(m){f=f.replace(P_TELE,(x,tf,lp)=>x.replace(`if(${tf}())return null;${lp}`,lp));changed=true;console.log(c(E.g,`  ✓ ${L==='zh'?'气泡反应':'Speech bubbles'}`))}}
  else if(P_TELE_DONE.test(f))console.log(c(E.g,`  ✓ ${L==='zh'?'气泡反应 (已生效)':'Speech bubbles (already applied)'}`))
  else console.log(c(E.y,`  ${t('p_unk_tele')}`))
  if(changed)writeFileSync(cliPath,f,'utf8')
}

// ── Native patches ───────────────────────────────────────
const N_BUDDY_RE=/function (\w+)\(\)\{if\(\w+\(\)!=="firstParty"\)return!1;if\(\w+\(\)\)return!1;let (\w)=new Date;return \2\.getFullYear\(\)>2026\|\|\2\.getFullYear\(\)===2026&&\2\.getMonth\(\)>=3\}/

function detectSalt(fp){const buf=readFileSync(fp),pats=[/friend-\d{4}-\d+/,/ccbf-\d{10}/];const chunk=10*1024*1024;for(let o=0;o<buf.length;o+=chunk-50){const s=buf.slice(o,Math.min(o+chunk,buf.length)).toString('ascii');for(const p of pats){const m=s.match(p);if(m)return{salt:m[0],len:m[0].length}}}return null}
function genSalt(){return`ccbf-${Math.floor(Date.now()/1000).toString().padStart(10,'0')}`}

function nativePatchAll(binPath,oldSalt,newSalt){
  const bak=binPath+'.pre-salt-patch';if(!existsSync(bak))copyFileSync(binPath,bak)
  if(process.platform==='darwin')try{execSync(`codesign --remove-signature "${binPath}"`,{timeout:10000,stdio:'pipe'})}catch{}
  // Buddy unlock
  let buf=readFileSync(binPath),content=buf.toString('ascii'),m=content.match(N_BUDDY_RE)
  if(m){const orig=m[0],fn=m[1],pad=orig.length-`function ${fn}(){return!0}`.length;if(pad>=0){const rep=`function ${fn}(){return!0${';'.repeat(pad)}}`;const oB=Buffer.from(orig),nB=Buffer.from(rep);let p=0;while(true){const idx=buf.indexOf(oB,p);if(idx===-1)break;nB.copy(buf,idx);p=idx+1}writeFileSync(binPath,buf);console.log(c(E.g,`  ✓ ${L==='zh'?'/buddy 解锁':'/buddy unlocked'}`))}}
  // SALT swap
  buf=readFileSync(binPath);const oB=Buffer.from(oldSalt),nB=Buffer.from(newSalt);let cnt=0,p=0
  while(true){const idx=buf.indexOf(oB,p);if(idx===-1)break;nB.copy(buf,idx);cnt++;p=idx+1}
  if(cnt>0){writeFileSync(binPath,buf);console.log(c(E.g,`  ✓ SALT: ${oldSalt} → ${newSalt} (${cnt}x)`))}
  // Re-sign
  if(process.platform==='darwin'){try{execSync(`codesign --force --sign - "${binPath}"`,{timeout:10000,stdio:'pipe'});console.log(c(E.g,`  ✓ ${L==='zh'?'重签名':'Re-signed'}`))}catch{console.log(c(E.r,`  ✗ codesign --force --sign - "${binPath}"`))}}
}

// ── Config writers ───────────────────────────────────────
function writeConfig(uid, soul=null){
  const cfg=readCfg()||{};if(existsSync(CONFIG_PATH))copyFileSync(CONFIG_PATH,CONFIG_PATH+`.bak.${Date.now()}`)
  if(cfg.oauthAccount?.accountUuid){const old=cfg.oauthAccount.accountUuid;delete cfg.oauthAccount.accountUuid;console.log(c(E.c,`  ${t('a_oauth')}`));console.log(c(E.d,`  Old UUID: ${old}`))}
  cfg.userID=uid
  if(soul&&(soul.name||soul.personality)){cfg.companion={name:soul.name||'',personality:soul.personality||'',hatchedAt:Date.now()};console.log(c(E.m,`  ${t('diy_set',soul.name||'?')}`))}
  else{delete cfg.companion;console.log(c(E.d,`  ${t('diy_auto')}`))}
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

  if(mode==='npm'&&cli){npmPatchAll(cli);writeConfig(best.uid,soul)}
  else if(mode==='native'&&bin&&newSalt&&nSalt){nativePatchAll(bin,nSalt.salt,newSalt);writeConfig(best.uid,soul)}
  else{if(mode==='native')console.log(c(E.y,`  ${t('n_skip')}`));writeConfig(best.uid,soul)}

  console.log(c(E.g+E.b,`\n  ${t('si_done')}\n`))
}

// ── Interactive: Check ───────────────────────────────────
function interactiveCheck(){
  const cfg=readCfg();if(!cfg){console.log(c(E.y,`\n  ${t('chk_none')}\n`));return}
  const oa=cfg.oauthAccount?.accountUuid,uid=cfg.userID
  if(oa){console.log(c(E.b,`\n  ${t('chk_oauth')}`));console.log(fmt(roll(oa),oa));console.log(c(E.y,`  ${t('chk_oauth_w')}\n`));if(uid){console.log(c(E.b,`  ${t('chk_after')}`));console.log(fmt(roll(uid),uid))}}
  else if(uid){console.log(c(E.b,`\n  ${t('chk_cur')}`));console.log(fmt(roll(uid),uid))}
  else console.log(c(E.r,`\n  ${t('chk_no_id')}\n`))
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

// ── Interactive: DIY soul ────────────────────────────────
async function interactiveDiy(){
  const cfg=readCfg(),uid=cfg?.oauthAccount?.accountUuid?null:cfg?.userID
  if(!uid){console.log(c(E.y,`\n  ${t('diy_none')}\n`));return}
  console.log(c(E.b,`\n  ${t('diy_cur')}`));console.log(fmt(roll(uid),null,false))
  if(cfg?.companion?.name)console.log(c(E.d,`  Name: ${cfg.companion.name}`))
  const nm=await ask(`  ${c(E.m,'✏️')} ${t('diy_name')} `),ps=await ask(`  ${c(E.m,'✏️')} ${t('diy_pers')} `)
  if(!nm&&!ps){console.log(c(E.d,`\n  ${t('diy_auto')}\n`));return}
  if(writeSoul(nm||undefined,ps||undefined)){console.log(c(E.g+E.b,`\n  ${t('diy_done')}`));console.log(c(E.y,`  ${t('a_restart')}`))}
}

// ── Interactive mode ─────────────────────────────────────
async function interactiveMode(){
  banner()
  while(true){
    const items=[t('menu_search'),t('menu_check'),t('menu_diy'),t('menu_gallery'),t('menu_test'),t('menu_lang'),t('menu_exit')]
    const ch=await sel(t('menu_title'),items)
    switch(ch){
      case 0:do{await interactiveSearch()}while(await yn(t('si_again'),true));break
      case 1:interactiveCheck();await ask(`\n  ${c(E.d,t('press'))} `);break
      case 2:await interactiveDiy();await ask(`\n  ${c(E.d,t('press'))} `);break
      case 3:interactiveGallery();await ask(`  ${c(E.d,t('press'))} `);break
      case 4:interactiveSelftest();await ask(`  ${c(E.d,t('press'))} `);break
      case 5:L=await pickLang();banner();break
      case 6:default:console.log('');return
    }
  }
}

// ── CLI mode ─────────────────────────────────────────────
function parseArgs(argv){const args={cmd:null,f:{},o:{}};const cmds=['search','check','apply','gallery','selftest','help','lang'];let i=0;for(;i<argv.length;i++){const a=argv[i];if(a==='--lang'||a==='--hash'){i++;continue}if(!a.startsWith('-')&&cmds.includes(a)){args.cmd=a;i++;break}}for(;i<argv.length;i++){const a=argv[i],n=argv[i+1];switch(a){case'--species':case'-s':args.f.species=n;i++;break;case'--rarity':case'-r':args.f.rarity=n;i++;break;case'--eye':case'-e':args.f.eye=n;i++;break;case'--hat':args.f.hat=n;i++;break;case'--shiny':args.f.shiny=true;break;case'--limit':case'-l':args.o.limit=parseInt(n);i++;break;case'--json':args.o.json=true;break;case'--lang':case'--hash':i++;break;default:if(!a.startsWith('-')&&(args.cmd==='apply'||args.cmd==='check'))args.o.uid=a}}return args}

function cliSearch(cr,opts){banner();if(!Object.keys(cr).length){console.log(c(E.r,'  Need at least one filter.\n'));return}const p=criteriaLabel(cr);console.log(c(E.b,`  ${t('s_target')} ${p}\n`));const res=search(cr,opts.limit||5_000_000);if(!res.length){console.log(c(E.r,`\n  ${t('s_none')}\n`));return}const best=res[res.length-1];if(opts.json){console.log(JSON.stringify(res.map(r=>({userId:r.uid,buddy:r.buddy,attempts:r.attempts})),null,2));return}console.log(c(E.g+E.b,`\n  ════════════════════════════════════\n  ${t('s_best')}\n  ════════════════════════════════════`));console.log(fmt(best.buddy,best.uid));console.log(c(E.c,`  node buddy-reroll.mjs apply ${best.uid}\n`))}

// ── Main ─────────────────────────────────────────────────
async function main(){
  let lang=loadLang();const args=parseArgs(process.argv.slice(2));const hasCmd=args.cmd||Object.keys(args.f).length>0
  if(lang===null)lang=await pickLang();L=lang;HASH_MODE=detectHash()
  if(!hasCmd){await interactiveMode();return}
  switch(args.cmd){
    case'search':cliSearch(args.f,args.o);break
    case'check':banner();if(args.o.uid){console.log(c(E.b,`  ${t('chk_cur')}`));console.log(fmt(roll(args.o.uid),args.o.uid))}else interactiveCheck();break
    case'apply':banner();if(!args.o.uid){console.log(c(E.r,'  Usage: apply <userID>\n'));break};chkVer()!=='outdated'&&writeConfig(args.o.uid);break
    case'gallery':banner();interactiveGallery();break
    case'selftest':banner();interactiveSelftest();break
    case'lang':await pickLang();break
    default:if(Object.keys(args.f).length>0)cliSearch(args.f,args.o);else{banner();console.log(c(E.d,'  node buddy-reroll.mjs              → Interactive mode'));console.log(c(E.d,'  node buddy-reroll.mjs search ...   → CLI mode\n'));console.log(c(E.d,'  --species/-s  --rarity/-r  --eye/-e  --hat  --shiny  --limit/-l  --json  --lang <en|zh>  --hash <wyhash|fnv1a>\n'))}
  }
}
main()
