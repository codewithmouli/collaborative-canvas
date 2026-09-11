const rooms = new Map<
  string,
  Set<string>
>();

export function addUserToRoom(
  roomId: string,
  userId: string
): void {

  let users =
    rooms.get(roomId);

  if (!users) {

    users = new Set<string>();

    rooms.set(
      roomId,
      users
    );
  }

  users.add(userId);
}

export function removeUserFromRoom(
  roomId: string,
  userId: string
): void {

  const users =
    rooms.get(roomId);

  if (!users) {
    return;
  }

  users.delete(userId);

  if (users.size === 0) {
    rooms.delete(roomId);
  }
}

export function getRoomUserCount(
  roomId: string
): number {

  return (
    rooms.get(roomId)?.size ?? 0
  );
}

export function removeUserEverywhere(
  userId: string
): string[] {

  const affectedRooms: string[] = [];

  for (
    const [
      roomId,
      users
    ] of rooms.entries()
  ) {

    if (users.has(userId)) {

      users.delete(userId);

      affectedRooms.push(
        roomId
      );
    }

    if (users.size === 0) {
      rooms.delete(roomId);
    }
  }

  return affectedRooms;
}