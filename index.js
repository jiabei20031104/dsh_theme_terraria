/**
 * dsh-theme-terraria — 泰拉瑞亚像素主题，两条路一起修。
 *
 * ## 为什么需要两条路
 *
 * 桌面版（Electron）主窗口加载的是 `dsh-app://app/`，它的协议处理器把
 * `/`、`/index.html`、`/assets/*` 直接映射到**应用内置**的官方前端
 * （`resources.dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist`），
 * 只把其余路径转发给宿主。也就是说：宿主服务出来的 dist（本包 `web/`）
 * **在桌面窗口里永远不会被请求** —— 单纯"替换被服务的 dist"只对
 * 「用浏览器打开宿主 URL」有效。
 *
 * 桌面窗口与宿主之间真正的共用扩展点是**索引注入表**
 * `webserver/index-inject`（见 @deepseek-ai/dsh-host-webserver）：
 * 桌面主进程用 `collectIndexInjections()` 取表，经 IPC 交给官方 shell，
 * shell 按行应用（global / script / script-src / script-preload / style / html
 * 全部支持，见 dsh-web-frontend 的 boot 代码）。所以：
 *
 *   - 保留原有的 dist 替换 → 浏览器路径得到完整的独立主题前端（web/）；
 *   - 追加注入式皮肤（skin/）→ 桌面窗口与浏览器都能给官方界面换皮。
 *
 * ## peer 依赖的解析
 *
 * 官方 `@deepseek-ai/dsh-web-app` 是 dsh 安装自带的 peer：pnpm 以
 * `autoInstallPeers: false` 安装，本包又常常是 link 安装（Node 从真实路径
 * 解析），静态 `import` 会 ERR_MODULE_NOT_FOUND。因此 `apply` 在运行时
 * 从宿主锚点（loader 的 baseUrl、dsh 进程入口）解析 peer 的绝对路径。
 *
 * @module dsh-theme-terraria
 */

import { readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Stable Cordis plugin name. */
export const name = 'terraria-theme'

/** 独立主题前端（浏览器路径下替换官方 dist）：web/index.html 及其资源。 */
const THEME_DIST_INDEX = fileURLToPath(new URL('./web/index.html', import.meta.url))

/** 注入式皮肤：样式表（内联注入 <style>）。 */
const SKIN_STYLESHEET = fileURLToPath(new URL('./skin/terraria.css', import.meta.url))

/** 注入式皮肤：行为脚本。它以**内联** `script` 行进入索引；`/terraria/terraria.js`
 * 只是保留下来的只读路由（手工调试 / 旧文档引用），不再参与启动。 */
const SKIN_SCRIPT = 'terraria.js'

/** 行为脚本的本地路径：索引每次渲染时读盘，内联进注入行。 */
const SKIN_SCRIPT_FILE = fileURLToPath(new URL('./skin/terraria.js', import.meta.url))

/**
 * 主题页别名：注入层通过它把桌面窗口切到完整主题页。
 *
 * 桌面壳里 `/` 被应用内置前端占用，只有非内置路径才会转发给宿主，所以主题页需要
 * 一个自己的路由。它服务的就是 `web/index.html`——浏览器路径下被服务的那份文档，
 * 于是「桌面窗口」与「网页端」跑的是同一份 UI。
 */
const THEME_ALIAS = 'theme.html'

/**
 * 登录状态别名：`GET /terraria/account` 返回宿主侧的账号快照 JSON。
 *
 * 页面用它而不是索引注入：注入值在启动时收集一次就固定了，而登录 / 退登随时
 * 会变。这条路由与主题页同源，页面不需要额外的鉴权头，也不经过 `/api`。
 */
const ACCOUNT_ALIAS = 'account'

/** 皮肤资源路由前缀：桌面窗口里会转发给宿主，浏览器里直接命中宿主路由。 */
const ASSET_ROUTE = '/terraria'

/**
 * 皮肤资源的查找根目录。`skin/` 放皮肤自己的文件，`web/` 复用主题前端
 * 已有的字体与壁纸（避免把 600KB 字体复制两份）。
 */
const ASSET_ROOTS = [
  fileURLToPath(new URL('./skin/', import.meta.url)),
  fileURLToPath(new URL('./web/', import.meta.url)),
]

/** 扩展名到 MIME 的映射；未知扩展名按 application/octet-stream 处理。 */
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.html': 'text/html; charset=utf-8',
}

/** 已在本次进程里警告过的皮肤故障，避免每个页面请求都刷日志。 */
const warned = new Set()

