const URI = "http://localhost:8888/track";
const EVENTS_TRESHOLD = 3;
const THROTTLE_MS = 1000;
const RESTORE_TIMEOUT = 1000;

export interface Tracker {
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
  private buffer: TrackEvent[] = [];
  private sending = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(proxy?: Tracker) {
    this.init(proxy);
  }

  private getTitle() {
    return document.title;
  }

  private getUrl() {
    return window.location.href;
  }

  private getTs() {
    const now = new Date();
    return Math.floor(now.getTime() / 1000) + now.getTimezoneOffset() * 60;
  }

  private init(payload: Tracker | undefined) {
    if (
      payload &&
      "q" in payload &&
      Array.isArray(payload.q) &&
      payload.q.length
    ) {
      payload.q.forEach((event) => {
        this.track(event.event, ...event.tags);
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.onPageHide();
      }
    });
  }

  private processQueue() {
    if (this.buffer.length >= EVENTS_TRESHOLD) {
      this.clearTimer();
      this.send();
    } else {
      this.schedule();
    }
  }

  private schedule() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.send();
    }, THROTTLE_MS);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async send() {
    if (this.sending || !this.buffer.length) return;
    const events = [...this.buffer];
    this.buffer = [];
    this.sending = true;

    try {
      await this.sendToBackend(events);
    } catch (e) {
      await sleep(RESTORE_TIMEOUT);
      this.buffer = [...events, ...this.buffer];
      this.sending = false;
      this.processQueue();
      return;
    }

    this.sending = false;
    this.processQueue();
  }

  private async sendToBackend(events: TrackEvent[]) {
    await fetch(URI, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(events),
    });
  }

  private onPageHide() {
    this.clearTimer();
    this.track("pagehide");
    this.flushSync();
  }

  private flushSync() {
    if (!this.buffer.length) return;
    navigator.sendBeacon(URI, JSON.stringify(this.buffer));
    this.buffer = [];
  }

  track(event: string, ...tags: string[]): void {
    this.buffer.push({
      event,
      tags,
      ts: this.getTs(),
      url: this.getUrl(),
      title: this.getTitle(),
    });
    this.processQueue();
  }
}
