# GreenText

GreenText is a modern, cross-platform standalone network configuration editor built to be a massive upgrade over generic text editors. Think of it as a lightning-fast combination of BBEdit and Termius, built specifically for network engineers working with **Aruba**, **Juniper**, and **Mist**.

![GreenText — Editor](docs/screenshots/01-editor.png)

## What Makes GreenText Different?

Standard text editors break when you paste massive firewall policies or dump thousands of lines of log files containing weird control characters. GreenText is purpose-built to handle massive networking files safely while integrating directly with your remote systems.

### 🌟 Core Capabilities
- **Tauri + React + TypeScript + Tailwind CSS** architecture.
- **Monaco Editor Engine** with specific parsing optimizations for massive text payloads.
- **Deep-Slate UI** modeled closely on the GreenCLI design system.
- **Multi-File Workspace** handling directories gracefully with instant Rust-powered regex search.
- **Interactive Diff Engine** for comparing dirty config against saved files.

### 🛠 Powerful Text Processing
The **Inspector Panel** contains an armory of tools that instantly clean up bad configs:
- **Pretty Indent**: Auto-format entire Aruba/Juniper configurations in one click.
- **Process Duplicate Lines**: Deduplicate massive prefix/access lists without sorting them.
- **Zap Gremlins**: Instantly wipe non-ASCII control characters that cause terminal crashes.
- **Sort / Reverse Lines**: Organize long blocks of interfaces alphabetically.
- **Change Case**: Rapidly normalize standard uppercase `DESCRIPTION` fields.

### 🔌 Connected Workflows
- **SSH / Telnet Terminal**: `xterm.js` embedded directly in your editor tabs to hit remote boxes.
- **SFTP Browser**: Graphically browse remote file systems over SSH and pull files right into GreenText.
- **Encrypted Credential Vault**: Store passwords and keys locally via AES-256-GCM.
- **MCP Servers Panel**: Spin up and manage Model Context Protocol AI integrations right from the UI.
- **Regex Pattern Playground**: Extract the current file and live-test complex regex patterns with immediate visual feedback on capture groups.

## Current Features

- Auto language detection from file extension and config fingerprints.
- Language modes for Aruba CX, Aruba AOS-S, Aruba wireless/controller, Juniper Junos, Mist/Apstra, and common general languages.
- Expanded template library for switching, routing, security, management, wireless, Apstra/Mist intent, and change planning.
- Backend-scoped native file/folder access with restrictive CSP.
- Native File/Edit/View/Text/Tools menus wired directly to editor commands.
- Encoding detection for UTF-8, UTF-8 BOM, UTF-16 LE/BE, and Latin-1 fallback.
- EOL display and LF/CRLF conversion commands.
- Draft recovery, dirty-close guard, Save All, and Revert.

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
