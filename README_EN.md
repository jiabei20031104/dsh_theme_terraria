# dsh_theme_terraria

> Replace the DeepSeek Harness Web UI with an entire Terraria-style pixel world — the Guide codes alongside you.
>
> [中文版](./README.md)

[![Version](https://img.shields.io/badge/version-0.3.0-2ea44f)](CHANGELOG.md)
[![Desktop](https://img.shields.io/badge/DeepSeek%20Harness-Desktop%200.2.0--rc.2-6f42c1)](#2-installation--deployment-guide-with-pitfalls)

![Title Screen](screenshots/title-screen.png)

---

## Table of Contents

1. [Overview & Core Positioning](#1-overview--core-positioning)
2. [Installation & Deployment Guide (with Pitfalls)](#2-installation--deployment-guide-with-pitfalls)
3. [Visual Design System (UI/UX Details)](#3-visual-design-system-uiux-details)
4. [Sound Interaction System (Audio Feedback)](#4-sound-interaction-system-audio-feedback)
5. [Hidden Easter Eggs (Narrative Interaction)](#5-hidden-easter-eggs-narrative-interaction)
6. [Performance & Accessibility Guardrails](#6-performance--accessibility-guardrails)
7. [Project Maintenance (Uninstall, Structure & License)](#7-project-maintenance-uninstall-structure--license)

---

## 1. Overview & Core Positioning

**dsh_theme_terraria** (npm package name `dsh-theme-terraria`) is a Terraria-themed plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh). It replaces the official React frontend with a single self-contained `index.html` (~230 KB, zero external JS dependencies), wrapping the "AI coding agent console" as a pixel adventure:

- **A standard dsh plugin package**: this repository is itself an npm package — the entry `index.js` exports the `apply(ctx)` required by the plugin spec and `cordis.patch.yml` declares the `dsh.bundle` patch layer. Install it into the **desktop profile** for the Desktop app or into the web profile for the browser; the package is not on npm yet, so the default install uses a local absolute path (see section 2) and never touches any file in the dsh installation.
- **Not a mere skin**: the theme talks directly to the dsh host over JSON-RPC (HTTP upstream) + WebSocket (event downstream). Session creation, message sending, streaming output, tool approvals, model switching, and workspace management are all fully functional. Enter a DeepSeek API key and you can chat with the model for real.
- **Four difficulty tiers = four agent presets**: Journey (standard, full-featured coding agent), Softcore (code, Code Mode SDK), Mediumcore (minimal, bare dual-tool agent), Hardcore (cordis, custom preset template). Switching difficulty switches the preset — the plugin composition changes live with it.
- **Single-file delivery**: the entire UI is inlined in one HTML file served directly by the plugin — no runtime framework, no build step.

### Core Mapping

| Official UI concept | Terraria theme mapping |
|---|---|
| Agent Preset | Difficulty tier: Journey / Softcore / Mediumcore / Hardcore |
| Session | Journey / Adventure |
| User message | Adventurer |
| Tool approval request | Approval tablet |
| Todo list | Quest HUD |
| API key status | Life crystal indicator |
| Plugin composition | Equipment that changes with difficulty |

---

## 2. Installation & Deployment Guide (with Pitfalls)

### Requirements

- An installed DeepSeek Harness (the Desktop app, or a working `dsh` CLI)
- Node.js `^22.19 || >=24` and pnpm (`dsh plugin` forwards to pnpm; the Desktop app ships its own runtime, so no separate Node install is needed)
- A DeepSeek API key (required for chatting; all other UI works without one)

### Two Profiles: Desktop vs. Web

| | Desktop app (Electron) | Browser (`dsh web`) |
|---|---|---|
| Profile to install into | **`desktop`** | `web` |
| Directory | `~/.dsh/profiles/desktop` | `~/.dsh/profiles/web` |
| How the theme applies | Host injection rows take the window over to `/terraria/theme.html` | The theme plugin replaces the frontend dist served by the Host |
| Who reads that profile | The Desktop app you launch by double-clicking | The URL printed by `dsh web` |

The Desktop app reads **only the desktop profile**. Installing into the web profile will not make the Desktop window show the theme — this is the most common cause of "the plugin says installed but the window is still official." Conversely, the desktop profile does not affect the browser path.

### Desktop Installation (recommended; no git, no npm publish needed)

> This repository is **not published to npm yet** (`registry.npmjs.org/dsh-theme-terraria` returns 404), and some machines have no git. **Use the app-bundled CLI with the absolute path to this repository.**

0. **Quit the app completely** (tray → Quit) and confirm the process is gone. The profile is not re-read while the Host runs, and injection rows are snapshotted once at startup.

   ```powershell
   Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue
   ```

1. Install (replace `<absolute path to this repo>` with the real path; it **must be absolute** and contain `package.json`):

   ```powershell
   & '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<absolute path to this repo>'
   # author's machine (D:\dsh): ... add 'D:\code\dsh_theme_terraria-main'
   ```

   - `<DSH install dir>` is the DeepSeek Harness installation directory. On the author's machine it is `D:\dsh`, so the real command is `& 'D:\dsh\resources\runtime\cli\bin\dsh.cmd' …`; replace the placeholder if you installed elsewhere. When `dsh` is already on PATH you may use `dsh plugin …` directly.
   - When `where dsh` is empty (no global `dsh` command), use the app-bundled entry above. Do not launch the Host with `dsh --profile desktop` — the Desktop host rejects that; `plugin --profile desktop` is the supported management entry.
   - With git available you can install straight from GitHub: `dsh plugin --profile desktop add github:jiabei20031104/dsh_theme_terraria`; **without git, pnpm fails with `'git' is not recognized as an internal or external command`** (observed), so use the local absolute path instead.
   - The in-app **Plugin Hub → local / Git source install** accepts the same absolute path (the local install also goes through pnpm and needs no git).

2. Check the profile (optional):

   ```powershell
   Get-Content "$env:USERPROFILE\.dsh\profiles\desktop\package.json"
   ```

   `dependencies` should now contain `dsh-theme-terraria` (`link:` or `file:`), and `dsh.profile.bundles` should end with `dsh-theme-terraria`; every other plugin stays unchanged.

3. **Launch the app normally** (double-click). The window should navigate to:

   ```text
   dsh-app://app/terraria/theme.html?host=http%3A%2F%2F127.0.0.1%3A19387
   ```

   **Quit the app completely and relaunch after installing or changing configuration**: injection rows are a one-shot snapshot at Host startup; reloading the window or the plugin will not pick up new rows.

4. Uninstall (back to the official UI):

   ```powershell
   & '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-theme-terraria
   # author's machine: & 'D:\dsh\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-theme-terraria
   ```

   **Quit and relaunch the app afterwards** — the window may still be sitting on the now-404 theme route.

![Electron desktop-shell simulation: themed title screen (real Electron + official frontend + sandbox Host)](screenshots/desktop-title-screen.png)

#### How the Desktop path works (why the desktop profile and a relaunch are mandatory)

The Desktop window has two hard constraints: it loads `dsh-app://app/`, and that protocol maps `/`, `/index.html` and `/assets/*` to the frontend **bundled inside the application** — the dist served by the Host is never requested there. Only other paths are forwarded to the Host together with its cookie. The theme therefore takes two routes:

1. **Full takeover (default)**: the Host index injection rows hand the window `__TERRARIA_THEME__` (theme-page URL + takeover flag) and an **inline** injection script. The script preflights `/terraria/theme.html` (which serves `web/index.html`) and only then calls `location.replace` — the Desktop window runs the **very same UI** as the web version (title screen, Guide dialog, character creation, quest HUD, 8-bit sounds, wallpapers, desk pets). `/api/*` keeps flowing through the Desktop shell with the Host cookie, and the WebSocket connects to the Host origin (from `__DSH_TRANSPORT__.streamBaseUrl`, passed to the theme page as `?host=` by the injection script).
2. **Fallback skin**: when the theme page is unavailable (missing route / failed preflight / wrong content) or the takeover is switched off, the official UI gets an injected pixel skin (`skin/terraria.css` overriding the official `--dsw-*` tokens and generic element styles) — no white screen, no reload loop.

Desktop-only adaptations: native caption colours (the preload reads the page's `--dsw-*` tokens); the top bar reserves the measured width of the window-control buttons; `-webkit-app-region: drag` on the top bar and title screen with every interactive element marked `no-drag`; modal overlays (`#modal-root`) are `no-drag` too, and while a modal is open the page sets `data-terraria-modal` to drop the drag regions underneath it — otherwise the full-window drag area swallows every click on the overlay.

**Injection rows are a one-shot snapshot taken when the Host starts**: after installing/upgrading/changing configuration you must quit the app completely and relaunch it.

### Browser Path (web profile)

The browser path needs a real `dsh` CLI (the app-bundled `dsh.cmd` is the Desktop host management entry, not `dsh web`):

```sh
# Recommended when git is available: install straight from GitHub (not on npm yet)
dsh plugin --profile web add github:jiabei20031104/dsh_theme_terraria
# Without git, use the local absolute path instead:
# dsh plugin --profile web add '<absolute path to this repo>'

dsh web
# Default URL: http://127.0.0.1:3080/
```

- The browser path and the Desktop window are independent: the Desktop app does not read the web profile, and `dsh web` does not read the desktop profile.
- `dsh plugin add` writes `dsh-theme-terraria` into the profile's dependencies and `dsh.profile.bundles` layer list. The plugin's `cordis.patch.yml` disables the official `web-runtime` row and inserts an identical `terraria-theme` row; `index.js` then points the official `@deepseek-ai/dsh-web-app` frontend resolver at this package's `web/index.html`. Everything else the official Web runtime owns (dist serving, the `/api` trust fence, `DSH_WEB_URL`, the URL line) keeps working unchanged.
- When running dsh from source inside the deepseek-harness repository, prefix the commands with `pnpm` (e.g. `pnpm dsh plugin ...`, `pnpm dsh web`).

### Switches, Escape Hatches and Coexistence

| Control | Effect | How |
|---|---|---|
| `DSH_TERRARIA_STANDALONE=0` (or `off/false/no`) | No takeover; keep the "official UI + pixel skin" | Set as a user env var before launching the app, or launch from a terminal with it |
| `DSH_TERRARIA_SKIN=0` (or `off/false/no`) | Drop the injected pixel skin as well | Same |
| Theme title-screen "切回官方界面" / <kbd>Alt</kbd>+<kbd>O</kbd> (**Desktop window only**) | Desktop window: writes `localStorage['terraria.takeover']='0'` and returns to the official UI; **the browser path has no official UI to return to** — the button only reloads the same theme page | Click in the Desktop window or press the shortcut; for the browser, uninstall/disable the plugin instead (see section 7) |
| `localStorage.removeItem('terraria.takeover')` | Re-enable the takeover (meaningful for the Desktop window only) | Run in the <kbd>F12</kbd> console, then `location.reload()` |

- `DSH_TERRARIA_*` are read from the **Host process environment**: set them **before** launching the app (user env vars, or start the app from a terminal). Changing them while the app runs has no effect.
- **Restoring the official UI in the browser**: `/` in the browser *is* the theme frontend, so there is no "official UI" to switch back to; uninstall the plugin (`dsh plugin --profile web remove dsh-theme-terraria`) or disable the bundle, then restart `dsh web`.
- **The takeover hides client-plugin UI**: the theme page is self-contained and does not load `/plugins/*/client.js`, so the **UI** of `dsh-dream-skin`, `dsh-whale-widget` and `agent-teams` is invisible while the takeover is active (their host-side functionality keeps running). Set `DSH_TERRARIA_STANDALONE=0` when you need those UIs — you get the official UI plus the pixel skin.
- **Only one dist-replacing theme per profile**: two such themes both `provide('webRuntime')`. This version detects an existing `webRuntime`, skips the delegation and logs a warning (injected skin and theme page stay available), so the Host no longer fails to boot on a duplicate service — but only one theme's UI will be presented.
- **Trust cost**: installing the theme means allowing an inline injection script (~4 KB) and the theme page (~230 KB) to run inside your operator-privileged Desktop window. They never read or print API keys; the account snapshot only comes from `/terraria/account`, which is fenced by same-origin + browser cookie checks.
- **Opening the theme page by hand without `?host`**: the page asks the preload bridge `window.dshDesktopBoot.ready()` for the real host `streamBaseUrl`; if that fails it shows a visible notice instead of silently connecting to `dsh-app://app`, and it never enters a reload loop.

### Configure the API Key and Start Chatting

1. For the browser path open http://127.0.0.1:3080/ (in the Desktop app the theme page opens automatically), then click "新的会话" (New Session);
2. The first visit automatically opens Settings — type your `sk-...` key into the "DeepSeek API 密钥" field and click "保存密钥" (Save Key);
3. The key is stored on the host machine via `credentials.set` (`.dsh-home/.credentials.yaml`); the page itself never persists the plaintext key;
4. Once the HUD shows "API 密钥：已配置" (configured), type any instruction into the dialog to start a real conversation.

![Main Chat Interface](screenshots/chat-main.png)

### Pitfall Guide (All Field-Tested)

| Pitfall | Symptom | Fix |
|---|---|---|
| Plugin installed but the Desktop window stays official | Hub/CLI says "running" and nothing changes | It was installed into the **web profile**; the Desktop app reads only the **desktop profile**. Reinstall with `plugin --profile desktop add` and **quit + relaunch the app** (injection rows are a startup snapshot) |
| `dsh` is not recognized | `where dsh` is empty and the command is missing | Use the app-bundled entry: `& '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop …` (the author's machine: `D:\dsh`) |
| Hub/CLI install fails with `'git' is not recognized` | Installing from `github:` / `git+https:` fails | No git on this machine: install from a **local absolute path** instead |
| Installing by package name returns 404 | `registry.npmjs.org/dsh-theme-terraria` does not exist | Not published to npm yet: use the local absolute path, not the package name |
| Theme page loads but never connects | Status keeps reconnecting | Use "切回官方界面" on the theme title screen, or <kbd>Alt</kbd>+<kbd>O</kbd>, to get a working UI back, then send the <kbd>F12</kbd> console error; when opening the theme page by hand, make sure the URL carries `?host=` |
| Whale widget / AgentTeams / dream-skin UI disappears after takeover | Their client-side UI is gone | Expected: the theme page does not load `/plugins/*/client.js`. Set `DSH_TERRARIA_STANDALONE=0` before launching the app to get the official UI plus the pixel skin |
| Two dist-replacing themes installed at once | Only one theme applies; a webRuntime warning appears in the log | Keep one per profile. This version detects an existing `webRuntime`, skips the delegation and does not crash the Host, but only the first theme's UI is presented |
| Browser caches old UI | Page still shows the old version after a plugin update | Hard refresh with `Ctrl+F5`, or append `?v=2` to the URL |
| `dsh plugin add` fails | `pnpm not found on PATH` or a pnpm error | `dsh plugin` forwards to pnpm: install pnpm and reopen the terminal; for git installs, follow the printed hint and add the key under `allowBuilds` in the profile's `pnpm-workspace.yaml`, then re-run |
| Key save fails | Toast reports "保存失败" | Make sure `dsh web` was started from your own terminal; sandboxed environments may block host-directory writes |
| Image wallpaper won't store | "图片过大，保存失败" | localStorage caps around 5 MB; the theme already compresses non-GIF images to 1920px JPEG. If it still fails, use a smaller image or a video wallpaper |
| Folder picker returns no full path | Only the folder name appears after selecting | Browser security restriction (uniform across the web). The theme smart-fills registered same-name directories via a "使用 E:\full\path" button; otherwise it prompts for manual completion |
| WebSocket drops | Top bar shows "连接已断开，重连中…" | Normal auto-reconnect (2s interval); if the host process exited, restart `dsh web` |

---

## 3. Visual Design System (UI/UX Details)

### Design Language: Pixel Triad + Slate Texture

The visual foundation is three layers:

1. **Background layer**: default forest wallpaper (`forest.png`) with the title-screen tree (`Tree.png`); `image-rendering: pixelated` keeps pixels crisp. User-replaceable (see wallpaper system).
2. **Panel layer**: every card/modal uses the "Terraria slate" style — nested deep-blue double layers (outer `#181e58`, inner `#2e3692`), 3 px dark outlines (`#0e1340`), 8 px corner radius, bold serif (`SimSun/Songti SC`).
3. **Accent layer**: gold (`--gold`) for titles and highlights, torch orange (`--torch`) for section headers, parchment white (`--parchment`) for body text, with a dark drop shadow `text-shadow: 1px 1px 0 var(--black)`.

### Typography

- Primary: **Fusion Pixel 12px** (an open-source CJK pixel font), a single ~600 KB `woff2` bundled in `web/` — crisp CJK rendering;
- Modal titles: bold SimSun, recreating the game's dot-matrix feel;
- Monospace: the terminal panel renders tool output in monospace.

### Title Screen

A faithful recreation of the game's main menu: logo, five pixel menu items (New Session / Continue / Plugin Manager / Settings / Desk Pet), and the big tree silhouette over the forest background.

### Main Chat Interface (Three-Column Layout)

- **Top bar**: back button, session name (the current **workspace name**, e.g. `dsh_theme_terraria`; sessions without a workspace fall back to the mode name), connection lamp ("已连接到向导世界" — connected to the Guide's world), Chat/Terminal tab switch, sound toggle, music toggle, plugin manager, settings entry. The model name lives in the HUD's "当前模型" only — the top bar no longer repeats it as a badge;
- **Chat column**: message stream (Adventurer = user, Guide = assistant) plus the bottom NPC dialog box — Guide portrait (`xiangdao.png`) and heart emblem (`heart.png`) on the left, input box and seven pixel buttons on the right: **Attach, Mode Select, Workspace, Permissions, Model Select, Stop, Send**. **A turn leaves one "process" line plus one result reply**: reasoning text, tool calls and intermediate step prose ("Now the endpoint mapping:"-style transition lines) all fold into one collapsible process block — expanded while the turn runs so progress stays visible, collapsed at turn end into a summary such as "过程 · 已思考 1.1k 字 · 7 次工具 · 3 段中间说明 · 24s". The stream therefore holds only your messages, one process line per turn, and the result bubble. **Steps without prose leave no bubble at all** (they used to leave bricks containing nothing but a token line or "已思考 · N 字");
- **Reasoning lives inside the process block**: expand the summary line to read the raw thinking (tagged "已思考 · N 字") and every tool call; tool activity is mirrored to the Terminal tab as before. While running, a single "••• 正在思考…" line is all that shows;
- **No `tokens:` line under replies**: the old per-reply usage line is gone, so **no token copy appears in the message stream** — token stats live in the HUD's rate panel only;
- **HUD sidebar**: current model (name + description), API key status lamp (the login role is reported here too — status only, with **no sign-out entry**; that button lives in the settings modal's login-role row), quest list (live todo projection), Guide tips with a **token output rate** readout (live tok/s + this turn's tokens + session average + a mini bar chart) — the one and only place token usage is shown (every step's `outputTokens` accumulates here).

### Chat History: Paging, Anchor Navigation, Markdown

- **History paging (your own prompts survive "Continue")**: the `session/follow` snapshot is only a window (measured ~300 records, sometimes just the latest prompt), so `loadHistory()` keeps paging backwards with `session/page` (`throughSeq` inclusive / `beforeSeq` exclusive) — four pages automatically, and a "⬆ 加载更早的历史" button (up to 12 more pages / 6000 records) at the top of the stream and in the navigation panel. Records are re-rendered in chronological order and the scroll position is preserved by height compensation;
- **Anchor navigation**: "≡ 导航" in the top-right corner of the chat opens a panel listing the **results** as anchors (Adventurer = each of your prompts, Guide = replies that actually have text, with a preview); clicking one scrolls to it and flashes a gold border. It has a text filter, jump-to-oldest/newest buttons, and auto-highlights the message you are currently reading while scrolling;
- **Results only**: intermediate steps that carried just a thinking block or a tokens line (no reply text) are **not** listed in the history panel, so the list never fills up with un-jumpable noise;
- **Markdown rendering**: assistant replies render as Markdown (headings, bold/italic, inline code, fenced code blocks with a copy button, quotes, ordered/unordered/task lists, tables, rules, links, images) and keep rendering live while streaming. Everything is HTML-escaped *before* parsing, so model output can never inject markup; user messages stay plain `pre-wrap` text.

![Mode Select Modal](screenshots/mode-select.png)

### Mode Select Modal: 1:1 Character-Creation Recreation

Clicking "模式选择" opens a **character-creation**-style modal — the most faithful recreation in the whole theme:

- Top bar: walking character gif (`Style_1_male_walking.gif`) + "模式选择" title;
- Left column: four difficulty buttons in their in-game colors — Journey (purple `#8a4b7c`), Softcore (teal `#388e8d`), Mediumcore (brown `#855526`), Hardcore (red `#8a3a3b`);
- Selected state: bright cyan frame (`#6be1d8`) with an inner glow stroke;
- Right panel: live description of the selected difficulty's real preset;
- Bottom "返回 / 选择" (Back / Select) buttons with a `scale(0.96)` press feedback;
- "选择" actually calls `agentPreset.select` to switch the backend preset; the session name updates accordingly.

### Settings Modal & Wallpaper System

The settings modal has four sections:

- **Login role** (row 0, `#set-role` / `#set-role-detail`): which identity is running — "DeepSeek 账号 · 已登录 · <name or contact>" or "API 密钥 · 未登录 DeepSeek 账号，用密钥直连", plus a line noting that account credentials are kept by the host and used automatically (no API key needed). The snapshot comes from the same-origin `GET /terraria/account`. **While signed in with an account this row also carries a "退出登录" (sign out) button** (`#set-signout`, a danger-styled small button): it first asks for confirmation (querying `account/hasRunningAccountTasks` so the copy can warn that running tasks will be interrupted), then calls the host's `account/signOut` with the client identity `{version, locale, timezoneOffsetSeconds}` — the same endpoint the official frontend uses. The host deletes the local account grant and revokes it through Platform in the background; **API keys are untouched**. Afterwards the page polls `/terraria/account` until the role is no longer an account and refreshes the role row and the HUD lamp. The button is hidden in API-key mode (there is no login to end), and it lives **only in the settings modal — the chat page (HUD / top bar) never shows it**;
- **API key**: an orange "DeepSeek API 密钥" heading with the config status on the right; the password input sits on the left (start position and height unchanged, width adapts), with the gold "保存密钥" (Save Key) button and the tool-approval mode switch (auto-allow / manual confirm) to its right on the same row, all bottom-aligned; stored on the host via `credentials.set`; on narrow screens the buttons wrap below instead of covering the input;
- **Wallpaper**: dashed drop zone "拖拽图片/视频到此处，或点击选择" — supports both drag-and-drop and click upload; images are auto-compressed to 1920px JPEG for localStorage, GIFs keep their animation as-is, and **videos (MP4/WebM, ≤512 MB) are stored in IndexedDB as fullscreen live wallpapers** (muted, looping, behind everything); "恢复默认" restores the forest in one click;
- **Background music**: dashed drop zone "拖拽音频到此处，或点击选择" — drag or click to upload any audio file (MP3/WAV/OGG etc., ≤64 MB), stored in IndexedDB and looped as BGM; comes with a play/pause button, a volume slider, and "移除音乐" (remove); the top-bar "音乐:开/关" (music on/off) toggles it anytime;
- **Interface**: reload the UI (the desktop shell has no refresh shortcut) and open the plugin manager.

![Settings Modal](screenshots/settings.png)

### Plugin Manager (search / inspect / install / enable / remove)

The top bar's "插件管理" (also on the title screen) opens the plugin dialog, talking to the host's `pluginManager` service:

- **Search**: asks the public npm registry directly (`registry.npmjs.org/-/v1/search`, CORS-enabled) and ranks dsh-related hits first; an empty query searches `keywords:dsh-plugin`. When search is unavailable it tells you to paste a package name instead;
- **Local / Git source install** (for everything search cannot find): a spec input with "选择文件夹…" (the desktop shell's native picker returns the host's absolute path), "选择 .tgz…" (`__DSH_HOST_PATHS__.pathFor`), and drag-and-drop of a folder onto the row. Every host spec form is accepted — an absolute path (`D:\code\my-plugin`, must contain package.json), a `*.tgz` (local or URL), a git repo (`github:you/repo`, `https://github.com/you/repo`, `git+https://…`, `git@host:path`) and a registry name (optionally with `@version`). **Local paths must be absolute**: `file:///D:/…` and relative paths are refused by the host (measured: `not-a-package: the path does not exist` / `invalid-spec: a local path must be absolute`);
- **Inspect**: `pluginManager/inspect` resolves a spec (package name, npm alias, git URL, local path, tarball) and reports whether it is a bundle, plus version and description; refusals show the `problem` and the raw reason (e.g. `not-found` + registry text, or `already-installed`);
- **Install**: `pluginManager/installBundle` (with a client-minted `requestId` and `enabled: true`); the outcome is reported by `application` (`applied / restart-required / failed`) with error code, diagnostic and the tail of the pnpm output. The log area also collects the host's `plugin-manager/install-log` events;
- **Installed**: `pluginManager/listBundles` lists every bundle (name @ version · title · description) with **enable / disable** (`setBundleEnabled`) and, when removable, **remove** (`removeBundle`); built-in bundles are marked "内置（不可卸载）" with the toggle disabled, and multi-plugin bundles list their plugins;
- **Registry**: shows what `pluginManager/registries` resolved (here `registry.npmjs.org` with `registry.npmmirror.com` as fallback);
- **Current preset inventory**: the old settings-page cordis.yml inventory moved here, with the raw preset file available for comparison.

#### Why plugins that live on GitHub do not show up in the search

The search queries the **npm registry index**, not GitHub:

1. A repo that was never **published to npm** has no registry metadata at all, so it cannot be found (the host's `inspect` answers `not-found`);
2. Packages that are published but have no `dsh` keyword in their name/description rank far down, because search is relevance-ordered rather than a precise filter;
3. Packages that live in a **private registry / internal mirror** are invisible to the public one (this machine resolves `registry.npmjs.org` with `registry.npmmirror.com` as fallback);
4. **Scoped packages** (`@you/pkg`) usually need their exact name.

Installing is unaffected: paste the repository into "本地 / Git 来源安装"
(`https://github.com/you/repo`, `github:you/repo` — `inspect` reports `{status:"accepted",kind:"git",host:"github.com"}`),
use an absolute path for a local checkout, or point at a `*.tgz`; pnpm clones, unpacks and installs the dependencies itself.

![Plugin Manager](screenshots/plugin-manager.png)

### Continue-Session Modal: Workspaces as Parents, Sessions as Children

"继续会话" on the title screen lays the sessions out as a **folder tree** (it aligns `session/list` with `workspace/follow`):

- **Parent node = workspace**: the header row shows the workspace name (e.g. `dsh_theme_terraria`) + full path + session count, and clicking it collapses/expands the node (`▾ / ▸`);
- **Child node = "第 x 个对话"**: children are ordered by most recent activity, so #1 is the newest; each row carries the session title, timestamp, a `运行中` (running) tag and the working directory;
- **Archive**: every session row ends with an "归档" button calling `workspace/archiveSession` (a running session has its activity stopped as well). Archived sessions leave the tree and move into a collapsed **"已归档"** parent at the bottom, where each row offers "取消归档" (`workspace/unarchiveSession`) to put it back;
- Ownership comes from the workspace's `sessionIds`, with a `cwd` match as fallback; sessions covered by neither are grouped by their `cwd` tail, and those without a `cwd` land under "未归入工作空间".

### Workspace Modal

- Lists all registered workspaces (title, full path, session count); **click any row to start a new session in that directory** (the session name then shows that workspace name, e.g. "assets");
- "添加本地文件夹" (Add local folder) supports three methods: **Select Folder…** (system dialog), **drag-and-drop** (auto-parses file:// / Windows paths), or **manual input** of the full path;
- Because browsers only hand out the folder name from the picker, the theme smart-matches registered directories of the same name and offers a one-click "使用 E:\full\path" backfill.

![Workspace Modal](screenshots/workspace.png)

### Desk Pet

Open "人物桌宠" from the title screen to swap the character keeping you company and to command the five desk pets roaming your screen:

- **Portrait upload**: drag or click to pick an image (≤16 MB, any size), shown as an 88×88 square portrait (`object-fit: cover` center-crop); stored in IndexedDB and restored after reloads; photos render smoothly while the default pixel art stays `pixelated` crisp;
- **Name editing**: type a new name (≤12 chars, committed on blur or Enter); it updates the dialog nameplate, chat-bubble signatures, the approval slate ("XX想要使用工具"), the question modal title, the welcome line, and the input placeholder;
- **Personality**: edit the textarea directly, or import from an `.md` / `.markdown` file (drag-and-drop or click, ≤512KB); the import shows a gold progress bar, and the content is processed (BOM stripped, line endings normalized, trimmed, capped at 64K chars) before saving; hover the dialog portrait to preview the first 120 characters;
- **Desk pet toggles (five independent switches)**: each pet gets its own pixel toggle — the **Eye of Cthulhu** (a wandering, rotating floating eye), **King Slime** (a bouncing slime with squash-and-stretch), **Draedon** (a frame-animated flying mechanic), **Devourer of Gods** (a multi-segment worm crawling in follow-the-leader fashion), and **Cryogen** (a spinning ice crystal in flight); each pet lives in its own full-screen transparent iframe (`pointer-events` passes through so nothing is ever blocked), sized to the shared 160px standard (Draedon 133×160 to keep its 5:6 ratio); showing/hiding plays a 0.5s fade transition; each pet's state persists independently in localStorage (`terraria.pet.<id>`) across reloads; the host page and each iframe talk over postMessage (`dsh:pet` pause/resume commands + `dsh:pet-ack` confirmations + a `dsh:pet-ready` handshake, matched by contentWindow), and closing a pet freezes only its own animation loop to save CPU;
- **Reset**: one click clears the custom portrait, name, and personality, returning to the Guide and the default pixel art.

![Desk Pet (title screen + pet parade)](screenshots/desk-pet1.png)

![Desk pet modal inside the Desktop window](screenshots/desk-pet.png)

---

## 4. Sound Interaction System (Audio Feedback)

The theme ships an **8-bit style WebAudio engine** — pure oscillator synthesis (square wave), no audio files, zero network requests:

| Event | Frequency/Duration | Feel |
|---|---|---|
| Assistant reply finished (`assistant/message`) | 660 Hz / 60 ms | A short "ding", like picking up a coin |
| Tool approval request | 440 Hz / 100 ms | Mid-tone alert drawing attention |
| Ask-user question | 520 Hz / 100 ms | Rising inquiring tone |
| Turn failed / send failed | 180 Hz / 100 ms | Low "thud", the hurt sound |

Design principles:

- **Restrained**: one beep per event, never looping; streaming (tokens arriving one by one) stays completely silent;
- **Switchable**: the top-bar "音效:开 / 音效:关" toggle persists in localStorage across reloads;
- **Fail-safe**: the whole playback path is wrapped in `try/catch` — silent environments (autoplay policy blocks, missing audio devices) are ignored without ever throwing.

### Background Music (Custom BGM)

A custom-BGM system independent of the sound-effect engine:

- **Upload**: drag or click in the settings modal to pick an audio file (MP3/WAV/OGG/FLAC/M4A/AAC/OPUS, ≤64 MB); it is stored in IndexedDB (the same database as video wallpapers, bypassing the 5 MB localStorage cap) and restored automatically after reloads;
- **Playback**: looped through an `<audio>` element; the 0–100 volume slider adjusts in real time and persists in localStorage; the top-bar "音乐:开/关" and the in-settings "播放/暂停" stay in sync;
- **Autoplay policy**: browsers require one page interaction before any sound — if the music doesn't resume by itself after a reload, click anywhere on the page and it picks up;
- **Removal**: "移除音乐" clears the BGM from IndexedDB and stops playback, returning to a silent world.

---

## 5. Hidden Easter Eggs (Narrative Interaction)

A consistent **adventure narrative** is woven through the interaction details for observant players to discover:

1. **Opening line**: every new session begins with — "欢迎来到泰拉瑞亚！我是你的向导。" (Welcome to Terraria! I am your Guide.) — and follows a renamed character's new name.
2. **Your name is "Adventurer"**: user messages are never signed "Me" or "User" — always 冒险者, the person standing across from the Guide.
3. **HUD Guide tip** (a quiet hint at the mechanics): "危险操作会弹出审批石板；红心是对话的印记，金币是账单。" — hearts = the emblem on dialog bubbles, coins/the bill = the token-usage stats, which now live in the HUD's Guide-tip panel instead of a per-reply line.
4. **The connection's worldview**: a live socket reads "已连接到向导世界" (connected to the Guide's world); a dropped one reads "连接已断开，重连中…" — WebSocket reconnection told as a world bond.
5. **The difficulty lexicon**: there is no "standard/code/minimal" in mode select — only Journey, Softcore, Mediumcore, Hardcore. Pick Softcore and the side panel quotes the game verbatim: "软核人物死亡时会掉落金钱。" (Softcore characters drop coins on death.) — while it actually switches the Code Mode SDK preset.
6. **"旅程被中断"**: when you manually stop a generation, the system line doesn't say "cancelled" — it says "the journey was interrupted".
7. **Desk Pet**: the title-screen "人物桌宠" swaps the character living in the dialog box — drag or click to upload a photo as the portrait (any size, shown as 88×88; photos render smooth while the default pixel art stays crisp), and renaming updates the chat signature, approval slate, welcome line, and input placeholder all at once; the "性格" (personality) section accepts hand-written descriptions or imports them from an .md file; the "桌宠" section gives all five pets their own toggle — Eye of Cthulhu, King Slime, Draedon, Devourer of Gods, and Cryogen — release whichever you fancy, or let them all out for a full boss parade across your screen.
8. **The eternal walker**: the little gif in the mode-select header never stops walking — as if waiting for you to pick a difficulty and set off together.

---

## 6. Performance & Accessibility Guardrails

### Performance

| Optimization | Approach |
|---|---|
| **Zero-framework runtime** | The whole UI is vanilla DOM manipulation — no React/Vue runtime. The build output is one ~230 KB HTML plus static assets |
| **Single-file pixel font** | The Fusion Pixel woff2 loads once and serves the whole site, no FOIT flicker |
| **Wallpaper auto-compression** | Uploaded images are scaled to a 1920px max edge at JPEG quality 85, keeping localStorage usage bounded |
| **Video & music via IndexedDB** | Live wallpapers (≤512 MB) and custom BGM (≤64 MB) both live in IndexedDB, bypassing the 5 MB localStorage cap; referenced through `URL.createObjectURL` with `revokeObjectURL` cleanup on change |
| **Cheap crisp rendering** | `image-rendering: pixelated` upscales low-res art with no filtering — near-zero GPU cost |
| **Local message updates** | Streaming only mutates one bubble's `textContent`, never re-flowing the list |

### Accessibility Guardrails

- **Contrast**: all body text is light-on-dark (parchment white `#f4f3e6` on deep blue `#2e3692`); key actions (Send/Save) are gold-highlighted buttons;
- **Audio can be muted**: the sound system has a master switch — no forced auditory feedback;
- **Approval guardrail**: tools default to manual confirmation — dangerous operations pop an approval tablet requiring a human nod; auto-allow is an explicit opt-in with a "use with caution" warning on the button;
- **Graceful degradation**: if IndexedDB is unavailable the video wallpaper silently falls back to a static one; a dropped WebSocket auto-reconnects with a clear status; every RPC failure surfaces a toast instead of being swallowed.

---

## 7. Project Maintenance (Uninstall, Structure & License)

### Repository Structure (a standard dsh plugin package)

```
dsh_theme_terraria/       <- this repository = a standard dsh plugin package (GitHub-ready)
├── package.json          <- plugin manifest: package name dsh-theme-terraria, main
│                            entry, dsh.bundle patch declaration, peer deps, files/exports
├── index.js              <- plugin entry: exports apply(ctx); swaps the frontend dist
│                            resolver, registers /terraria/* routes, pushes injection rows
├── cordis.patch.yml      <- bundle patch layer: disables the official web-runtime,
│                            inserts the terraria-theme row
├── skin/                 <- injection layer + fallback skin
│   ├── terraria.js           takeover script (inlined into the index)
│   └── terraria.css          fallback pixel skin for the official UI
├── web/                  <- the theme frontend dist served by the plugin
│   ├── index.html            the entire theme source (HTML + CSS + JS in one file)
│   ├── forest.png            default forest wallpaper
│   ├── Tree.png              title-screen tree
│   ├── xiangdao.png          Guide portrait
│   ├── heart.png             heart emblem
│   ├── Style_1_male_walking.gif  walking character (mode modal)
│   ├── fusion-pixel-12px.woff2   pixel font
│   ├── favicon.svg           site icon
│   ├── eoc_pet.html          Eye of Cthulhu desk pet (iframe page with postMessage protocol)
│   ├── slimeking_pet.html    King Slime desk pet (iframe page with postMessage protocol)
│   ├── draedon_pet.html      Draedon desk pet (iframe page with postMessage protocol)
│   ├── dog_pet.html          Devourer of Gods desk pet (iframe page with postMessage protocol)
│   ├── cryogen_pet.html      Cryogen desk pet (iframe page with postMessage protocol)
│   └── manifest.webmanifest  PWA manifest
├── asset/                <- portraits and BGM assets (shipped with the package)
├── screenshots/          <- live screenshots (9, including a real Electron shell simulation)
│   ├── title-screen.png      title screen
│   ├── chat-main.png         main chat interface
│   ├── mode-select.png       mode select modal (character creation)
│   ├── settings.png          settings modal (key/wallpaper/plugins)
│   ├── plugin-manager.png    plugin manager
│   ├── workspace.png         workspace modal
│   ├── desktop-title-screen.png  Electron shell simulation: themed title screen after takeover
│   ├── desk-pet.png          Desktop window: desk pet modal
│   └── desk-pet1.png         Desktop window: title screen + pet parade
├── docs/
│   └── GITHUB_UPLOAD.md  <- upload list, repository settings, release notes and user steps
├── README.md             <- Chinese documentation
├── README_EN.md          <- English documentation (this file)
├── CHANGELOG.md          <- release and compatibility notes
└── .gitignore            <- excludes .analysis/, .agent-teams/, logs and local credentials
```

### Plugin Spec Essentials (apply(ctx) and how it loads)

- **Entry module**: `package.json`'s `main` points at `index.js`, which exports `name` (`'terraria-theme'`) and `apply(ctx, config)` — exporting `apply(ctx)` is a hard requirement of the DeepSeek Harness plugin spec, and the reason `dsh plugin add` can load this theme correctly;
- **What apply(ctx) does**: three things. It registers `/terraria/*` (`/terraria/theme.html` serves `web/index.html`, `/terraria/account` returns a same-origin + browser-cookie-fenced account snapshot) and pushes the style row, the `__TERRARIA_THEME__` global and an **inline** takeover script into the Host index-injection table — this is how the **Desktop window** gets taken over to the theme page. It then points the official `@deepseek-ai/dsh-web-app` frontend dist resolver (`WebApp.internals.resolveDistIndex`) at this package's `web/index.html` and delegates mounting of the official plugin, so opening the Host URL in a browser gets the full themed frontend. Finally it **degrades instead of crashing** when another theme already provides `webRuntime` or the peer cannot be resolved/imported — the injection skin and theme page stay available;
- **Why the injection is inline**: the Desktop shell does `await loadScript(src)` for `script-src` rows, and a 404/network failure rejects `__DSH_BOOT_READY__`, taking the whole window (official UI included) down. An inline `script` row executes directly; `/terraria/terraria.js` remains only as a read-only route for manual debugging;
- **Patch layer**: `package.json` declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`; `dsh plugin --profile <desktop|web> add` uses it to append this package to that profile's `dsh.profile.bundles` layer list;
- **Peer dependency**: `@deepseek-ai/dsh-web-app >=0.1.0-rc.5`, resolved by the dsh installation so the theme shares the official Web runtime's cordis instance. Resolution tries the process entry first, then the loader baseUrl, and validates `internals.resolveDistIndex` on every candidate so a stale profile-local copy is skipped.

### Common Maintenance Commands

```powershell
# Edit the theme: edit web/index.html or skin/ directly (no build step)
# Browser path: restart dsh web
# Desktop path: after changing configuration/plugins, quit the app completely and relaunch
#   (injection rows are a startup snapshot)

# Update the installed theme plugin (desktop example; use web for the browser path)
& '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop update dsh-theme-terraria
```

### Uninstalling (Restore the Official UI)

```powershell
# Desktop (quit the app completely first; relaunch afterwards)
& '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-theme-terraria
# author's machine: & 'D:\dsh\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-theme-terraria

# Browser
dsh plugin --profile web remove dsh-theme-terraria
dsh web   # after restart, the official React frontend is back
```

The theme mounts and unmounts wholesale through the plugin mechanism — it never modifies any file in the dsh installation, so uninstalling leaves zero residue. Browser-side personalization (wallpaper, background music, sound toggle, approval preference) lives in localStorage / IndexedDB; clearing site data wipes it completely. The Desktop window's localStorage belongs to the `dsh-app://app` origin and survives uninstalling; clear the `terraria.*` keys from the <kbd>F12</kbd> console if needed.

### Submitting and Publishing

- Add the `dsh-plugin` topic to the GitHub repository's **Topics** — the listing crawler uses it to identify this repository as a DSH plugin;
- The plugin entry `index.js` exports `apply(ctx)`; installation uses `--profile desktop` for the Desktop app and `--profile web` for the browser, with a local absolute path until the package is published to npm;
- **This repository has not been submitted to / listed in any third-party plugin directory yet**: the top badges only state the version and Desktop compatibility and no longer claim "listed"; add a real listing link and badge once dsh-plugin.org (or another directory) has a live detail page;
- See [`docs/GITHUB_UPLOAD.md`](docs/GITHUB_UPLOAD.md) for the upload/exclude file list, repository settings, and release notes.

### License

- This theme: **MIT License** (consistent with the DeepSeek Harness repository)
- Fusion Pixel font: under its own open-source license (see the [Fusion Pixel Font project](https://github.com/TakWolf/fusion-pixel-font))
- Terraria is a registered trademark of Re-Logic. This is an unofficial fan-made skin with no affiliation to Re-Logic; do not use the assets commercially.

---

<p align="center">May the Guide's torch light every build of yours.</p>
