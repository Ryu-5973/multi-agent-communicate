import type { Room } from "@multi-agent-communicate/protocol";

export class RoomService {
  constructor(private readonly rooms: Map<string, Room>) {}

  create(room: Room): Room {
    this.rooms.set(room.id, room);
    return room;
  }

  list(): Room[] {
    return [...this.rooms.values()];
  }

  get(id: string): Room | null {
    return this.rooms.get(id) ?? null;
  }

  join(roomId: string, agentId: string): Room | null {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    if (!room.participants.includes(agentId)) {
      room.participants.push(agentId);
    }

    this.rooms.set(roomId, room);
    return room;
  }
}
