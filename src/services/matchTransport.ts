// Network layer for a running match. Each client publishes the players it owns (itself, plus
// bots on the host) at ~10 Hz to Realtime Database, and listens for everyone else.
import {
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from 'firebase/database';
import type { Role } from '../types';
import type { NetPlayerState, OutgoingBuff } from '../engine/GameEngine';
import { realtimeDb } from './firebase';

export interface MatchTransport {
  readonly networked: boolean;
  publish(states: Record<string, NetPlayerState>): void;
  sendBuff(b: OutgoingBuff): void;
  announceEnd(winner: Role): void;
  onState(cb: (id: string, s: NetPlayerState) => void): void;
  onPlayerLeft(cb: (id: string) => void): void;
  /** Buffs addressed to any of `ids` (this player plus owned bots). */
  onBuff(ids: string[], cb: (b: OutgoingBuff) => void): void;
  onEnd(cb: (winner: Role) => void): void;
  serverNow(): number;
  close(): void;
}

/** Single-device match against bots: nothing goes over the network. */
export class LocalTransport implements MatchTransport {
  readonly networked = false;
  publish() {}
  sendBuff() {}
  announceEnd() {}
  onState() {}
  onPlayerLeft() {}
  onBuff() {}
  onEnd() {}
  serverNow() {
    return Date.now();
  }
  close() {}
}

export class FirebaseTransport implements MatchTransport {
  readonly networked = true;
  private unsubs: (() => void)[] = [];
  private offset = 0;
  private roomPath: string;
  private uid: string;

  constructor(roomCode: string, uid: string) {
    this.roomPath = `rooms/${roomCode}`;
    this.uid = uid;
    const db = realtimeDb();
    this.unsubs.push(onValue(ref(db, '.info/serverTimeOffset'), (s) => (this.offset = s.val() ?? 0)));
    onDisconnect(ref(db, `${this.roomPath}/live/${uid}`)).remove();
    onDisconnect(ref(db, `${this.roomPath}/players/${uid}`)).remove();
  }

  publish(states: Record<string, NetPlayerState>) {
    const updates: Record<string, NetPlayerState> = {};
    for (const [id, s] of Object.entries(states)) updates[id] = s;
    update(ref(realtimeDb(), `${this.roomPath}/live`), JSON.parse(JSON.stringify(updates))).catch(() => {});
  }

  sendBuff(b: OutgoingBuff) {
    push(ref(realtimeDb(), `${this.roomPath}/buffs/${b.targetId}`), b).catch(() => {});
  }

  announceEnd(winner: Role) {
    set(ref(realtimeDb(), `${this.roomPath}/result`), { winner, at: this.serverNow() }).catch(() => {});
    update(ref(realtimeDb(), this.roomPath), { status: 'ended' }).catch(() => {});
  }

  onState(cb: (id: string, s: NetPlayerState) => void) {
    const r = ref(realtimeDb(), `${this.roomPath}/live`);
    const handler = (snap: { key: string | null; val(): unknown }) => {
      if (snap.key && snap.key !== this.uid) cb(snap.key, snap.val() as NetPlayerState);
    };
    this.unsubs.push(onChildAdded(r, handler), onChildChanged(r, handler));
  }

  onPlayerLeft(cb: (id: string) => void) {
    this.unsubs.push(
      onChildRemoved(ref(realtimeDb(), `${this.roomPath}/players`), (snap) => {
        if (snap.key) cb(snap.key);
      }),
    );
  }

  onBuff(ids: string[], cb: (b: OutgoingBuff) => void) {
    for (const id of ids) {
      const r = ref(realtimeDb(), `${this.roomPath}/buffs/${id}`);
      this.unsubs.push(
        onChildAdded(r, (snap) => {
          cb(snap.val() as OutgoingBuff);
          remove(snap.ref).catch(() => {});
        }),
      );
    }
  }

  onEnd(cb: (winner: Role) => void) {
    this.unsubs.push(
      onValue(ref(realtimeDb(), `${this.roomPath}/result`), (snap) => {
        const v = snap.val() as { winner: Role } | null;
        if (v?.winner) cb(v.winner);
      }),
    );
  }

  serverNow() {
    return Date.now() + this.offset;
  }

  close() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    remove(ref(realtimeDb(), `${this.roomPath}/live/${this.uid}`)).catch(() => {});
  }
}
