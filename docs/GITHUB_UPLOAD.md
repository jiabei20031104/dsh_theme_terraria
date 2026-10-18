# GitHub 上传清单与发布说明（dsh-theme-terraria 0.3.0）

> 本仓库当前**没有 `.git` 目录**（本机未安装 git）。下面按“可直接上传 GitHub / 可被 `git init` 后干净提交”两种方式给出清单。
> 内部验证产物（`.analysis/`、`.agent-teams/`、`.pnpm-store/`）**绝不要上传**；`.gitignore` 已覆盖，但**网页版拖拽上传不读 `.gitignore`**，请按 §2 显式排除。

---

## 1. 需要上传的文件（tracked 集）

根目录文件：

```text
.gitignore
CHANGELOG.md
LICENSE
README.md
README_EN.md
cordis.patch.yml
index.js
package.json
```

目录（连同内容一起上传）：

```text
asset/          立绘与 BGM 素材（随包发布；含 Overworld Day.mp3）
docs/
└── GITHUB_UPLOAD.md   本文件
screenshots/    9 张实操截图（含真实 Electron 桌面壳仿真 desktop-title-screen.png）
skin/           terraria.js / terraria.css
web/            主题前端（index.html、字体、壁纸、桌宠 iframe、manifest 等）
```

`screenshots/` 明细（README 中英均引用）：

```text
title-screen.png          chat-main.png             mode-select.png
settings.png              plugin-manager.png        workspace.png
desktop-title-screen.png  desk-pet.png              desk-pet1.png
```

`.gitignore` 已排除：`node_modules/`、`.pnpm-store/`、`.analysis/`、`.agent-teams/`、`.recon/`、`*.log`、`cookies*.txt`、`*.cookies`、`.credentials*`、`.dsh-home/`、`.env*`、临时文件与系统垃圾文件。

## 2. 必须排除的内容（不要上传）

| 路径 | 原因 |
|---|---|
| `.analysis/` | 审计/验证台/Electron 运行时副本/日志/结果 JSON，约 365 MB，含本机沙盒凭据；`.gitignore` 已忽略 |
| `.agent-teams/` | 团队任务与邮箱状态，内部协作数据 |
| `.pnpm-store/` | 本地包缓存 |
| `node_modules/` | 依赖目录 |
| `*.log`、`cookies*.txt`、`*.cookies` | 日志与本地会话 cookie |
| `.credentials*`、`.dsh-home/`、`.env*` | 本机凭据/环境变量 |
| 用户真实 profile | `%USERPROFILE%\.dsh\profiles\desktop\package.json` **不是本仓库内容**，不要复制进仓库 |

> 若用 GitHub 网页上传：直接拖拽根目录文件 + 上述 6 个目录，**不要**把 `.analysis`/`.agent-teams`/`.pnpm-store` 拖进去。
> 若在已装 git 的机器上上传：

```sh
git init
git add .
git status          # 确认列表里没有 .analysis/.agent-teams/node_modules/*.log/cookies
git commit -m "dsh-theme-terraria 0.3.0: desktop profile + Electron takeover adaption"
git branch -M main
git remote add origin https://github.com/10086ggqq/dsh_theme_terraria.git
git push -u origin main
```

## 3. 仓库设置建议

- **Description**：`Terraria pixel theme for DeepSeek Harness (Desktop + Web) — desktop-profile install, Electron takeover with graceful fallback, zero-build frontend.`
- **Topics**：`dsh-plugin`、`deepseek-harness`、`terraria`、`theme`、`pixel-art`、`electron`、`web-ui`
- **License**：MIT（仓库已有 `LICENSE`）
- **Default branch**：`main`
- **About → Website**：可留空；**尚未提交/收录到 dsh-plugin.org / dsh.market**，不要写“已收录”
- **Social preview**：上传 `screenshots/desktop-title-screen.png`（真实 Electron 桌面壳仿真截图）
- **Releases**：新建 `v0.3.0`，正文见 §4；附件可上传 `npm pack` 产物（可选）
- **npm**：尚未发布；`package.json` 的 `files` 已包含 `screenshots` 与 `docs`，发布后 README 图片/文档链接在 npm 上也可解析（GitHub 始终正常）

## 4. Release 文案（v0.3.0）

标题：`0.3.0 — DeepSeek Harness Desktop 0.2.0-rc.2 适配`

正文（可直接粘贴）：

