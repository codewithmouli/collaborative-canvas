# Architecture — Real-Time Collaborative Drawing Canvas

## 1. System Overview

The Real-Time Collaborative Drawing Canvas is a browser-based collaborative drawing application.

Multiple users can join the same room and draw on a shared HTML5 Canvas. Drawing updates are transmitted through a WebSocket connection using Socket.IO so that other connected users can see drawing activity in real time.

The system is divided into three main parts:

```text
┌──────────────────────────────┐
│          Browser             │
│                              │
│  HTML UI                     │
│  Canvas                      │
│  Drawing Engine              │
│  WebSocket Client            │
└──────────────┬───────────────┘
               │
               │ Socket.IO
               │
┌──────────────▼───────────────┐
│       Node.js Server         │
│                              │
│  Express                     │
│  Socket.IO                   │
│  Room Management              │
│  Drawing State                │
│  Undo / Redo                  │
└──────────────┬───────────────┘
               │
               │
┌──────────────▼───────────────┐
│      In-Memory State         │
│                              │
│  Room → Strokes              │
│  Room → Redo History         │
└──────────────────────────────┘
## 2. Technology Stack

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

### State Storage

- In-memory server-side drawing state

---

## 3. Frontend Architecture

The frontend is divided into separate responsibilities.

```text
client/
│
├── main.ts
├── canvas.ts
├── websocket.ts
└── types.ts
project Structure
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

4.1 main.ts

main.ts acts as the main application controller.

Responsibilities include:

Connecting UI controls to the drawing engine
Managing the current room
Managing the current user
Handling local drawing callbacks
Handling remote drawing events
Handling remote drawing previews
Handling remote cursor events
Handling Undo
Handling Redo
Handling Clear
Displaying online user count
Displaying network latency
Managing remote cursor indicators

The file coordinates the Canvas and WebSocket layers.

4.2 canvas.ts

canvas.ts contains the main drawing engine.

Responsibilities include:

Creating and configuring the HTML5 Canvas
Handling pointer events
Drawing local strokes
Drawing remote strokes
Drawing remote previews
Supporting brush mode
Supporting eraser mode
Managing colors
Managing stroke width
Resizing the canvas
Sending cursor movement callbacks
Redrawing the authoritative canvas state

The Canvas uses pointer events so that drawing responds immediately to user interaction.

4.3 websocket.ts

websocket.ts contains the Socket.IO client communication layer.

Responsibilities include:

Connecting to the Node.js server
Joining rooms
Sending completed strokes
Sending real-time drawing previews
Sending cursor positions
Receiving remote strokes
Receiving remote previews
Receiving remote cursors
Receiving authoritative canvas state
Sending Undo requests
Sending Redo requests
Sending Clear requests
Receiving online user count
Measuring network latency

Keeping WebSocket communication separate from Canvas logic makes the application easier to maintain.

4.4 types.ts

types.ts contains shared TypeScript data structures.

The main structures are:

interface Point {
  x: number;
  y: number;
}
TypeScript
interface Stroke {
  id?: string;
  userId?: string;
  points: Point[];
  color: string;
  width: number;
  eraser: boolean;
}
stroke contains:

Unique stroke ID
User ID
Drawing points
Color
Stroke width
Eraser state

5. Backend Architecture

The backend is divided into separate modules.

server/
│
├── server.ts
├── websocket-handler.ts
├── drawing-state.ts
└── rooms.ts

5.1 server.ts

server.ts creates the HTTP server and initializes Socket.IO.

Responsibilities:

Create Express application
Serve the built frontend
Create the HTTP server
Initialize Socket.IO
Configure CORS
Provide the /health endpoint
Register WebSocket handlers
Start the server
5.2 websocket-handler.ts

This module handles real-time Socket.IO events.

Responsibilities include:

User connections
Room joining
Drawing events
Drawing preview events
Cursor movement
Undo
Redo
Clear
Latency ping/pong
User disconnection
Broadcasting room state
Broadcasting online user count

This module acts as the bridge between connected clients and server-side drawing state.

5.3 drawing-state.ts

This module manages the authoritative drawing state.

Each room maintains:

Room
 ├── strokes[]
 └── redo[]

Operations include:

Add stroke
Undo
Redo
Clear
Get current strokes

The server stores committed strokes in the order in which they are processed.

The server therefore acts as the authoritative source for committed canvas state.

5.4 rooms.ts

The room-management layer tracks which users and sockets belong to each room.

A room allows multiple users to collaborate on the same canvas without receiving drawing events from unrelated rooms.

6. Client-Server Data Flow

The overall data flow is:
User Input
    │
    ▼
HTML5 Canvas
    │
    ├──────────────► Local Rendering
    │
    ▼
Socket.IO Client
    │
    ▼
Node.js + Socket.IO Server
    │
    ▼
Room State
    │
    ▼
Other Connected Clients
    │
    ▼
Remote Rendering

7. Local Drawing Flow

When a user starts drawing:
Pointer Down
     │
     ▼
Canvas Drawing Engine
     │
     ▼
Create Stroke
     │
     ▼
