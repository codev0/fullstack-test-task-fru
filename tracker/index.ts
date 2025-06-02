import { ActivityTracker, Tracker } from "./tracker";

// esbuild does not support *.d.ts files, so we need to declare the global interface here
declare global {
  interface Window {
    tracker?: Tracker;
  }
}

const tracker = new ActivityTracker(window.tracker);
window.tracker = tracker;
export default tracker;
