# cc-buddy v3.2.0 — 让第三方 API 的宠物开口说话

## 问题

Claude Code 的 `/buddy` 宠物有个隐藏功能：它会在你对话时冒出气泡说话，对你写的代码、遇到的错误做出可爱的反应。

但这个功能**只对官方 API 用户有效**。如果你用的是中转站、Bedrock、Vertex 或者 API Key 用户（没有 OAuth 登录），宠物永远是哑巴。

cc-buddy v3.2.0 解决了这个问题。

## 逆向分析

### buddyReactAPI 函数

通过 acorn AST 解析 Claude Code 的 minified cli.js（13MB），我们定位到了控制宠物说话的核心函数 `buddyReactAPI`。反混淆后的结构：

```js
async function buddyReactAPI(buddy, transcript, reason, recentBubbles, addressed, signal) {
  // 三道死锁
  if (getApiType() !== "firstParty") return null;        // 锁1: 只允许官方 API
  if (isEssentialTraffic()) return null;                  // 锁2: 非必要流量禁止
  let orgId = getSettings().oauthAccount?.organizationUuid;
  if (!orgId) return null;                                // 锁3: 没有 OAuth 组织ID

  // 调用 Anthropic 专属端点
  let url = `${BASE_API_URL}/api/organizations/${orgId}/claude_code/buddy_react`;
  return (await axios.post(url, {
    name: buddy.name, personality: buddy.personality,
    species: buddy.species, transcript: transcript, ...
  })).data.reaction?.trim() || null;
}
```

**三道死锁分析：**

| 锁 | 条件 | 第三方用户 | 效果 |
|----|------|-----------|------|
| `getApiType() !== "firstParty"` | 检查 `CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY` | Bedrock/Vertex 用户直接被挡 | return null |
| `isEssentialTraffic()` | 检查 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 很多中转站用户会设这个 | return null |
| `!organizationUuid` | 需要 OAuth 登录 | API Key 用户没有 OAuth | return null |

第三方 API 用户**全部命中**至少一道锁，宠物永远不会说话。

### 调用链

```
用户发消息 → 模型回复 → tcK() 触发器
  ├─ 获取宠物对象 (getCompanion)
  ├─ 检查是否静音
  ├─ 30秒冷却检查
  ├─ 构建对话摘要
  └─ 调用 buddyReactAPI() → 返回 "喵~ 好代码!" → 渲染气泡
```

关键发现：`buddy_react` 是 Anthropic 的专属端点，第三方 API 根本没有这个路由。但第三方 API 本身就是一个 LLM——我们可以用 `/v1/messages` 代替。

## 解决方案

### 核心思路

不走 Anthropic 专属的 `buddy_react` 端点，改走用户自己的 `/v1/messages` API。用一个极小的 prompt 让 LLM 生成宠物反应：

```
System: You are Capybro, a capybara companion. cute. React in 1-5 words.
User: [Something went wrong.] user: help me fix this bug...
→ "噢不，有bug！"
```

成本：~150 input tokens + ~10 output tokens，haiku 级模型约 $0.00003/次。

### AST 补丁策略

全部操作通过 acorn AST 完成，不用正则，跨版本兼容：

**1. 动态提取混淆函数名**

minified 代码里函数名每版都变（2.1.92 的 `p7` 在 2.1.96 变成了 `m7`）。我们从 buddyReactAPI 的源码中用正则动态提取：

```js
const apiTypeFn  = (source.match(/(\w+)\(\)\s*!==\s*"firstParty"/) || [])[1];  // → Jq / cq
const configFn   = (source.match(/(\w+)\(\)\.BASE_API_URL/) || [])[1];         // → p7 / m7
const settingsFn = (source.match(/(\w+)\(\)\.oauthAccount/) || [])[1];         // → w8
const axiosVar   = (source.match(/await\s+(\w+)\.post\(/) || [])[1];           // → w1 / A1
```

这样不管 CLI 版本怎么变，补丁都能自动适配。

**2. 替换守卫为代理**

不是删除守卫，而是**替换**：

```
原始: if (getApiType() !== "firstParty") return null;
替换: if (getApiType() !== "firstParty") {
        // → 走 /v1/messages 代理
      }

原始: if (!orgId) return null;
替换: if (!orgId) {
        // → 走 /v1/messages 代理（API Key 用户）
      }
```

firstParty 用户完全不受影响，走原始 buddy_react 端点。

**3. 代理代码（注入到 cli.js）**