/**
 * 给页面的账号状态快照（纯 JSON，`GET /terraria/account` 直接回它）。
 *
 * 路由处理是同步的，所以这里不阻塞：`refreshAccountStatus` 在后台问账号
 * 服务，路由只回最近一次结果。初值 `unknown` 让页面不去猜——
 * 猜错的代价正是「明明用账号登录，却被催着填 API 密钥」。
 */
const accountStatus = {
  value: { status: 'unknown', role: 'unknown' },
  inflight: null,
  timer: null,
  lastAskAt: 0,
}

/** 两次账号查询之间的最小间隔（毫秒），避免页面反复刷新时打爆凭证库。 */
const ACCOUNT_MIN_INTERVAL_MS = 800

/** 询问账号服务的超时（毫秒）：账号侧卡住不能把状态永远留在 unknown。 */
const ACCOUNT_ASK_TIMEOUT_MS = 3000

/**
 * 给账号查询套一层超时。
 * @param {unknown} promise - 账号服务的 promise。
 * @param {number} ms - 超时毫秒。
 * @returns {Promise<unknown>} 原 promise，超时则以 `undefined` 兑现。
 */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms)
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); resolve(undefined) },
    )
  })
}

/**
 * 账号服务实例（未挂载该服务时为 undefined）。
 * @param {object} ctx - 插件上下文。
 * @returns {object|undefined} deepseekAccount 服务。
 */
function accountService(ctx) {
  for (const scope of [ctx, ctx?.root]) {
    try {
      if (scope !== undefined && typeof scope.get === 'function') {
        const service = scope.get('deepseekAccount')
        if (service !== undefined) return service
      }
    } catch {
      /* 这个作用域拿不到就试下一个 */
    }
  }
  return undefined
}

/**
 * 真去问一次账号服务，并更新快照。
 * @param {object} ctx - 插件上下文。
 * @returns {Promise<void>} 查询结束（失败也算结束）。
 */
async function askAccount(ctx) {
  accountStatus.lastAskAt = Date.now()
  try {
    const service = accountService(ctx)
    if (typeof service?.getState !== 'function') return
    const view = await withTimeout(service.getState(), ACCOUNT_ASK_TIMEOUT_MS)
    if (view?.status !== 'credential-stored') {
      accountStatus.value = { status: 'signed-out', role: 'api-key' }
      return
    }
    let profile = null
    try {
      if (typeof service.getProfile === 'function') profile = await withTimeout(service.getProfile(), ACCOUNT_ASK_TIMEOUT_MS)
    } catch {
      /* 资料读不到不影响「已登录」这个结论 */
    }
    accountStatus.value = {
      status: 'signed-in',
      role: 'account',
      name: typeof profile?.name === 'string' && profile.name !== '' ? profile.name : null,
      contact: typeof profile?.contact === 'string' && profile.contact !== '' ? profile.contact : null,
      avatarUrl: typeof profile?.avatarUrl === 'string' && profile.avatarUrl !== '' ? profile.avatarUrl : null,
    }
  } catch {
    /* 读不到就保持上一次的结论，等下一次路由请求或定时刷新再试 */
  }
}

/**
 * 触发一次后台刷新（同一时间只跑一个）。
 *
 * @param {object} ctx - 插件上下文。
 * @param {boolean} [force] - 忽略最小间隔（登录 / 退登事件用）。
 * @returns {Promise<void>} 本轮查询结束。
 */
function refreshAccountStatus(ctx, force = false) {
  if (accountStatus.inflight !== null) return accountStatus.inflight
  const wait = force ? 0 : ACCOUNT_MIN_INTERVAL_MS - (Date.now() - accountStatus.lastAskAt)
  if (wait > 0) return Promise.resolve()
  accountStatus.inflight = askAccount(ctx).finally(() => {
    accountStatus.inflight = null
  })
  return accountStatus.inflight
}

/**
 * 定时刷新账号状态，让登录 / 退登在页面重新载入前也能被看到。
 * @param {object} ctx - 插件上下文。
 */
function watchAccountStatus(ctx) {
  if (accountStatus.timer !== null) return
  accountStatus.timer = setInterval(() => { refreshAccountStatus(ctx) }, 15000)
  accountStatus.timer.unref?.()
  /* 退登是账号侧主动广播的事件，收到就地重算，不等下一次 tick。 */
  for (const event of ['deepseek-account/signed-out', 'deepseek-account/session-expired']) {
    try {
      ctx.on?.(event, () => { refreshAccountStatus(ctx, true) })
    } catch {
      /* 事件总线不可用时只靠定时刷新 */
    }
  }
  refreshAccountStatus(ctx, true)
}

