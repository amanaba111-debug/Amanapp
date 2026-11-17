function pulse(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore on browsers that block vibration outside user gestures
  }
}

export const haptics = {
  tap: () => pulse(12),
  water: () => pulse([14, 35, 22]),
  flip: () => pulse(16),
  inhale: () => pulse([28, 70, 38]),
  hold: () => pulse(22),
  exhale: () => pulse([45, 90, 25]),
  longPressUnlock: () => pulse([20, 40, 55]),
  complete: () => pulse([30, 55, 40, 55, 70]),
  stop: () => pulse(0),
};
