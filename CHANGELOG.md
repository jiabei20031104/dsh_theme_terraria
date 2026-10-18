# Changelog

All notable changes to `dsh-theme-terraria` are documented here.

## 0.3.0 — 2026-10-18

Desktop (Electron / DSH 0.2.0-rc.2) compatibility release. The theme can now be
installed into the **desktop** profile and take the Desktop window over to the
Terraria UI, without any failure mode that can keep the official window from
booting.

### Fixed

- **Desktop boot could fail when the theme script was unreachable.** The index
  injection used a `script-src` row; the Desktop shell awaits every `script-src`
  load and rejects `__DSH_BOOT_READY__` on failure, so a single 404 took the
  whole window (official UI included) down. The takeover layer is now an
  **inline `script` row** read from `skin/terraria.js`; if the file cannot be
  read the row is skipped and only the takeover is lost. `/terraria/terraria.js`
  stays as a read-only route for manual debugging.
- **Root-absolute theme assets were served as `application/octet-stream`** in
  the Desktop window (`/fusion-pixel-12px.woff2`, `/forest.png`, `/heart.png`,
  `/xiangdao.png`, `/Style_1_male_walking.gif`, `/favicon.svg`). All theme
  assets now use the `/terraria/*` Host route, which types them by extension
  and file magic (WebP/PNG/WOFF2), including the hard-coded image paths inside
  the theme page JavaScript. Desk-pet iframes also use `/terraria/*` pages.
- **`/terraria/account` had no trust fence.** It now reuses the Host
  connection's `requestRejection()` (same Host/Origin fence and browser-cookie
  signature check as `/api`) with a local loopback + same-origin + cookie
  fallback, so an unauthenticated local request gets 401 instead of the
  nickname / contact / avatar snapshot.
- **A second dist-replacing theme could crash the Host** with a duplicate
  `webRuntime` service. `apply` now detects an existing `webRuntime` and skips
  the delegation (skin + theme page stay available) and warns once.
- **Peer resolution could silently use a stale profile-local copy.** Candidates
  are tried in authority order (process entry first, then loader baseUrl) and
  each is validated for `internals.resolveDistIndex`; an incompatible copy is
  skipped. Any peer import/mount failure degrades to "skin + theme page only"
  instead of failing the plugin entry.
- **Opening the theme page without `?host`** (manual URL / deep link) no longer
  silently connects the WebSocket to `dsh-app://app`: the page asks
  `window.dshDesktopBoot.ready()` for the real host `streamBaseUrl` and shows a
  visible notice when that fails.
- `resolveAsset` now resolves real paths and re-checks the allowed root before
  serving (defence in depth against symlink escapes); static responses carry
  `X-Content-Type-Options: nosniff`.

### Documentation

- Chinese and English READMEs now document the desktop profile install path
  end-to-end: `dsh plugin --profile desktop add <absolute path>` via the
  app-bundled `<DSH install dir>\resources\runtime\cli\bin\dsh.cmd` (the
  author's machine uses `D:\dsh`), the mandatory full quit + relaunch,
  uninstall, the Plugin Hub local-folder entry, and why the web profile does
  not affect the Desktop window. They also explain that the package is not on
  npm yet and that machines without git must use a local absolute path.
- Documented the takeover cost (client-plugin UIs such as dream-skin,
  whale-widget and agent-teams are hidden while the takeover is active),
  `DSH_TERRARIA_STANDALONE` / `DSH_TERRARIA_SKIN`, the startup-time env
  requirement, and how to re-enable the takeover from the F12 console.
- Added Desktop screenshots and refreshed the repository structure section.

### Packaging

- Version bumped to `0.3.0`; `files`/`exports` now cover `index.js`,
  `cordis.patch.yml`, `web/`, `skin/` and `asset/`.
- `screenshots/` and `docs/` are included in the published package so README
  images and the upload guide resolve on npm; `screenshots/desktop-title-screen.png`
  is a real Electron shell simulation screenshot.
- Added `docs/GITHUB_UPLOAD.md` (upload/exclude list, repository settings,
  release notes and the final desktop install/relaunch/switch-back steps).
- `.gitignore` excludes `.analysis/`, `.agent-teams/`, logs, cookies and local
  credential files.

## 0.2.7 and earlier

- Terraria pixel theme for the browser path: the official Web frontend dist is
  replaced by a self-contained `web/index.html`, plus an injected pixel skin
  and takeover layer for the Desktop window.
- Four difficulty presets mapped to agent presets, Guide dialog, quest HUD,
  chat history paging/anchor navigation/Markdown, wallpapers, custom BGM,
  desk pets and 8-bit sound effects.