/**
 * 打印一次即可的警告。
 * @param ctx - 插件上下文（取 logger）。
 * @param key - 去重键。
 * @param message - 日志正文。
 */
function warnOnce(ctx, key, message) {
  if (warned.has(key)) return
  warned.add(key)
  try {
    ctx.logger?.warn?.(message)
  } catch {
    console.warn(message)
  }
}

/** 皮肤是否启用：`DSH_TERRARIA_SKIN=0|off|false|no` 可临时关掉。 */
function skinEnabled() {
  const flag = process.env.DSH_TERRARIA_SKIN
  if (flag === undefined || flag === '') return true
  return !['0', 'off', 'false', 'no'].includes(flag.trim().toLowerCase())
}

/** 是否允许注入层把桌面窗口切到完整主题页：`DSH_TERRARIA_STANDALONE=0|off|false|no` 关闭。 */
function standaloneEnabled() {
  const flag = process.env.DSH_TERRARIA_STANDALONE
  if (flag === undefined || flag === '') return true
  return !['0', 'off', 'false', 'no'].includes(flag.trim().toLowerCase())
}

/**
 * 在给定的上下文里查找一个服务（插件上下文按作用域链向上）。
 * @param ctx - 插件上下文。
 * @param service - 服务名。
 * @returns 服务实例；没有时 undefined。
 */
function serviceOf(ctx, service) {
  for (const scope of [ctx, ctx?.root]) {
    try {
      if (scope !== undefined && typeof scope.get === 'function') {
        const value = scope.get(service)
        if (value !== undefined) return value
      }
    } catch {
      /* 这个作用域拿不到就试下一个 */
    }
  }
  return undefined
}

/**
 * 另一个插件是否已经提供 `webRuntime`。
 *
 * 两个"换 dist"主题同时挂载时都会 `provide('webRuntime')`，cordis 对重复 provide
 * 直接抛错；这里先探测，存在就放弃委托（只保留皮肤 + 主题页），避免把宿主启动打崩。
 * @param ctx - 插件上下文。
 * @returns 已存在时为 true。
 */
function hasWebRuntime(ctx) {
  return serviceOf(ctx, 'webRuntime') !== undefined
}

/** 回环地址判定（Host 头栅栏用；不引入依赖）。 */
function isLoopbackHostname(hostname) {
  const name = hostname.trim().toLowerCase()
  return name === 'localhost' || name === '::1' || name === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(name)
}

/**
 * `/terraria/account` 的同源信任栅栏。
 *
 * 优先复用宿主 Connection 服务的 `requestRejection()`：它同时做 Host/Origin 栅栏和
 * 浏览器 cookie 签名校验（与 `/api` 完全一致）。服务不可用时退化为本地等价检查：
 * Host 必须是回环、跨站标记必须缺席、Origin（若有）必须同源，且必须带 cookie——
 * 至少不再让本机任意进程无凭据读到昵称/联系方式。
 *
 * @param ctx - 插件上下文。
 * @param req - node:http 请求。
 * @returns undefined 表示可信；否则为 401/403。
 */
function accountRejection(ctx, req) {
  const connection = serviceOf(ctx, 'connection')
  if (connection !== undefined && typeof connection.requestRejection === 'function') {
    try {
      const rejection = connection.requestRejection(req)
      return rejection === undefined ? undefined : rejection
    } catch {
      /* 落回本地检查 */
    }
  }
  const headers = req.headers ?? {}
  const host = typeof headers.host === 'string' ? headers.host : ''
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return 403
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return 403
  if (headers['sec-fetch-site'] === 'cross-site') return 403
  if (typeof headers.origin === 'string' && headers.origin !== '') {
    try {
      if (new URL(headers.origin).host !== hostUrl.host) return 403
    } catch {
      return 403
    }
  }
  return typeof headers.cookie === 'string' && headers.cookie !== '' ? undefined : 401
}

/**
 * 收集宿主解析锚点，最权威的在前。
 *
 * 每个锚点都是文件系统路径（或 `file:` URL），其目录链能到达 dsh 安装内
 * 的 peer 副本：进程入口落在 dsh 安装树里（最权威），loader 的 profile
 * `baseUrl` 只是回退锚点——profile 的 `node_modules` 里可能被别的插件带进
 * 一份旧副本，所以不能盲信。
 * @param ctx - 携带 loader 注入的 `baseUrl` 的插件上下文。
 * @returns 候选锚点路径，可能为空。
 */