```js
// 读取 API 密钥（兼容两种环境变量）
var key = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;

// 读取 API 地址（优先用户配置的中转站）
var url = (process.env.ANTHROPIC_BASE_URL || config().BASE_API_URL) + "/v1/messages";

// 使用与主对话相同的模型
var model = process.env.ANTHROPIC_MODEL || settings().buddyReactModel || "claude-haiku-4-5-20251001";

// 构建 prompt
var sys = "You are " + buddy.name + ", a " + buddy.species + " companion. React in 1-5 words.";

// 调用 API（复用 cli.js 内置的 axios）
var resp = await axios.post(url, {
  model, max_tokens: 128, system: sys,
  messages: [{ role: "user", content: context }]
}, { headers: { "x-api-key": key }, timeout: 15000 });

// 兼容 thinking 模型（content 可能是 [{type:"thinking",...}, {type:"text",...}]）
var textBlock = resp.data?.content?.find(c => c.type === "text");
return textBlock?.text?.trim() || null;
```

## 踩坑记录

实现过程中遇到了 7 个坑，每个都是实测发现的：

### 1. ESM 模块中 require 不可用

cli.js 是 ESM 模块（`import` 语法），注入的 `require("fs")` 直接 `ReferenceError`。但因为在 `try-catch` 里，**静默失败**——所有日志都消失了，调试了很久才发现。

**解决**：生产代码不使用 `require("fs")`，调试时找到 cli.js 中已有的 ESM import 别名替代。

### 2. ANTHROPIC_BASE_URL 没有透传

`config().BASE_API_URL` 返回的是 Anthropic 官方地址，不是用户设的 `ANTHROPIC_BASE_URL`。

**解决**：直接读 `process.env.ANTHROPIC_BASE_URL`，优先级高于 config。

### 3. companion.name 被 bones 覆盖

`getCompanion()` 返回 `{...companion, ...bones}`。`bones` 来自 hash 计算，在某些版本中包含 `name: undefined`，覆盖了配置中的名字。导致下游 `lgY(messages, undefined.replace(...))` 直接崩溃。

**解决**：返回时显式保留 `name` 和 `personality`：
```js
return { ...companion, ...bones, name: companion.name, personality: companion.personality }
```

### 4. thinking 模型返回空 text

`gpt-5.2-codex` 等推理模型返回的 content 格式是：
```json
{ "content": [{ "type": "thinking", "thinking": "..." }, { "type": "text", "text": "反应" }] }
```

直接取 `content[0].text` 拿到的是 thinking block（没有 text 字段）。

**解决**：`content.find(c => c.type === "text")` 精确定位 text block。

### 5. API Key 环境变量名不统一

有的用户配 `ANTHROPIC_API_KEY`，有的配 `ANTHROPIC_AUTH_TOKEN`。

**解决**：`process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN`。

### 6. 超时太短

初始设的 5 秒超时，第三方 API 经常来不及返回。

**解决**：改为 15 秒，`max_tokens` 从 30 改为 128（给 thinking 模型留空间）。

### 7. max_tokens 不够

thinking 模型的 reasoning tokens 也算在 max_tokens 里，30 个 token 可能全被 thinking 吃掉，text 部分为空。

**解决**：`max_tokens: 128`。

## 最终效果

第三方 API 用户（中转站、Bedrock、Vertex、纯 API Key）的宠物现在能说话了：

```
╭────────────────────────────────────╮
│ 小水豚眨眨眼哦！               │
╰────────────────────────────────────╯
```

**用户零配置**：cc-buddy 自动检测 API 类型、密钥、模型名，补丁后即生效。

## 技术规格

| 项目 | 值 |
|------|-----|
| 补丁点 | 9 个（unlock + essentialTraffic + thirdPartyProxy + noOrgProxy + getCompanion + renderSprite + spriteFrameCount + renderFace + controlSwitch）|
| 版本兼容 | CC 2.1.89 ~ 2.1.96 验证通过，理论支持所有版本 |
| API 格式 | Anthropic Messages API（`/v1/messages`）|
| 模型 | 跟随主对话模型（`ANTHROPIC_MODEL`）|
| 每次成本 | ~150 input + ~10 output tokens |
| 超时 | 15 秒 |
| 失败处理 | 静默失败，不影响主对话 |

---

GitHub: [cc-buddy](https://github.com/fengshao1227/cc-buddy)
npm: `npm install -g cc-buddy`
