declare global {
  interface Window {
    tracker?: Tracker;
  }
}

const URI = "http://localhost:8888/track";
const EVENTS_TRESHOLD = 3;
const THROTTLE_MS = 1000;
const RESTORE_TIMEOUT = 1000;

interface Tracker {
  q: TrackEvent[];
  track(event: string, ...tags: string[]): void;
}

type TrackEvent = {
  event: string;
  tags: string[];
  url: string;
  title: string;
  ts: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ActivityTracker implements Tracker {
  q: TrackEvent[] = [];
  sending = false;
  userId: string | null = null;
  config: string | null = null;
  timer: ReturnType<typeof setTimeout> | null = null;

  constructor(proxy?: { q: TrackEvent[] }) {
    if (proxy && proxy.q && Array.isArray(proxy.q)) {
      proxy.q.forEach((event) => {
        this.track(event.event, ...event.tags);
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.onPageHide();
      }
    });
  }

  private getTitle() {
    return document.title;
  }

  private getUrl() {
    return window.location.href;
  }

  track(event: string, ...tags: string[]): void {
    if (event === "init") {
      this.userId = tags[0];
      this.config = tags[1];
      return;
    }
    this.q.push({
      event,
      tags,
      ts: Date.now(),
      url: this.getUrl(),
      title: this.getTitle(),
    });
    this.processQueue();
  }

  processQueue() {
    if (this.q.length >= EVENTS_TRESHOLD) {
      this.clearTimer();
      this.send();
    } else {
      this.schedule();
    }
  }

  schedule() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.send();
    }, THROTTLE_MS);
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async send() {
    if (this.sending || !this.q.length) return;
    const events = [...this.q];
    this.q = [];
    this.sending = true;

    try {
      await this.sendToBackend(events);
    } catch (e) {
      await sleep(RESTORE_TIMEOUT);
      this.q = [...events, ...this.q];
      this.sending = false;
      this.processQueue();
      return;
    }

    this.sending = false;
    this.processQueue();
  }

  async sendToBackend(events: TrackEvent[]) {
    await fetch(URI, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(events),
    });
  }

  onPageHide() {
    this.clearTimer();
    this.track("pagehide");
    this.flushSync();
  }

  flushSync() {
    if (!this.q.length) return;
    navigator.sendBeacon(URI, JSON.stringify(this.q));
    this.q = [];
  }
}