function hostAnchors(ctx) {
  const anchors = []
  const push = (value) => {
    if (typeof value !== 'string' || value === '') return
    if (value.startsWith('file:')) {
      try { anchors.push(fileURLToPath(value)) } catch { /* malformed URL: skip */ }
    } else {
      anchors.push(value)
    }
  }
  // The dsh CLI entry file: inside the dsh installation tree on npm installs.
  push(process.argv[1])
  const loader = typeof ctx.get === 'function' ? ctx.get('loader') : undefined
  push(loader?.config?.baseUrl)
  // Loader writes the profile directory onto the root context; forked plugin
  // contexts read it through the prototype chain.
  push(ctx.baseUrl)
  return anchors
}

/**
 * 从宿主锚点解析官方 web-app 入口文件（去重后按权威度排序）。
 * @param ctx - 携带 loader 注入的 `baseUrl` 的插件上下文。
 * @returns 候选入口文件绝对路径，可能为空。
 */
function webAppEntries(ctx) {
  const entries = []
  const seen = new Set()
  for (const anchor of hostAnchors(ctx)) {
    try {
      // A fictitious filename inside the anchor directory: createRequire only
      // uses its dirname as the Node resolution starting point.
      const entry = createRequire(join(anchor, 'index.js')).resolve('@deepseek-ai/dsh-web-app')
      let identity = entry
      try { identity = realpathSync(entry) } catch { /* keep the unresolved path for dedupe */ }
      if (seen.has(identity)) continue
      seen.add(identity)
      entries.push(entry)
    } catch { /* try the next anchor */ }
  }
  return entries
}

/**
 * 按权威度依次尝试官方 web-app 入口，返回第一个真正可用的模块。
 *
 * 只检查"能 import"不够：peer 的接口是 `internals.resolveDistIndex`，旧副本
 * 可能没有它（或结构漂移）。逐个校验，命中不兼容副本就继续下一个锚点，
 * 避免"解析到旧版本 → 主题静默失效"。
 *
 * @param ctx - 插件上下文。
 * @returns `@deepseek-ai/dsh-web-app` 模块命名空间。
 * @throws 当所有锚点都无法给出可用 peer（dsh 安装不可达）时。
 */
async function loadWebApp(ctx) {
  const entries = webAppEntries(ctx)
  const tried = []
  for (const entry of entries) {
    try {
      const module = await import(pathToFileURL(entry).href)
      if (typeof module.internals?.resolveDistIndex !== 'function') {
        tried.push(`${entry}: does not expose internals.resolveDistIndex`)
        continue
      }
      return module
    } catch (error) {
      tried.push(`${entry}: ${String(error)}`)
    }
  }
  throw new Error(
    'dsh-theme-terraria: cannot load a usable @deepseek-ai/dsh-web-app from the dsh installation '
    + `(it is a peer dependency provided by dsh). Tried: ${tried.join(' | ') || 'no resolvable entry'}. `
    + 'Ensure dsh itself is installed and launching this plugin.',
  )
}

/**
 * 在允许的根目录里定位一个皮肤资源：`skin/` 找不到时继续找 `web/`。
 * @param name - 路由解码后的文件名（不含前导斜杠）。
 * @returns 绝对路径；越界或不存在时返回 undefined。
 */
function resolveAsset(name) {
  if (name === '' || name.includes('\0')) return undefined
  const normalized = name.replaceAll('\\', '/')
  if (normalized.split('/').includes('..')) return undefined
  for (const root of ASSET_ROOTS) {
    const target = resolve(root, normalized)
    // 根目录来自 new URL('./x/', import.meta.url)，一律带尾部分隔符。
    if (!target.startsWith(root)) continue
    try {
      /* 解析真实路径后再校验一次：符号链接不能把读取带出允许的根目录。 */
      const realRoot = realpathSync(root)
      const realTarget = realpathSync(target)
      if (realTarget !== realRoot && !realTarget.startsWith(realRoot + sep)) continue
      if (statSync(realTarget).isFile()) return realTarget
    } catch {
      /* 这个根目录里没有：继续下一个 */
    }
  }
  return undefined
}

