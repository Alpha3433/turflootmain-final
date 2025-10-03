import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema } from "@colyseus/schema";
export declare const MERGE_ATTRACTION_RATE = 0.02;
export declare const MERGE_ATTRACTION_MAX = 120;
export declare const MERGE_ATTRACTION_SPACING = 0.05;
export declare class Player extends Schema {
    name: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    mass: number;
    radius: number;
    color: string;
    score: number;
    lastSeq: number;
    alive: boolean;
    ownerSessionId: string;
    isSplitPiece: boolean;
    splitTime: number;
    targetX: number;
    targetY: number;
    momentumX: number;
    momentumY: number;
    noMergeUntil: number;
    lastSplitTime: number;
}
export declare class Coin extends Schema {
    x: number;
    y: number;
    value: number;
    radius: number;
    color: string;
}
export declare class Virus extends Schema {
    x: number;
    y: number;
    radius: number;
    color: string;
}
export declare class GameState extends Schema {
    players: MapSchema<Player, string>;
    coins: MapSchema<Coin, string>;
    viruses: MapSchema<Virus, string>;
    worldSize: number;
    timestamp: number;
}
export declare class ArenaRoom extends Room<GameState> {
    maxClients: number;
    worldSize: number;
    maxCoins: number;
    maxViruses: number;
    tickRate: number;
    onCreate(): void;
    onJoin(client: Client, options?: any): void;
    handleInput(client: Client, message: any): void;
    handleSplit(client: Client, message: any): void;
    onLeave(client: Client, consented?: boolean): void;
    update(): void;
    checkCollisions(player: Player, sessionId: string): void;
    getOwnedCells(ownerSessionId: string): Player[];
    checkCoinCollisions(player: Player): void;
    checkVirusCollisions(player: Player): void;
    checkPlayerCollisions(player: Player, sessionId: string): void;
    countOwnedPieces(ownerSessionId: string): number;
    applyMomentum(player: Player, deltaTime: number): void;
    applySplitAttraction(cells: Player[], deltaTime: number): void;
    handleSplitMerging(currentTime: number): void;
    areSameOwner(player: Player, sessionId: string, otherPlayer: Player, otherSessionId: string): boolean;
    calculateRadius(mass: number): number;
    respawnPlayer(player: Player): void;
    generateCoins(): void;
    generateViruses(): void;
    spawnCoin(): void;
    spawnVirus(): void;
    generatePlayerColor(): string;
    onDispose(): void;
}
//# sourceMappingURL=ArenaRoom.d.ts.map