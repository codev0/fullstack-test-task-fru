import { Tracker } from "./tracker";

declare global {
  interface Window {
    tracker?: Tracker;
  }
}

export {};
