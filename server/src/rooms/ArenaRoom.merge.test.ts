import assert from "assert";
import {
  ArenaRoom,
  GameState,
  Player,
  MERGE_ATTRACTION_MAX,
  MERGE_ATTRACTION_RATE,
  MERGE_ATTRACTION_SPACING
} from "./ArenaRoom";

const room = new ArenaRoom();
room.setState(new GameState());
room.worldSize = 1200;
room.tickRate = 20;

const deltaTime = 1 / 60; // mirrors ArenaRoom's fixed 60 Hz simulation timestep
const mergeDelay = Date.now() + 100000;

const owner = new Player();
owner.alive = true;
owner.mass = 100;
owner.radius = room.calculateRadius(owner.mass);
owner.ownerSessionId = "owner";
owner.isSplitPiece = false;
owner.x = 400;
owner.y = 0;
owner.vx = 0;
owner.vy = 0;
owner.momentumX = 0;
owner.momentumY = 0;
owner.noMergeUntil = mergeDelay;

const nearSplit = new Player();
nearSplit.alive = true;
nearSplit.mass = 50;
nearSplit.radius = room.calculateRadius(nearSplit.mass);
nearSplit.ownerSessionId = "owner";
nearSplit.isSplitPiece = true;
nearSplit.x = 590;
nearSplit.y = 0;
nearSplit.vx = 0;
nearSplit.vy = 0;
nearSplit.momentumX = 0;
nearSplit.momentumY = 0;
nearSplit.noMergeUntil = mergeDelay;

const farSplit = new Player();
farSplit.alive = true;
farSplit.mass = 50;
farSplit.radius = room.calculateRadius(farSplit.mass);
farSplit.ownerSessionId = "owner";
farSplit.isSplitPiece = true;
farSplit.x = 920;
farSplit.y = 0;
farSplit.vx = 0;
farSplit.vy = 0;
farSplit.momentumX = 0;
farSplit.momentumY = 0;
farSplit.noMergeUntil = mergeDelay;

room.state.players.set("owner", owner);
room.state.players.set("near", nearSplit);
room.state.players.set("far", farSplit);

const ownedCells = room.getOwnedCells(owner.ownerSessionId);
room.applySplitAttraction(ownedCells, deltaTime);

const totalMass = owner.mass + nearSplit.mass + farSplit.mass;
const centroidX = (
  owner.x * owner.mass +
  nearSplit.x * nearSplit.mass +
  farSplit.x * farSplit.mass
) / totalMass;

const computeExpectedMomentum = (cell: Player) => {
  const dx = centroidX - cell.x;
  const distance = Math.abs(dx);
  const spacing = cell.radius * MERGE_ATTRACTION_SPACING;
  const distanceAfterSpacing = Math.max(0, distance - spacing);

  if (distanceAfterSpacing === 0) {
    return 0;
  }

  const rawAttraction = distanceAfterSpacing * totalMass * MERGE_ATTRACTION_RATE;
  const capped = Math.min(MERGE_ATTRACTION_MAX, rawAttraction);
  const acceleration = capped * deltaTime;
  const direction = Math.sign(dx);

  return acceleration * direction;
};

const ownerExpected = computeExpectedMomentum(owner);
const nearExpected = computeExpectedMomentum(nearSplit);
const farExpected = computeExpectedMomentum(farSplit);

assert.ok(owner.momentumX > 0, "Owner should gain positive momentum toward centroid");
assert.ok(nearSplit.momentumX < 0, "Near split should gain negative momentum toward centroid");
assert.ok(farSplit.momentumX < 0, "Far split should gain negative momentum toward centroid");

assert.ok(
  Math.abs(owner.momentumX - ownerExpected) < 1e-6,
  `Owner momentum ${owner.momentumX} should match expected ${ownerExpected}`
);

assert.ok(
  Math.abs(nearSplit.momentumX - nearExpected) < 1e-6,
  `Near split momentum ${nearSplit.momentumX} should match expected ${nearExpected}`
);

assert.ok(
  Math.abs(farSplit.momentumX - farExpected) < 1e-6,
  `Far split momentum ${farSplit.momentumX} should match expected ${farExpected}`
);

assert.ok(
  Math.abs(farSplit.momentumX) > Math.abs(nearSplit.momentumX),
  "Farther fragments should accelerate more strongly until the cap is reached"
);

assert.ok(
  Math.abs(Math.abs(farSplit.momentumX) - MERGE_ATTRACTION_MAX * deltaTime) < 1e-6,
  "Far fragment should be clamped at the merge attraction cap"
);

console.log("✅ Merge attraction regression test passed");
