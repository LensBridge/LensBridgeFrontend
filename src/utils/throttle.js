export const THROTTLE_BITS = {
  0: 'Undervoltage now',
  1: 'ARM frequency capped now',
  2: 'Currently throttled',
  3: 'Soft temperature limit active',
  16: 'Undervoltage occurred since boot',
  17: 'ARM frequency capping occurred',
  18: 'Throttling occurred',
  19: 'Soft temp limit occurred'
};

export function decodeThrottle(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('0x')) return [];
  const n = parseInt(hex, 16);
  return Object.entries(THROTTLE_BITS)
    .filter(([bit]) => n & (1 << Number(bit)))
    .map(([bit, label]) => ({ bit: Number(bit), label, current: Number(bit) < 16 }));
}