Draw Locally
     │
     ▼
Collect Pointer Points
The local canvas updates immediately.

The user therefore does not need to wait for a server response before seeing their own drawing.

8. Real-Time Drawing Preview
The application does not wait until the user releases the pointer before sending drawing information.

During drawing, points are collected and sent as preview batches approximately every 25 milliseconds.

Pointer Move
     │
     ▼
Collect Points
     │
     ▼
Preview Batch
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
Remote Preview

The preview is temporary and is not added to the permanent drawing history.

This allows other users to see a stroke while it is being created.

9. Completed Stroke Flow

When the user finishes drawing:
9. Completed Stroke Flow
Pointer Up
    │
    ▼
Flush Remaining Preview Points
    │
    ▼
Create Final Stroke
    │
    ▼
Send "draw"
    │
    ▼
Server
    │
    ▼
Store Stroke
    │
    ▼
Broadcast Authoritative State
The client generates a unique strokeId.

The same ID is associated with the preview and final stroke.

This allows the client to identify which temporary preview belongs to the committed stroke.

10. Preview and Authoritative State

A major design decision is separating temporary previews from committed drawing state.
Committed Strokes
        +
Temporary Remote Previews
        =
Rendered Canvas
Remote previews are maintained separately on the client.

When the server sends the authoritative canvas state, the client redraws:

All committed strokes
Active remote previews that have not yet been committed

This prevents one user's completed stroke from accidentally removing another user's currently active preview.
11. WebSocket Protocol

The application uses Socket.IO events for real-time communication.

11.1 Client → Server Events
join-room

Used when a user joins a drawing room.

join-room

Typical data:

roomId
userId
draw

Used when a user completes a stroke.

draw

Typical data:

roomId
strokeId
points
color
width
eraser
draw-preview

Used for temporary real-time drawing updates.

draw-preview

Typical data:

roomId
strokeId
points
color
width
eraser
cursor-move

Used to send the current cursor position.

cursor-move

Typical data:

roomId
x
y
undo

Requests a global undo operation.

undo
redo

Requests a global redo operation.

redo
clear

Requests that the shared canvas be cleared.

clear
ping

Used for measuring network latency.

12. Server → Client Events

Important server-to-client events include:

room-joined
canvas-state
draw
draw-preview
cursor-move
user-count
user-joined
user-left
pong

The server broadcasts drawing and cursor information only to users in the relevant room.

13. Global Undo / Redo

Undo and Redo are implemented as global room operations rather than separate per-user histories.

The server maintains:

strokes[]
redo[]
Undo

The most recent committed stroke is removed from strokes and placed into redo.

Example:

Before Undo:

strokes:
A → B → C

redo:
empty

After Undo:

strokes:
A → B

redo:
C
Redo

The most recent item from redo is returned to strokes.

Example:

Before Redo:

strokes:
A → B

redo:
C

After Redo:

strokes:
A → B → C

redo:
empty

Because the server performs these operations, all users receive the same resulting canvas state.

14. Clear Operation

Clear is a global room operation.

When Clear is requested:

Current Strokes
      │
      ▼
Move to Redo History
      │
      ▼
Canvas Becomes Empty

The server then broadcasts the updated canvas state to all users in the room.

15. User Management

Each connected Socket.IO client has a user identity.

The server associates:

Socket ID
     ↓
User ID
     ↓
Room ID

The application tracks the number of connected users in each room.

The frontend displays the current online user count.

Remote users are visually represented through cursor indicators.

Each remote cursor receives a deterministic color based on the remote user's ID so that the same user maintains the same cursor color during the session.

16. Remote Cursor Flow

Cursor movement follows this flow:

User Mouse Movement
        │
        ▼
Canvas
        │
        ▼
Cursor Callback
        │
        ▼
Socket.IO Client
        │
        ▼
Server
        │
        ▼
Other Users in Room
        │
        ▼
Remote Cursor UI

Remote cursor indicators are temporary UI elements and are not part of the drawing history.

If a cursor does not send an update for a period of time, it is automatically hidden.

17. Eraser Implementation

The eraser is implemented using the Canvas compositing mode:

destination-out

Instead of drawing a white color over the existing image, the eraser removes pixels from the canvas.

This allows the eraser to work on the existing drawing without introducing another permanent color.

18. Conflict Resolution

Multiple users can draw simultaneously.

The server acts as the authority for committed strokes.

When multiple drawing operations arrive:

User A ──┐
         │
User B ──┼──► Server ──► Authoritative State
         │
User C ──┘

Committed operations are stored according to server processing order.

This provides deterministic ordering for operations received by the server.

Temporary drawing previews do not modify the authoritative history.

19. Handling Overlapping Strokes

Canvas drawing is rendered in stroke order.

If two users draw over the same area, the later committed stroke is rendered after the earlier stroke.

Therefore, the final visible result follows the committed operation order.

The application does not attempt pixel-level merging of strokes.

Instead, drawing operations are represented as independent stroke records:

Stroke A
   ↓
Stroke B
   ↓
Stroke C

This representation also makes global Undo and Redo possible without storing a separate bitmap for every operation.

