import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema } from "@colyseus/schema";
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
    spawnProtection: boolean;
    spawnProtectionEndTime: number;
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
    private readonly spawnProtectionDurationMs;
    private spawnProtectionEndTimes;
    private getRandomPlayablePosition;
    onCreate(): void;
    onJoin(client: Client, options?: any): void;
    handleInput(client: Client, message: any): void;
    onLeave(client: Client, consented?: boolean): void;
    update(): void;
    checkCollisions(player: Player, sessionId: string): void;
    checkCoinCollisions(player: Player): void;
    checkVirusCollisions(player: Player): void;
    checkPlayerCollisions(player: Player, sessionId: string): void;
    respawnPlayer(player: Player, sessionId: string): void;
    generateCoins(): void;
    generateViruses(): void;
    spawnCoin(): void;
    spawnVirus(): void;
    generatePlayerColor(): string;
    onDispose(): void;
}
//# sourceMappingURL=ArenaRoom.d.ts.map