/**
 * 判定资源响应的 MIME：先按扩展名，再按魔数兜底。
 *
 * 主题里的 `forest.png` 等文件实际是 WebP（只是沿用了 .png 名字），
 * 用真实类型发送可以让浏览器少一次嗅探。
 * @param file - 资源绝对路径。
 * @param body - 资源内容（用于魔数判断）。
 * @returns content-type 值。
 */
function contentTypeOf(file, body) {
  const head = body.subarray(0, 12)
  if (head.length >= 12 && head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png'
  if (head.length >= 4 && head.toString('latin1', 0, 4) === 'wOF2') return 'font/woff2'
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * 处理一个皮肤资源请求：只服务允许目录里的只读文件。
 * @param req - node:http 请求。
 * @param res - node:http 响应。
 */
function serveAsset(req, res, ctx = undefined) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }
  let name
  try {
    /* v8 ignore next -- node:http always sets url on server requests */
    name = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname.slice(ASSET_ROUTE.length + 1))
  } catch {
    res.writeHead(400)
    res.end()
    return
  }
  if (name === ACCOUNT_ALIAS) {
    /* 账号快照含昵称 / 联系方式 / 头像 URL：只允许与本页同源、且通过宿主
       browser-cookie 校验的请求读它（与 /api 同一套栅栏）。 */
    const rejection = accountRejection(ctx, req)
    if (rejection !== undefined) {
      const denied = Buffer.from(JSON.stringify({ status: 'signed-out', role: 'api-key' }), 'utf8')
      res.writeHead(rejection, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': String(denied.byteLength),
        'x-content-type-options': 'nosniff',
      })
      res.end(req.method === 'HEAD' ? undefined : denied)
      return
    }
    /* 顺手催一次刷新：缓存过期时下一次请求就能拿到新值，本次也先回已有的。 */
    if (ctx !== undefined) refreshAccountStatus(ctx)
    const body = Buffer.from(JSON.stringify(accountStatus.value), 'utf8')
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
      'content-length': String(body.byteLength),
      'x-content-type-options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
    return
  }
  const file = name === THEME_ALIAS ? THEME_DIST_INDEX : resolveAsset(name)
  if (file === undefined) {
    res.writeHead(404)
    res.end()
    return
  }
  let body
  try {
    body = readFileSync(file)
  } catch {
    res.writeHead(404)
    res.end()
    return
  }
  res.writeHead(200, {
    'content-type': contentTypeOf(file, body),
    // no-cache：皮肤文件很小，改完刷新即可看到效果，省掉一整轮重启。
    'cache-control': 'no-cache',
    'content-length': String(body.byteLength),
    'x-content-type-options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

/**
 * 组装本插件要注入索引的注入行。
 *
 * 顺序即应用顺序：先样式（官方界面的兜底皮肤），再全局配置（主题页地址 + 接管开关），
 * 最后是注入层脚本本身。样式表在每次取表时重新读盘（索引渲染很少发生），这样改完
 * CSS 只要刷新页面就能看到效果。
 *
 * 注入层脚本走**内联 `script` 行**而不是 `script-src`：桌面壳对 `script-src` 是
 * `await loadScript(src)`，任何一次 404/网络失败都会 reject `__DSH_BOOT_READY__`，
 * 让整个窗口起不来（官方 UI 也一起没了）。内联行由壳直接 `textContent` 执行，
 * 没有二级加载，即使 `/terraria/terraria.js` 路由不可用也只失去接管能力。
 * `/terraria/terraria.js` 路由保留，供手工调试与旧文档引用。
 *
 * @param ctx - 插件上下文（用于一次性告警）。
 * @returns 注入行数组；样式表/脚本读不到时跳过对应行。
 */
function injectionRows(ctx) {
  const rows = []
  if (skinEnabled()) {
    try {
      rows.push({ kind: 'style', text: readFileSync(SKIN_STYLESHEET, 'utf8') })
    } catch (error) {
      warnOnce(ctx, 'css', `dsh-theme-terraria: cannot read ${SKIN_STYLESHEET}: ${String(error)}`)
    }
  }
  rows.push({
    kind: 'global',
    name: '__TERRARIA_THEME__',
    value: { themeUrl: `${ASSET_ROUTE}/${THEME_ALIAS}`, takeover: standaloneEnabled() },
  })
  /* 登录角色不再走索引注入：注入值在应用启动时就固定了，而账号状态是随时会
     变的。页面改为按需 GET `/terraria/account`（见 ACCOUNT_ALIAS）。 */
  if (!standaloneEnabled()) return rows
  try {
    const script = readFileSync(SKIN_SCRIPT_FILE, 'utf8')
    /* renderRow 对内联 script 只做 `<script>text</script>` 拼接、不做转义，
       文件里若出现 `</script>`/`<!--` 会把页面结构撕开：宁可跳过也不用坏行。 */
    if (/<\/script/iu.test(script) || script.includes('<!--')) {
      warnOnce(ctx, 'script-text', `dsh-theme-terraria: ${SKIN_SCRIPT_FILE} contains a sequence that cannot be inlined safely; the takeover layer is skipped`)
      return rows
    }
    rows.push({
      kind: 'script',
      placement: 'body',
      /* 注释里点名保留的只读路由：手工调试 / 旧文档仍可 fetch 它。 */
      text: `/* dsh-theme-terraria: inline takeover layer (legacy route ${ASSET_ROUTE}/${SKIN_SCRIPT}) */\n${script}`,
    })
  } catch (error) {
    /* 读不到行为脚本只是没有接管，官方界面 + 像素皮肤照常。 */
    warnOnce(ctx, 'script-file', `dsh-theme-terraria: cannot read ${SKIN_SCRIPT_FILE}: ${String(error)}`)
  }
  return rows
}

/**
 * 挂载泰拉瑞亚主题。
 *
 * 1. 注册 `/terraria/*` 路由（`/terraria/theme.html` 即 `web/index.html`，
 *    `/terraria/account` 回登录角色 JSON），并向宿主的
 *    索引注入表推入：兜底皮肤样式行、`__TERRARIA_THEME__` 配置全局、注入层脚本行。
 *    桌面应用窗口靠这一路把窗口接管到主题页，跑的是与网页端同一份 UI；
 * 2. 委托官方 `@deepseek-ai/dsh-web-app` 插件挂载整个 Web 运行时，只替换它的前端
 *    dist 解析器，让浏览器打开宿主 URL 时直接得到完整主题前端。
 *
 * @param ctx - 插件上下文（行注入 `webStartup`；被委托的插件自己注入 `webServer`）。
 * @param config - 与官方 web-runtime 行同形：`printUrl` / `surfaceContext`
 *   两个布尔值与 `trustedHosts` 字符串数组。
 * @returns 被委托插件挂载完成时兑现的 promise。
 */
export async function apply(ctx, config) {
  // 账号状态：后台刷新 + 定时重算，注入行只读快照（同步渲染不能等待）。
  refreshAccountStatus(ctx, true)
  watchAccountStatus(ctx)
  // 注入层：资源路由（含主题页别名）+ 索引注入行。放在委托之前，任何一侧失败都不影响另一侧。
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'prefix', path: ASSET_ROUTE, handler: (req, res) => serveAsset(req, res, webCtx) }),
      'terraria-theme: theme assets',
    )
    webCtx.effect(
      () => webCtx.on('webserver/index-inject', (table) => {
        // 每次渲染都顺手催一次刷新：两次页面载入之间换了登录状态，也能在本次注入里反映。
        refreshAccountStatus(ctx)
        table.push(...injectionRows(webCtx))
      }),
      'terraria-theme: index injection',
    )
  })

  /*
   * 委托官方 Web 运行时是"浏览器路径"的增强项，不是主题可用性的前提：
   *   - 另一个"换 dist"主题已经提供 webRuntime 时，再 provide 一次会让 cordis
   *     直接抛错（重复服务）——此时保留皮肤 + 主题页，让先挂载者继续工作；
   *   - peer 解析 / import / 挂载失败时同样只降级，不让主题条目把宿主启动打崩。
   * 桌面窗口的接管走的是上面的注入层，不依赖这一段。
   */
  if (hasWebRuntime(ctx)) {
    warnOnce(ctx, 'web-runtime-exists', 'dsh-theme-terraria: another plugin already provides webRuntime; skipping the frontend-dist delegation and keeping the injected skin + /terraria/ theme page')
    return
  }
  try {
    const WebApp = await loadWebApp(ctx)
    if (hasWebRuntime(ctx)) {
      warnOnce(ctx, 'web-runtime-race', 'dsh-theme-terraria: webRuntime appeared while loading the official web-app peer; skipping delegation to avoid a duplicate service')
      return
    }
    WebApp.internals.resolveDistIndex = () => THEME_DIST_INDEX
    ctx.plugin(WebApp, config)
  } catch (error) {
    warnOnce(ctx, 'delegate', `dsh-theme-terraria: cannot mount the official Web runtime (${String(error)}); continuing with the injected skin and the /terraria/* theme page only`)
  }
}
