import crypto from 'crypto';
import { Response } from 'express';

interface ViewerPresence {
  id: string;
  animal: string;
  name: string;
  color: string;
}

const ANIMALS = [
  { animal: '🐻', name: 'Bear' },
  { animal: '🦊', name: 'Fox' },
  { animal: '🐼', name: 'Panda' },
  { animal: '🐨', name: 'Koala' },
  { animal: '🦁', name: 'Lion' },
  { animal: '🐯', name: 'Tiger' },
  { animal: '🐮', name: 'Cow' },
  { animal: '🐷', name: 'Pig' },
  { animal: '🐸', name: 'Frog' },
  { animal: '🐵', name: 'Monkey' },
  { animal: '🐶', name: 'Dog' },
  { animal: '🐱', name: 'Cat' },
  { animal: '🐰', name: 'Rabbit' },
  { animal: '🦄', name: 'Unicorn' },
  { animal: '🐝', name: 'Bee' },
  { animal: '🦋', name: 'Butterfly' },
  { animal: '🐢', name: 'Turtle' },
  { animal: '🐙', name: 'Octopus' },
  { animal: '🦈', name: 'Shark' },
  { animal: '🐬', name: 'Dolphin' },
];

const COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635', '#34D399',
  '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6', '#E879F9',
  '#FB7185', '#FDBA74', '#FDE047', '#86EFAC', '#5EEAD4',
  '#7DD3FC', '#C4B5FD', '#F0ABFC', '#FDA4AF', '#67E8F9',
];

interface SheetRoom {
  viewers: Map<string, { res: Response; viewer: ViewerPresence }>;
  editors: Map<string, Response>;
}

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

class PresenceManager {
  private rooms = new Map<string, SheetRoom>();
  private heartbeatInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 30_000);
  }

  private getOrCreateRoom(sheetId: string): SheetRoom {
    let room = this.rooms.get(sheetId);
    if (!room) {
      room = { viewers: new Map(), editors: new Map() };
      this.rooms.set(sheetId, room);
    }
    return room;
  }

  private cleanupRoom(sheetId: string) {
    const room = this.rooms.get(sheetId);
    if (room && room.viewers.size === 0 && room.editors.size === 0) {
      this.rooms.delete(sheetId);
    }
  }

  private notifyEditors(sheetId: string) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    const viewers = this.getViewers(sheetId);
    for (const [, res] of room.editors) {
      sendSSE(res, 'presence', { viewers });
    }
  }

  addViewer(sheetId: string, res: Response): ViewerPresence {
    const room = this.getOrCreateRoom(sheetId);
    const pick = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const viewer: ViewerPresence = {
      id: crypto.randomUUID(),
      animal: pick.animal,
      name: pick.name,
      color,
    };
    room.viewers.set(viewer.id, { res, viewer });
    this.notifyEditors(sheetId);
    return viewer;
  }

  removeViewer(sheetId: string, viewerId: string) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    room.viewers.delete(viewerId);
    this.notifyEditors(sheetId);
    this.cleanupRoom(sheetId);
  }

  addEditor(sheetId: string, res: Response): string {
    const room = this.getOrCreateRoom(sheetId);
    const editorId = crypto.randomUUID();
    room.editors.set(editorId, res);
    // Send current viewers immediately
    sendSSE(res, 'presence', { viewers: this.getViewers(sheetId) });
    return editorId;
  }

  removeEditor(sheetId: string, editorId: string) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    room.editors.delete(editorId);
    this.cleanupRoom(sheetId);
  }

  notifyViewers(sheetId: string, sheet: unknown) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    for (const [, { res }] of room.viewers) {
      sendSSE(res, 'sheet-update', sheet);
    }
  }

  disconnectAllViewers(sheetId: string) {
    const room = this.rooms.get(sheetId);
    if (!room) return;
    for (const [, { res }] of room.viewers) {
      res.end();
    }
    room.viewers.clear();
    this.notifyEditors(sheetId);
    this.cleanupRoom(sheetId);
  }

  getViewers(sheetId: string): ViewerPresence[] {
    const room = this.rooms.get(sheetId);
    if (!room) return [];
    return Array.from(room.viewers.values()).map(v => v.viewer);
  }

  private heartbeat() {
    for (const [, room] of this.rooms) {
      for (const [, { res }] of room.viewers) {
        res.write(': heartbeat\n\n');
      }
      for (const [, res] of room.editors) {
        res.write(': heartbeat\n\n');
      }
    }
  }
}

export const presenceManager = new PresenceManager();
