# Real-Time Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can join the same room and draw together on a shared HTML5 Canvas.

The application uses Socket.IO WebSockets to synchronize drawing activity, cursor positions, user counts, and canvas operations between connected users.

---

## Features

### Drawing

- Real-time collaborative drawing
- Brush tool
- Eraser tool
- Color selection
- Adjustable stroke width
- Smooth pointer-based drawing
- Real-time drawing previews while users are actively drawing

### Collaboration

- Multiple users can draw simultaneously
- Room-based collaboration
- Remote user cursor indicators
- Online user count
- User-specific cursor colors
- Real-time Socket.IO communication

### Canvas Operations

- Global Undo
- Global Redo
- Global Clear
- Authoritative server-side canvas state
- Canvas state synchronization when joining or reloading a room

### Connection

- Connection status indicator
- Network latency measurement
- Automatic synchronization of committed drawing state

---

## Technologies Used

### Frontend

- HTML5
- CSS
- TypeScript
- HTML5 Canvas API
- Socket.IO Client
- Vite

### Backend

- Node.js
- TypeScript
- Express
- Socket.IO

### Communication

- WebSockets through Socket.IO

### State Management

- In-memory server-side drawing state

---

## Project Structure

```text
collaborative-canvas/
│
├── client/
│   ├── canvas.ts
│   ├── main.ts
│   ├── websocket.ts
│   └── types.ts
│
├── server/
│   ├── server.ts
│   ├── websocket-handler.ts
│   ├── drawing-state.ts
│   └── rooms.ts
│
├── data/
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
├── README.md
└── ARCHITECTURE.md