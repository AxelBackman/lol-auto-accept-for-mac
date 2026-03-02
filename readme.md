# LoL Auto Accept

A lightweight macOS menu bar app that automatically accepts League of Legends queue pops.

## How it works

The app watches for the League client's `lockfile` to detect when the client is running. Once found, it connects via WebSocket to the local LCU API, listens for ready-check events, and automatically accepts the match for you.

## Prerequisites

- macOS
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- League of Legends installed

## Getting started

```sh
pnpm install
pnpm start
```

## Building

Package the app as a `.zip` for macOS:

```sh
pnpm make
```

The output will be in the `out/` directory.

## Usage

1. Launch the app — it appears in your menu bar and dock
2. Open the League client and queue up
3. When a match is found, the app accepts it automatically
4. Click the toggle button in the app window to enable/disable auto-accept
5. Close the window to minimize to the menu bar; right-click the tray icon to show or quit

## License

ISC
