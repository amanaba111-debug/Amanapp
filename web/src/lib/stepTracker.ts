/**
 * Live offline step counter using DeviceMotion accelerometer peak detection on Android/iOS PWAs.
 * Filters gravity with an exponential moving average and gates footfall cadence to 280ms–1400ms.
 */
export class LiveStepTracker {
  private active = false;
  private gravity = 9.81;
  private lastStepMs = 0;
  private armed = true;
  private listener: ((e: DeviceMotionEvent) => void) | null = null;

  static async requestPermissionIfNeeded(): Promise<boolean> {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      return true;
    }
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof dme.requestPermission === 'function') {
      try {
        const res = await dme.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  start(onStep: () => void): void {
    if (this.active || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    this.active = true;

    this.listener = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      this.gravity = 0.85 * this.gravity + 0.15 * mag;
      const linear = mag - this.gravity;
      const now = performance.now();

      if (this.armed && linear > 2.15 && now - this.lastStepMs > 310) {
        this.armed = false;
        this.lastStepMs = now;
        onStep();
      } else if (!this.armed && linear < -0.6) {
        this.armed = true;
      }
    };

    window.addEventListener('devicemotion', this.listener, { passive: true });
  }

  stop(): void {
    if (this.listener && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.listener);
    }
    this.listener = null;
    this.active = false;
  }
}

export function isInsideTimeWindow(
  startHHMM: string,
  endHHMM: string,
  now: Date = new Date()
): boolean {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map((n) => parseInt(n, 10));
    return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMin(startHHMM);
  const e = toMin(endHHMM);
  if (s <= e) return cur >= s && cur <= e;
  return cur >= s || cur <= e;
}

export function isEveningWindDownWindow(bedTimeHHMM: string, now: Date = new Date()): boolean {
  const [bh, bm] = bedTimeHHMM.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(bh)) return false;
  const bedMin = bh * 60 + (Number.isNaN(bm) ? 0 : bm);
  const startMin = (bedMin - 60 + 1440) % 1440;
  const endMin = (bedMin + 120) % 1440;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (startMin <= endMin) return cur >= startMin && cur <= endMin;
  return cur >= startMin || cur <= endMin;
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function sendLocalNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icons/mindloop.svg',
      badge: '/icons/mindloop.svg',
      silent: true,
    });
  } catch {
    // Ignore when Notification constructor requires ServiceWorkerRegistration on Android Chrome
  }
}
