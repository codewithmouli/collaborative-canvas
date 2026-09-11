import type {
  Server,
  Socket
} from "socket.io";

import {
  addUserToRoom,
  removeUserFromRoom,
  getRoomUserCount,
  removeUserEverywhere
} from "./rooms";

import {
  addStroke,
  undo,
  redo,
  clear,
  getStrokes
} from "./drawing-state";

interface JoinRoomData {
  roomId: string;
  userId: string;
}

interface DrawData {
  roomId: string;
  points: {
    x: number;
    y: number;
  }[];
  color: string;
  width: number;
  eraser: boolean;
}

interface RoomData {
  roomId: string;
}

interface CursorData {
  roomId: string;
  x: number;
  y: number;
}

const socketRooms =
  new Map<
    string,
    string
  >();

const socketUsers =
  new Map<
    string,
    string
  >();

export function registerWebsocketHandlers(
  io: Server
): void {

  io.on(
    "connection",
    (socket: Socket) => {

      console.log(
        "Client connected:",
        socket.id
      );

      // =================================================
      // JOIN ROOM
      // =================================================

      socket.on(
        "join-room",
        (
          data: JoinRoomData
        ) => {

          const {
            roomId,
            userId
          } = data;

          console.log(
            `User ${userId} joining ${roomId}`
          );

          const oldRoom =
            socketRooms.get(
              socket.id
            );

          if (oldRoom) {

            socket.leave(
              oldRoom
            );

            const oldUser =
              socketUsers.get(
                socket.id
              );

            if (oldUser) {

              removeUserFromRoom(
                oldRoom,
                oldUser
              );

              io.to(oldRoom).emit(
                "user-count",
                {
                  count:
                    getRoomUserCount(
                      oldRoom
                    )
                }
              );
            }
          }

          socket.join(
            roomId
          );

          socketRooms.set(
            socket.id,
            roomId
          );

          socketUsers.set(
            socket.id,
            userId
          );

          addUserToRoom(
            roomId,
            userId
          );

          socket.emit(
            "room-joined",
            {
              roomId,
              userId
            }
          );

          socket.emit(
            "canvas-state",
            {
              strokes:
                getStrokes(roomId)
            }
          );

          io.to(roomId).emit(
            "user-count",
            {
              count:
                getRoomUserCount(
                  roomId
                )
            }
          );

          socket.to(roomId).emit(
            "user-joined",
            {
              userId
            }
          );
        }
      );

      // =================================================
      // DRAW
      // =================================================

      socket.on(
        "draw",
        (
          data: DrawData
        ) => {

          const {
            roomId,
            points,
            color,
            width,
            eraser
          } = data;

          const userId =
            socketUsers.get(
              socket.id
            );

          if (!userId) {
            return;
          }

          if (!Array.isArray(points)) {
            return;
          }

          if (points.length === 0) {
            return;
          }

          const stroke =
            addStroke(
              roomId,
              userId,
              points,
              color,
              width,
              eraser
            );

          socket
            .to(roomId)
            .emit(
              "draw",
              {
                userId,
                points:
                  stroke.points,
                color:
                  stroke.color,
                width:
                  stroke.width,
                eraser:
                  stroke.eraser
              }
            );
        }
      );

      // =================================================
      // UNDO
      // =================================================

      socket.on(
        "undo",
        (
          data: RoomData
        ) => {

          const {
            roomId
          } = data;

          const removed =
            undo(roomId);

          if (!removed) {
            return;
          }

          io.to(roomId).emit(
            "canvas-state",
            {
              strokes:
                getStrokes(roomId)
            }
          );
        }
      );

      // =================================================
      // REDO
      // =================================================

      socket.on(
        "redo",
        (
          data: RoomData
        ) => {

          const {
            roomId
          } = data;

          const restored =
            redo(roomId);

          if (!restored) {
            return;
          }

          io.to(roomId).emit(
            "canvas-state",
            {
              strokes:
                getStrokes(roomId)
            }
          );
        }
      );

      // =================================================
      // CLEAR
      // =================================================

      socket.on(
        "clear",
        (
          data: RoomData
        ) => {

          const {
            roomId
          } = data;

          clear(roomId);

          io.to(roomId).emit(
            "canvas-state",
            {
              strokes: []
            }
          );
        }
      );

      // =================================================
      // CURSOR
      // =================================================

      socket.on(
        "cursor-move",
        (
          data: CursorData
        ) => {

          const {
            roomId,
            x,
            y
          } = data;

          const userId =
            socketUsers.get(
              socket.id
            );

          if (!userId) {
            return;
          }

          socket
            .to(roomId)
            .emit(
              "cursor-move",
              {
                userId,
                x,
                y
              }
            );
        }
      );

      // =================================================
      // LATENCY
      // =================================================

      socket.on(
        "ping-check",
        () => {

          socket.emit(
            "pong-check"
          );
        }
      );

      // =================================================
      // DISCONNECT
      // =================================================

      socket.on(
        "disconnect",
        () => {

          console.log(
            "Client disconnected:",
            socket.id
          );

          const roomId =
            socketRooms.get(
              socket.id
            );

          const userId =
            socketUsers.get(
              socket.id
            );

          if (
            roomId &&
            userId
          ) {

            removeUserFromRoom(
              roomId,
              userId
            );

            io.to(roomId).emit(
              "user-count",
              {
                count:
                  getRoomUserCount(
                    roomId
                  )
              }
            );
          }

          socketRooms.delete(
            socket.id
          );

          socketUsers.delete(
            socket.id
          );
        }
      );
    }
  );
}