import { Room, Client } from "colyseus.js"; 

export function requestJoinOptions(this: Client, i: number) {
  return { 
    playerName: `LoadTestPlayer${i}`,
    privyUserId: `loadtest_${i}` 
  };
}

export function onJoin(this: Room) {
  console.log(this.sessionId, "joined.");

  // Send periodic input messages to test server load
  setInterval(() => {
    this.send("input", {
      seq: Date.now(),
      dx: (Math.random() - 0.5) * 2, // Random direction -1 to 1
      dy: (Math.random() - 0.5) * 2
    });
  }, 100); // Send input every 100ms (10 FPS)
}

export function onLeave(this: Room) {
  console.log(this.sessionId, "left.");
}

export function onError(this: Room, err: any) {
  console.log(this.sessionId, "!! ERROR !!", err.message);
}

export function onStateChange(this: Room, state: any) {
  console.log(this.sessionId, "new state:", state);
}