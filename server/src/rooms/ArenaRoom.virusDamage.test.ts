import assert from "assert";
import { ArenaRoom, GameState, Player, Virus } from "./ArenaRoom";

const room = new ArenaRoom();
room.setState(new GameState());

const virus = new Virus();
virus.radius = 60;
virus.x = 150;
virus.y = 150;
room.state.viruses.set("virus", virus);

const owner = new Player();
owner.name = "Owner";
owner.alive = true;
owner.mass = 30;
owner.radius = room.calculateRadius(owner.mass);
owner.x = 150;
owner.y = 150;
owner.noMergeUntil = 0;
room.state.players.set("owner", owner);

const splitPiece = new Player();
splitPiece.name = "Split";
splitPiece.alive = true;
splitPiece.mass = 20;
splitPiece.radius = room.calculateRadius(splitPiece.mass);
splitPiece.x = 150;
splitPiece.y = 150;
splitPiece.ownerSessionId = "owner";
splitPiece.isSplitPiece = true;
splitPiece.noMergeUntil = 0;
room.state.players.set("split", splitPiece);

const originalSplitMass = splitPiece.mass;
room.checkVirusCollisions(splitPiece);

assert.ok(
  splitPiece.mass < originalSplitMass,
  `Split piece should lose mass when hitting virus (${splitPiece.mass} vs ${originalSplitMass})`
);
assert.ok(
  Math.abs(splitPiece.mass - originalSplitMass * 0.8) < 1e-6,
  `Split piece mass should be reduced by 20% (${splitPiece.mass} vs ${originalSplitMass * 0.8})`
);
assert.strictEqual(
  splitPiece.radius,
  room.calculateRadius(splitPiece.mass),
  "Split piece radius should be recalculated from new mass"
);

const splitMassAfterVirus = splitPiece.mass;
const ownerMassBeforeMerge = owner.mass;
room.handleSplitMerging(Date.now());

assert.ok(
  !room.state.players.has("split"),
  "Split piece should merge back into owner when overlapping and merge timer elapsed"
);
assert.ok(
  Math.abs(owner.mass - (ownerMassBeforeMerge + splitMassAfterVirus)) < 1e-6,
  `Owner mass after merge (${owner.mass}) should include reduced split mass (${splitMassAfterVirus})`
);
assert.strictEqual(
  owner.radius,
  room.calculateRadius(owner.mass),
  "Owner radius should be updated after merging the reduced mass"
);

console.log("✅ Virus damage regression test passed");

const secondaryRoom = new ArenaRoom();
secondaryRoom.setState(new GameState());

const smallPlayer = new Player();
smallPlayer.name = "BelowSpawn";
smallPlayer.alive = true;
smallPlayer.mass = 20;
smallPlayer.radius = secondaryRoom.calculateRadius(smallPlayer.mass);
smallPlayer.x = 100;
smallPlayer.y = 100;
secondaryRoom.state.players.set("small", smallPlayer);

const secondaryVirus = new Virus();
secondaryVirus.radius = 60;
secondaryVirus.x = 100;
secondaryVirus.y = 100;
secondaryRoom.state.viruses.set("v", secondaryVirus);

const originalSmallMass = smallPlayer.mass;
secondaryRoom.checkVirusCollisions(smallPlayer);

assert.ok(
  smallPlayer.mass < originalSmallMass,
  `Non-split piece below spawn mass should still lose mass (${smallPlayer.mass} vs ${originalSmallMass})`
);
assert.ok(
  Math.abs(smallPlayer.mass - originalSmallMass * 0.8) < 1e-6,
  `Non-split piece mass should be reduced by 20% (${smallPlayer.mass} vs ${originalSmallMass * 0.8})`
);

console.log("✅ Below-spawn virus damage regression test passed");