```markdown
### 桌面端

- 支持安装到 **desktop profile**：窗口会由注入层接管到 `/terraria/theme.html?host=…`，与网页端同一份 UI。
- 注入脚本改为**内联 `script` 行**：`/terraria/terraria.js` 404 不再让 `__DSH_BOOT_READY__` reject、不会把整个窗口带崩。
- 根绝对资源全部迁到 `/terraria/*`（字体/壁纸/头像/红心/行走 gif/favicon），桌面转发后 MIME 正确。
- `/terraria/account` 复用宿主 `connection.requestRejection`（同源 + Host/Origin + 浏览器 cookie 签名栅栏）。
- 无 `?host` 时通过 `dshDesktopBoot.ready().streamBaseUrl` 退化；不静默连 `dsh-app://app`。
- 与 dream-skin / whale-widget / agent-teams 共存说明；`webRuntime` 已被占用时跳过委托并降级，不崩宿主。

### 验证

- `pwsh -NoProfile -File .analysis\harness\run-all.ps1 -Mode headless`：37/37 passed，green，exit 0。
- `-Mode full`（中完整性 Electron）：38/38 passed，`electron=passed`，exit 0；截图与断言见仓库说明。

### 安装（桌面版）

```powershell
# 完全退出应用后
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<本仓库绝对路径>'
# 双击启动；改配置/升级后需完整退出并重启
```

完整步骤与开关见 README §2。
```

## 5. 给用户的最终操作步骤（桌面版）

1. **完全退出 DeepSeek Harness**（托盘 → 退出），确认进程消失：

   ```powershell
   Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue
   ```

2. **安装到 desktop profile**（`<本仓库绝对路径>` 必须是绝对路径且含 `package.json`；`<DSH 安装目录>` 换成你的安装目录，作者本机为 `D:\dsh`）：

   ```powershell
   & '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<本仓库绝对路径>'
   # 作者本机示例：& 'D:\dsh\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add 'D:\code\dsh_theme_terraria-main'
   ```

   本机没有 git 时不要用 `github:`；npm 尚未发布，不要用包名安装。

3. （可选）确认 profile：`Get-Content "$env:USERPROFILE\.dsh\profiles\desktop\package.json"`，`dependencies` 有 `dsh-theme-terraria`、`dsh.profile.bundles` 末尾有它。

4. **双击启动应用**，窗口应停在 `dsh-app://app/terraria/theme.html?host=http%3A%2F%2F127.0.0.1%3A19387`。
   **装完插件/改过配置必须完整退出并重启**——注入行是宿主启动时的一次性快照。

5. **切回官方界面**（仅桌面窗口）：主题页标题屏点「切回官方界面」或按 <kbd>Alt</kbd>+<kbd>O</kbd>（写 `terraria.takeover=0`）。
   重新接管：<kbd>F12</kbd> 控制台执行 `localStorage.removeItem('terraria.takeover'); location.reload()`。

6. **卸载**（先完全退出应用，执行后完整重启）：

   ```powershell
   & '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-theme-terraria
   ```

7. **开关**（必须在启动应用前设置）：`DSH_TERRARIA_STANDALONE=0` → 官方 UI + 像素皮肤；`DSH_TERRARIA_SKIN=0` → 连皮肤也不注入。
   需要 dream-skin / whale-widget / agent-teams 的客户端 UI 时用 `DSH_TERRARIA_STANDALONE=0`。

8. **浏览器路径**（需要真实 `dsh` CLI，与桌面 profile 互不影响）：

   ```sh
   dsh plugin --profile web add '<本仓库绝对路径>'
   dsh web
   ```

   浏览器里的 `/` 就是主题前端，没有「切回官方界面」；恢复官方 React 前端请卸载插件后重启 `dsh web`。

## 6. 验证证据（内部，不随仓库上传）

- headless 验证台：`pwsh -NoProfile -File .analysis\harness\run-all.ps1 -Mode headless` → 37/37 passed，green，exit 0（`.analysis/harness/results/latest.json`）。
- Electron 全量（t4，Medium 完整性终端）：`full-2026-10-18T03-22-26-156Z.json`，38/38 passed、`electron.status=passed`、exit 0；`desktop-sim.json`：`finalUrl=dsh-app://app/terraria/theme.html?host=…`、`title=DeepSeek Harness · Terraria`、`screenTitle/desktopAttribute/wsConnected/noUncaughtConsoleErrors/rendererAlive` 全 true、`uncaughtErrors=[]`；截图 `.analysis/artifacts/desktop-sim.png`（1440×900），已复制为 `screenshots/desktop-title-screen.png`。
- **注意**：`-Mode headless` 会把 `latest.json` 覆盖为 headless（`electron=not-run`）；Electron 证据以固定的 `full-2026-10-18T03-22-26-156Z.json` 为准，不要用 `latest.json` 判断 Electron。

---

## English summary

- **Upload**: root files (`README*.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, `index.js`, `cordis.patch.yml`, `.gitignore`) plus `asset/`, `docs/`, `screenshots/`, `skin/`, `web/`.
- **Never upload**: `.analysis/`, `.agent-teams/`, `.pnpm-store/`, `node_modules/`, logs, cookies, `.credentials*`, `.dsh-home/`, `.env*` (`.gitignore` covers them, but GitHub's web uploader ignores `.gitignore`).
- **Repo settings**: MIT, default branch `main`, topics `dsh-plugin` etc., social preview `screenshots/desktop-title-screen.png`; the repository is **not listed** in any plugin directory yet.
- **Install (Desktop)**: fully quit the app → `& '<DSH install dir>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<absolute repo path>'` → launch normally → quit + relaunch after any config change. Switch back to the official UI with the title-screen link or <kbd>Alt</kbd>+<kbd>O</kbd> (Desktop only). Uninstall with `plugin --profile desktop remove dsh-theme-terraria` and relaunch.
- **Electron evidence**: `full-2026-10-18T03-22-26-156Z.json` (38/38, `electron.status=passed`); `screenshots/desktop-title-screen.png` is the real Electron simulation screenshot.
