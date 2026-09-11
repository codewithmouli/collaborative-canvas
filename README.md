# Real-Time Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can join the same room and draw together on a shared HTML5 Canvas.

The application uses Socket.IO WebSockets to synchronize drawing activity, cursor positions, user counts, and canvas operations between connected users.

---

## Live Demo

https://collaborative-canvas-grwa.onrender.com

## GitHub Repository

https://github.com/codewithmouli/collaborative-canvas

---

# Features

## Drawing

- Real-time collaborative drawing
- Brush tool
- Eraser tool
- Color selection
- Adjustable stroke width
- Smooth pointer-based drawing
- Real-time drawing previews while users are actively drawing
- HTML5 Canvas rendering without external drawing libraries

## Collaboration

- Multiple users can draw simultaneously
- Room-based collaboration
- Remote user cursor indicators
- Online user count
- User-specific cursor colors
- Real-time Socket.IO communication
- Canvas state synchronization for newly connected users

## Canvas Operations

- Global Undo
- Global Redo
- Global Clear
- Authoritative server-side canvas state
- Canvas state synchronization when joining or reloading a room

## Connection

- Connection status indicator
- Network latency measurement
- Automatic synchronization of committed drawing state

---

# Technologies Used

## Frontend

- HTML5
- CSS
- TypeScript
- HTML5 Canvas API
- Socket.IO Client
- Vite

## Backend

- Node.js
- TypeScript
- Express
- Socket.IO

## Communication

- WebSockets through Socket.IO

## State Management

- In-memory server-side drawing state

---

# Project Structure

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

Canvas State Synchronization

The server maintains the committed drawing state for each room.

When a user joins or reloads a room:

User Joins
    │
    ▼
Server
    │
    ▼
Current Canvas State
    │
    ▼
Client
    │
    ▼
Canvas Reconstructed

The canvas is reconstructed by replaying the stored stroke operations.

This avoids sending the entire canvas as an image or bitmap.

Global Undo and Redo

Undo and Redo are implemented as global room operations.

This means any connected user can undo or redo the most recent committed operation in the shared room.

The server maintains:

strokes[]
redo[]
Undo
strokes: A → B → C
redo: empty

        Undo

strokes: A → B
redo: C
Redo
strokes: A → B
redo: C

        Redo

strokes: A → B → C
redo: empty

Because the server performs these operations, all users receive the same resulting canvas state.

Clear Operation

Clear is also a global room operation.

When Clear is requested, the server removes the current committed strokes from the active canvas state and updates the room.

The operation is synchronized to all connected users.

Conflict Resolution

Multiple users can draw simultaneously.

The server acts as the authority for committed drawing operations.

When drawing operations arrive at the server, they are stored according to server processing order.

User A ──┐
         │
User B ──┼──► Server ──► Authoritative State
         │
User C ──┘

If multiple users draw over the same area, strokes are rendered according to their committed order.

The later committed stroke appears after the earlier stroke.

The application treats each stroke as an independent operation rather than attempting pixel-level merging.

This also allows Undo and Redo to operate on individual drawing operations.

Preview and Authoritative State

A major design decision is separating temporary previews from committed drawing state.

Committed Strokes
       +
Temporary Remote Previews
       =
Rendered Canvas

Remote previews are maintained separately on the client.

When an authoritative canvas state is received, committed strokes are redrawn while active remote previews are preserved.

This prevents one user's completed stroke or state update from accidentally removing another user's currently active preview.

Remote Cursor Indicators

Cursor positions are synchronized independently from drawing operations.

Mouse Movement
      │
      ▼
Canvas
      │
      ▼
Cursor Callback
      │
      ▼
Socket.IO
      │
      ▼
Server
      │
      ▼
Other Users
      │
      ▼
Remote Cursor

Each remote cursor receives a deterministic color based on its user ID.

Remote cursors are temporary UI elements and are not stored in drawing history.

Inactive remote cursors are automatically hidden after a timeout.

User Management

Users are associated with:

Socket ID
    ↓
User ID
    ↓
Room ID

The application tracks the number of connected users in each room.

The frontend displays the current online user count.

Remote users are represented through colored cursor indicators.

Room Collaboration

Each drawing session belongs to a room.

Users in the same room receive the same collaborative drawing updates.

Example:

Room A
 ├── User 1
 ├── User 2
 └── User 3

Room B
 ├── User 4
 └── User 5

Events from Room A are not broadcast to Room B.

This provides logical isolation between collaborative sessions.

Eraser

The eraser uses the HTML5 Canvas compositing mode:

destination-out

Instead of drawing white over existing content, the eraser removes pixels from the canvas.

This allows the eraser to work independently of the selected drawing color.

Performance Strategy

Real-time drawing can generate many pointer events.

Sending every pointer event individually would create unnecessary network traffic.

The application therefore batches preview points.

Many Pointer Events
        │
        ▼
Collect Points
        │
        ▼
~25 ms Preview Batch
        │
        ▼
Socket.IO

The local user's drawing is rendered immediately without waiting for server confirmation.

This provides responsive local interaction while still synchronizing the drawing with other users.

