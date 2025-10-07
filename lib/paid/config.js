import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DEFAULT_JOIN_TICKET_TTL_SECONDS, MIN_JOIN_TICKET_TTL_SECONDS, MAX_JOIN_TICKET_TTL_SECONDS } from './constants.js';

const DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS = Number(process.env.PAID_ROOMS_PRIORITY_FEE_MICRO_LAMPORTS || 5000);
const DEFAULT_SEAT_HOLD_MS = Number(process.env.PAID_ROOMS_SEAT_HOLD_MS || 60_000);

const FALLBACK_ROOMS = [
  {
    id: 'practice',
    name: 'Practice Grounds',
    entryLamports: 0,
    feeBps: 0,
    currencyDisplay: 'SOL'
  },
  {
    id: 'brawl',
    name: 'Brawl Bronze',
    entryLamports: 5_000_000, // 0.005 SOL
    feeBps: 800,
    currencyDisplay: 'SOL'
  },
  {
    id: 'showdown',
    name: 'Showdown Silver',
    entryLamports: 20_000_000, // 0.02 SOL
    feeBps: 900,
    currencyDisplay: 'SOL'
  }
];

function parseRoomConfigFromEnv() {
  const raw = process.env.PAID_ROOMS_CONFIG;
  if (!raw) {
    return FALLBACK_ROOMS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('⚠️ PAID_ROOMS_CONFIG must be an array of room configs');
      return FALLBACK_ROOMS;
    }

    return parsed.map((room) => ({
      ...room,
      entryLamports: Number(room.entryLamports ?? 0),
      feeBps: Number(room.feeBps ?? 0),
      currencyDisplay: room.currencyDisplay || 'SOL',
      priorityFeeMicroLamports: Number(room.priorityFeeMicroLamports || DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS)
    }));
  } catch (error) {
    console.error('❌ Failed to parse PAID_ROOMS_CONFIG:', error);
    return FALLBACK_ROOMS;
  }
}

const ROOM_CONFIGS = parseRoomConfigFromEnv();

const FEE_WALLET = process.env.PAID_ROOMS_FEE_WALLET || process.env.NEXT_PUBLIC_FEE_WALLET || process.env.PLATFORM_FEE_WALLET;

if (!FEE_WALLET) {
  console.warn('⚠️ No PAID_ROOMS_FEE_WALLET configured - using fallback wallet for development only');
}

function normalizeRoomConfig(room) {
  if (!room) return null;
  return {
    id: room.id,
    name: room.name,
    entryLamports: Number(room.entryLamports || 0),
    feeBps: Number(room.feeBps || 0),
    currencyDisplay: room.currencyDisplay || 'SOL',
    recipient: room.recipient || FEE_WALLET,
    priorityFeeMicroLamports: Number(room.priorityFeeMicroLamports || DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS)
  };
}

export function getRoomConfig(roomId) {
  const room = ROOM_CONFIGS.find((cfg) => cfg.id === roomId);
  return normalizeRoomConfig(room);
}

export function getAllRoomConfigs() {
  return ROOM_CONFIGS.map((cfg) => normalizeRoomConfig(cfg)).filter(Boolean);
}

export function getRoomQuote(roomId) {
  const config = getRoomConfig(roomId);
  if (!config) {
    return null;
  }

  if (!config.recipient) {
    throw new Error('Paid room recipient wallet not configured');
  }

  const feeLamports = Math.ceil((config.entryLamports * config.feeBps) / 10_000);
  const totalLamports = config.entryLamports + feeLamports;

  return {
    roomId: config.id,
    entryLamports: config.entryLamports,
    feeLamports,
    totalLamports,
    feeBps: config.feeBps,
    recipient: new PublicKey(config.recipient).toBase58(),
    currencyDisplay: config.currencyDisplay,
    priorityFeeMicroLamports: config.priorityFeeMicroLamports
  };
}

export function getSeatHoldMilliseconds() {
  return DEFAULT_SEAT_HOLD_MS;
}

export function getJoinTicketTtlSeconds() {
  const configured = Number(process.env.PAID_ROOMS_JOIN_TICKET_TTL_SECONDS || DEFAULT_JOIN_TICKET_TTL_SECONDS);
  if (Number.isNaN(configured)) {
    return DEFAULT_JOIN_TICKET_TTL_SECONDS;
  }
  return Math.min(Math.max(configured, MIN_JOIN_TICKET_TTL_SECONDS), MAX_JOIN_TICKET_TTL_SECONDS);
}

export function getPriorityFeeMicroLamports(roomId) {
  const config = getRoomConfig(roomId);
  return config?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
}

export function lamportsToSol(lamports) {
  return lamports / LAMPORTS_PER_SOL;
}

export const memoIssuer = 'turfloot-paid-rooms';
