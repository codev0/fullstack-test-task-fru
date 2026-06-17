import { isNetworkError } from "./is-network-error";

export const URI = "http://localhost:8888/track";
export const BUFFER_TRESHOLD = 3;
export const DEBOUNCE_MS = 1000;
export const RESTORE_TIMEOUT = 1000;

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
  private lastSendTime = 0;
  private onVisibilityChange: () => void;

  constructor(proxy?: Tracker) {
    this.init(proxy);
    this.onVisibilityChange = this.onPageHide.bind(this);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
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
      payload.q.forEach((event: TrackEvent) => {
        this.track(event.event, ...event.tags);
      });
    }
  }

  private enqueue(event: TrackEvent) {
    this.buffer.push(event);
  }

  private dequeueAll() {
    const items = this.buffer;
    this.buffer = [];
    return items;
  }

  private processQueue() {
    if (this.sending) return;

    if (this.buffer.length >= BUFFER_TRESHOLD) {
      this.clearTimer();
      this.send(this.dequeueAll());
      return;
    }

    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;

    if (timeSinceLastSend >= DEBOUNCE_MS) {
      this.clearTimer();
      this.send(this.dequeueAll());
    } else {
      this.schedule(DEBOUNCE_MS - timeSinceLastSend);
    }
  }

  private schedule(delay: number) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.buffer.length > 0) {
        this.send(this.dequeueAll());
      }
    }, delay);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async send(events: TrackEvent[]) {
    if (!events.length) return;

    this.sending = true;
    this.lastSendTime = Date.now();

    try {
      await this.sendToBackend(events);
    } catch (e: unknown) {
      if (isNetworkError(e)) {
        await sleep(RESTORE_TIMEOUT);
        this.buffer = [...events, ...this.buffer];
      }
    }

    this.sending = false;
    this.processQueue();
  }

  private async sendToBackend(events: TrackEvent[], keepAlive = false) {
    return await fetch(URI, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(events),
      keepalive: keepAlive,
    });
  }

  private onPageHide() {
    if (document.visibilityState === "hidden") {
      this.clearTimer();
      this.track("pagehide");
      this.flushSync();
    }
  }

  private flushSync() {
    if (!this.buffer.length) return;
    this.sendToBackend([...this.buffer], true).catch(console.error);
    this.buffer = [];
  }

  track(event: string, ...tags: string[]): void {
    this.enqueue({
      event,
      tags,
      ts: this.getTs(),
      url: this.getUrl(),
      title: this.getTitle(),
    });
    this.processQueue();
  }

  private destroy() {
    this.clearTimer();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }
}
