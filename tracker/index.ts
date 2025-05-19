declare global {
  interface Window {
    tracker?: Tracker;
  }
}

interface Tracker {
  track(event: string, ...tags: string[]): void;
  call(...args: EventArgs): void;
  q: string[];
}

type EventArgs = string[];

class ActivityTracker implements Tracker {
  q: string[] = [];
  private init(userId: string, config: string): void {
    console.log(
      `Tracker initialized for user: ${userId} with config: ${config}`
    );
  }
  track(event: string, ...tags: string[]): void {
    console.log(`Event: ${event}, Tags: ${tags.join(", ")}`);
  }
  call(...args: EventArgs): void {
    const evenName = args[0];
    switch (evenName) {
      case "track":
        this.track(args[1], ...args.slice(2));
        return;
      case "init":
        this.init(args[1], args[2]);
        return;
      default:
        console.warn(`Unknown event: ${evenName}`);
        return;
    }
  }
}

const tracker = new ActivityTracker();
const trackerCall = tracker.call.bind(tracker);

if (window.tracker && window.tracker.q && Array.isArray(window.tracker.q)) {
  window.tracker.q.forEach((args) => {
    trackerCall(...args);
  });
}

window.tracker = tracker;

export default tracker;
