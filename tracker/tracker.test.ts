import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ActivityTracker,
  BUFFER_TRESHOLD,
  DEBOUNCE_MS,
  RESTORE_TIMEOUT,
  URI,
} from "./tracker";

vi.mock("./is-network-error", () => ({
  isNetworkError: (e) => e instanceof Error,
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as any;

function parseEventsBody(mockCall: any[] | undefined) {
  if (!mockCall || mockCall.length < 2) {
    throw new Error("Invalid mock call data");
  }
  const requestOptions = mockCall[1];
  const parsed = JSON.parse(requestOptions!.body as string);
  return parsed;
}

function dateToSecondsUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000) + date.getTimezoneOffset() * 60;
}

const LOCATION = "http://localhost:50000";
const TITLE = "Test Page";

describe("ActivityTracker", () => {
  let tracker: ActivityTracker;
  Object.defineProperty(document, "title", { value: TITLE });
  Object.defineProperty(window, "location", {
    value: { href: LOCATION },
  });

  beforeEach(() => {
    tracker = new ActivityTracker();
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    tracker["destroy"]();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should send events immediately", () => {
    const initialDate = new Date("2025-01-01T00:00:00+03:00");
    vi.setSystemTime(initialDate);
    tracker.track("pageview", "home");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const events = parseEventsBody(vi.mocked(global.fetch).mock.calls[0]);
    expect(events).toEqual([
      {
        event: "pageview",
        tags: ["home"],
        url: LOCATION,
        title: TITLE,
        ts: dateToSecondsUnixTimestamp(initialDate),
      },
    ]);
    tracker["destroy"]();
  });

  it("should send next batch after debounce period", async () => {
    tracker.track("event1");
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    tracker.track("event2");

    expect(global.fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DEBOUNCE_MS / 2);
    await Promise.resolve();

    tracker.track("event3");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DEBOUNCE_MS / 2);
    await Promise.resolve();

    const eventNames = parseEventsBody(
      vi.mocked(global.fetch).mock.calls[1],
    ).map((e: any) => e.event);
    expect(eventNames).toEqual(expect.arrayContaining(["event2", "event3"]));
    tracker["destroy"]();
  });

  it("should send events when buffer threshold is reached", async () => {
    tracker.track("event1");
    await Promise.resolve();

    const expected: string[] = [];

    for (let i = 0; i < BUFFER_TRESHOLD; i++) {
      const eventName = `event${i + 2}`;
      tracker.track(eventName);
      expected.push(eventName);
    }

    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const events = parseEventsBody(vi.mocked(global.fetch).mock.calls[1]).map(
      (e: any) => e.event,
    );
    expect(events).toEqual(expect.arrayContaining(expected));
    tracker["destroy"]();
  });

  it("should retry sending events on failure", async () => {
    let failFetch = true;
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        failFetch
          ? Promise.reject(new Error("network error"))
          : Promise.resolve({}),
      );

    global.fetch = fetchMock;

    tracker.track("event1");
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(RESTORE_TIMEOUT / 2);
    tracker.track("event2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RESTORE_TIMEOUT / 2);

    failFetch = false;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const events = parseEventsBody(vi.mocked(global.fetch).mock.calls[1]).map(
      (e: any) => e.event,
    );
    expect(events).toEqual(expect.arrayContaining(["event1", "event2"]));
    tracker["destroy"]();
  });

  it("should retry sending events on failure if treshold reached", async () => {
    let failFetch = true;
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        failFetch
          ? Promise.reject(new Error("network error"))
          : Promise.resolve({}),
      );
    global.fetch = fetchMock;
    tracker.track("event1");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    tracker.track("event2");
    tracker.track("event3");
    await vi.advanceTimersByTimeAsync(RESTORE_TIMEOUT);
    failFetch = false;
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const events = parseEventsBody(vi.mocked(fetchMock).mock.calls[1]).map(
      (e: any) => e.event,
    );
    expect(events).toEqual(
      expect.arrayContaining(["event1", "event2", "event3"]),
    );
    tracker["destroy"]();
  });

  it("should send events on beforeunload", async () => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    tracker.track("event1");
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    tracker.track("event2");
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(global.fetch).mock.calls[1][1]?.keepalive).toBe(true);
    const events = parseEventsBody(
      vi.mocked(global.fetch).mock.calls.at(-1),
    ).map((e: any) => e.event);
    expect(events).toEqual(expect.arrayContaining(["event2", "pagehide"]));
    tracker["destroy"]();
  });

  it("should not send events if buffer is empty", async () => {
    tracker["processQueue"]();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(0);
    tracker["destroy"]();
  });
});
