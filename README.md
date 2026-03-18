# Task Cycler

A simple desktop task management app built with Tauri and Rust.

![Screenshot](./screenshot.png)

## Features

- **Add Tasks**: Type a task and click "Add Task" (or press Enter)
- **Cycle Tasks**: Click any task to move it to the bottom of the queue
- **Mark as Done**: Click the "Done" button to remove a task from the queue
- **Keep/Forget**: Cmd+Click to select tasks, then Cmd+K to toggle persistence — kept tasks survive app restarts
- **Visual Feedback**: The top task is highlighted to show what's next

## How It Works

Tasks are displayed in a queue. The first task (top) is highlighted. When you click on a task, it cycles to the bottom of the queue, letting you focus on other tasks first. When you're done with a task, click the "Done" button to remove it.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Click | Select/deselect a task |
| Cmd+K | Toggle keep (persist) on selected tasks |
| Escape | Clear selection |

## Download

Pre-built binaries for macOS, Linux, and Windows are available on the [Releases](../../releases) page.

## Running the App

### Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Requirements

- Node.js
- Rust (install from https://rustup.rs/)
- Tauri CLI (installed via npm dependencies)

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Rust
- **Framework**: Tauri 2.0
