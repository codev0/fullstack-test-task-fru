import { ActivityTracker } from "./tracker";

const tracker = new ActivityTracker(window.tracker);
window.tracker = tracker;
export default tracker;
