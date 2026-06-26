# GreenText

GreenText is a standalone desktop text and network configuration editor. The first milestone focuses on BBEdit/Notepad++ style editing with Monaco-powered language coloring, auto-indent, a one-click **Pretty Indent** action, safer native file open/save, and built-in Aruba/Juniper/Mist template packs.

## Current features

- Tauri + React + TypeScript desktop shell
- Monaco editor bundled locally with editor-only theme presets
- Tabs/buffers with dirty tracking
- Native open/save/save-as through Tauri, with browser fallback during web preview
- Language modes for Aruba CX, Aruba AOS-S, Aruba wireless/controller, Juniper Junos, Mist/Apstra, and common general languages
- Auto language detection from file extension and config fingerprints
- Format-on-type/paste controls plus a visible **Pretty Indent** button
- Built-in network templates for Aruba CX, Aruba AOS-S, Aruba wireless, Juniper Junos, and Mist/Apstra workflows
- Expanded template library for switching, routing, security, management, wireless, Apstra/Mist intent, and change planning
- Project-folder browser for text/config files
- Recent files list
- Edit, split, saved-copy diff, and arbitrary open-buffer compare modes
- Command palette with keyboard shortcuts
- Handy automations: explain selection, local config risk review, template-variable extraction, change checklist, sort lines, trim whitespace, duplicate line/selection, and timestamp insertion
- Backend-scoped native file/folder access with restrictive CSP
- Native File/Edit/View/Tools menus wired to editor commands
- Encoding detection for UTF-8, UTF-8 BOM, UTF-16 LE/BE, and Latin-1 fallback
- EOL display and LF/CRLF conversion commands
- Backend Find in Project with literal/regex and case-sensitive options, plus clickable results
- Config outline navigation for network sections
- Draft recovery, dirty-close guard, Save All, and Revert
- Editor zoom controls with shortcuts
- Pinned tabs and tab sorting by name, language, dirty state, or path
- Project file sorting by path, name, type, or size, with optional directory grouping
- Problem scanning that reports in the status bar and only opens Tools when issues need inspection
- Auto-detect action for language/color mode

## Editor themes

The theme selector changes only the Monaco editor, not the app chrome:

- Neutral Dark
- Google Gray
- GreenCLI Slate
- Soft Gray

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Cmd/Ctrl+P | Command palette |
| Cmd/Ctrl+= | Zoom in |
| Cmd/Ctrl+- | Zoom out |
| Cmd/Ctrl+0 | Reset zoom |
| Cmd/Ctrl+N | New buffer |
| Cmd/Ctrl+O | Open file |
| Cmd/Ctrl+Shift+O | Open project folder |
| Cmd/Ctrl+S | Save |
| Cmd/Ctrl+Shift+S | Save As |
| Cmd/Ctrl+Shift+F | Find in project |
| Cmd/Ctrl+Alt+Shift+F | Pretty Indent |
| Cmd/Ctrl+F | Find |
| Cmd/Ctrl+Alt+F | Find and replace |
| Cmd/Ctrl+B | Toggle sidebar |
| Cmd/Ctrl+\\ | Toggle split view |
| Cmd/Ctrl+Shift+G | Toggle diff view |
| Cmd/Ctrl+Shift+D | Duplicate line/selection |

## Development

```bash
npm install
npm run dev
```

Desktop development:

```bash
npm run tauri:dev
```

Build checks:

```bash
npm run lint
npm run build
npm run tauri -- build --no-bundle
```