20. Performance Strategy

Real-time drawing can generate a very high number of pointer events.

Sending every pointer event individually would create unnecessary network traffic.

The application therefore batches preview points.

Current strategy:

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

This reduces the number of WebSocket messages while keeping the drawing responsive.

21. Client-Side Responsiveness

The local user's drawing is rendered immediately on the client.

The client does not wait for server confirmation before displaying local drawing.

This provides client-side responsiveness:

Pointer Event
     │
     ├──────────────► Local Canvas
     │                   │
     │                   ▼
     │              Immediate Feedback
     │
     └──────────────► Server

The server later provides the authoritative state.

22. Network Latency

The application includes a ping/pong mechanism to estimate network latency.

The frontend can display the current latency value so that users can observe connection quality.

Latency measurement is separate from drawing data and does not modify canvas state.

23. Canvas Rendering Strategy

The application stores drawing operations as points rather than continuously sending image data.

For example:

Stroke
 ├── Point 1
 ├── Point 2
 ├── Point 3
 └── Point 4

The canvas can reconstruct the drawing by replaying the stored strokes.

This is more suitable for collaboration than repeatedly transmitting the entire canvas bitmap.

24. State Synchronization

When a user joins a room, the server sends the current authoritative canvas state.

New User
   │
   ▼
Join Room
   │
   ▼
Server
   │
   ▼
Current Canvas State
   │
   ▼
New User Canvas

This allows a newly connected user to see the existing drawing.

The same synchronization mechanism is used after operations such as:

Undo
Redo
Clear
25. Room Isolation

Drawing events are associated with a specific room.

Users in one room should only receive collaboration events from that room.

Conceptually:

Room A
├── User 1
├── User 2
└── User 3

Room B
├── User 4
└── User 5

Events from Room A are not broadcast to Room B.

This provides logical isolation between collaborative sessions.

26. Reliability Model

The server maintains the authoritative committed drawing history.

Clients may temporarily display previews, but previews are not considered permanent state until the server receives the completed stroke.

Therefore:

Preview
   =
Temporary

Draw
   =
Committed Operation

Canvas State
   =
Authoritative State

This separation helps reduce inconsistencies between users.

27. Current Limitations

The current implementation uses in-memory state.

Therefore:

Restarting the server removes active room state.
There is no database persistence yet.
Rooms are currently process-local.
There is no horizontal scaling across multiple server instances.
Conflict resolution is based on server operation order.
Very large drawings could eventually require additional optimization.
Authentication is not currently implemented.
28. Possible Future Improvements

Potential improvements include:

Persistent drawing storage
Database-backed rooms
Redis for distributed Socket.IO state
Multiple server instances
Authentication
Room passwords
Drawing history persistence
Mobile touch optimization
Performance metrics
Advanced stroke simplification
Adaptive preview batching
Reconnection recovery
Operational Transform
CRDT-based collaboration
29. Deployment Architecture

A production deployment can use the following structure:

                 Internet
                    │
                    ▼
          ┌───────────────────┐
          │      Browser      │
          │   Web Application │
          └─────────┬─────────┘
                    │
                HTTPS / WSS
                    │
                    ▼
          ┌───────────────────┐
          │   Node.js Server  │
          │     Socket.IO     │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Persistent Store  │
          │   Future Feature  │
          └───────────────────┘

The current application can run as a single Node.js process.

For horizontal scaling, Socket.IO would require shared coordination such as a Redis adapter.

30. Security Considerations

The current project is designed primarily as an internship demonstration.

For production deployment, the following should be added:

User authentication
Authorization for private rooms
Input validation
Rate limiting
WebSocket connection limits
Secure HTTPS/WSS configuration
Protection against malicious payloads
Maximum stroke size limits
Maximum number of points per event
Server-side room access validation
31. Testing Strategy

The application can be tested using multiple browser windows.

Recommended testing scenarios include:

Single User
Draw with brush
Change colors
Change stroke width
Use eraser
Undo
Redo
Clear
Multiple Users
Open two browser windows
Join the same room
Draw simultaneously
Verify real-time previews
Verify completed strokes
Verify remote cursors
Verify online user count
Test Undo from either user
Test Redo from either user
Test Clear from either user
Room Isolation
Open users in different rooms
Draw in one room
Verify the drawing does not appear in the other room
Reconnection
Reload a client
Rejoin the room
Verify that the existing committed canvas state is restored
32. Architecture Summary

The application follows a client-server collaborative architecture.

The main principles are:

The HTML5 Canvas handles drawing and rendering.
Socket.IO handles real-time communication.
The Node.js server maintains authoritative committed drawing state.
Drawing previews are sent while strokes are being created.
Completed strokes are committed to server history.
Undo and Redo are global room operations.
Cursor positions are synchronized separately from drawing data.
Online users are tracked per room.
Local drawing is rendered immediately for responsiveness.
Preview batching reduces high-frequency network traffic.
Room-based broadcasting prevents unrelated users from receiving events.
The architecture is modular and can be extended with persistence, authentication, scaling, and advanced collaboration algorithms.