The application sends drawing operations as point data rather than repeatedly transferring canvas image data.

Network Latency

The application includes a Socket.IO ping/pong mechanism to estimate network latency.

The frontend displays the measured latency so that connection quality can be observed during collaboration.

Latency measurement is separate from drawing state.

WebSocket Events

The application uses Socket.IO events for real-time communication.

Client → Server
Event	Purpose
join-room	Join a drawing room
draw	Send a completed stroke
draw-preview	Send temporary drawing preview
cursor-move	Send cursor position
undo	Request global undo
redo	Request global redo
clear	Request global clear
ping	Measure network latency
Server → Client
Event	Purpose
room-joined	Confirm room connection
canvas-state	Send authoritative canvas state
draw	Broadcast completed drawing
draw-preview	Broadcast active drawing preview
cursor-move	Broadcast remote cursor
user-count	Update online user count
user-joined	Notify room of a new user
user-left	Notify room when a user leaves
pong	Return latency measurement
Getting Started
Prerequisites

Make sure the following are installed:

Node.js
npm
Git
Installation

Clone the repository:

git clone https://github.com/codewithmouli/collaborative-canvas.git

Navigate into the project:

cd collaborative-canvas

Install dependencies:

npm install
Running the Application

The application uses two processes during development.

Start the Backend

Open a terminal and run:

npm run server

The backend runs on:

http://localhost:3000

The health endpoint is:

http://localhost:3000/health
Start the Frontend

Open another terminal in the project directory and run:

npm run dev

Vite will provide the local frontend URL, normally:

http://localhost:5173

Open that URL in your browser.

Multi-User Testing

To test collaboration:

Start the backend.
Start the frontend.
Open the application in two browser windows or tabs.
Join the same room.
Draw in one window.
Verify that the other window receives the drawing while the stroke is being created.
Move the cursor and verify the remote cursor indicator.
Verify that the online user count updates.
Draw from both users at the same time.
Test Undo and Redo from either user.
Test Clear from either user.
Room Isolation Testing

To test room isolation:

Open two browser windows.
Put both users in different rooms.
Draw in Room A.
Verify that the drawing does not appear in Room B.
Draw in Room B.
Verify that the drawing does not appear in Room A.
State Synchronization Testing

To test state synchronization:

Open two users in the same room.
Draw several strokes.
Reload one client.
Rejoin the same room.
Verify that the existing committed drawing is restored.
Undo / Redo Testing

Test the global history using multiple users.

Example:

User A draws
User B draws
User A presses Undo

The most recent shared operation should be removed for both users.

Then:

User B presses Redo

The operation should be restored for both users.

Build

To create a production build:

npm run build

The build process compiles the frontend and server TypeScript code.

A successful build should produce the frontend assets in the dist directory and compiled server output.

Deployment

The application can be deployed using a platform that supports Node.js applications and WebSocket connections.

The production architecture is:

Internet
    │
    ▼
Browser
    │
    │ HTTPS / WebSocket
    ▼
Node.js Server
    │
    ▼
Socket.IO
    │
    ▼
Room State

The current deployed demo is available at:

https://collaborative-canvas-grwa.onrender.com

The current application runs as a single Node.js process with in-memory drawing state.

Current Limitations

The current implementation intentionally keeps the architecture simple for an internship demonstration.

In-Memory State

Drawing state is stored in server memory.

Restarting the server removes the active room drawing state.

No Database Persistence

There is currently no database-backed persistence.

Single Server Process

The application currently runs as a single server process.

Horizontal scaling would require shared Socket.IO coordination such as a Redis adapter.

Conflict Resolution

Conflict resolution currently follows server processing order.

Authentication

User authentication and private room authorization are not currently implemented.

Very Large Drawings

Very large drawings containing a very high number of points may require additional optimization.

Mobile Optimization

The application primarily targets desktop pointer interaction. Additional mobile-specific touch optimization could be added.

Future Improvements

Possible future improvements include:

Persistent drawing storage
Database-backed rooms
Redis-based distributed Socket.IO state
Multiple server instances
User authentication
Private room passwords
Drawing history persistence
Mobile touch optimization
Performance metrics
Advanced stroke simplification
Adaptive preview batching
Reconnection recovery
Operational Transform
CRDT-based collaboration
Security Considerations

For production use, the following improvements would be recommended:

User authentication
Room authorization
Strong input validation
Rate limiting
WebSocket connection limits
HTTPS/WSS configuration
Protection against malicious payloads
Maximum stroke size limits
Maximum points per event
Server-side room access validation

Testing Checklist
Single User
 Draw with brush
 Change colors
 Change stroke width
 Use eraser
 Undo
 Redo
 Clear
Multiple Users
 Join the same room
 Draw simultaneously
 Real-time drawing previews
 Completed stroke synchronization
 Remote cursors
 Online user count
 Global Undo
 Global Redo
 Global Clear
Room Isolation
 Separate rooms
 Room-specific drawing events
 No cross-room drawing updates
State Synchronization
 Join existing room
 Reload client
 Restore committed canvas state
Connection
 Connection status
 Network latency measurement
