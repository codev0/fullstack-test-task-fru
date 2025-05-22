import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActivityTracker } from "./tracker";

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as any;

global.navigator.sendBeacon = vi.fn(() => true);

describe("ActivityTracker", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.clearAllTimers();

    Object.defineProperty(document, "title", { value: "Test Page" });
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:50000" },
    });

    window.tracker = undefined;
  });

  it("should handle init event", () => {
    const tracker = new ActivityTracker({
      q: [
        {
          event: "init",
          tags: ["userId", "config"],
          url: document.location.href,
          title: document.title,
          ts: Date.now(),
        },
        {
          event: "pageview",
          tags: [],
          url: document.location.href,
          title: document.title,
          ts: Date.now(),
        },
      ],
    });
    expect(tracker.userId).toBe("userId");
    expect(tracker.config).toEqual("config");
    expect(tracker.q.length).toBe(1);
  });

  it("should add events to queue", () => {
    const tracker = new ActivityTracker();
    tracker.track("pageview", "home");

    expect(tracker.q.length).toBe(1);
    expect(tracker.q[0].event).toBe("pageview");
    expect(tracker.q[0].tags).toEqual(["home"]);

    tracker.track("click", "button1");
    expect(tracker.q.length).toBe(2);
    expect(tracker.q[1].event).toBe("click");
    expect(tracker.q[1].tags).toEqual(["button1"]);
  });

  it("should not send events if queue is empty", () => {
    const tracker = new ActivityTracker();
    expect(tracker.q.length).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should send events when threshold is reached", async () => {
    const tracker = new ActivityTracker();
    tracker.track("event1");
    tracker.track("event2");
    tracker.track("event3");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(tracker.q.length).toBe(0);

    // FIXME: find out why this is working
    tracker.track("new-event1");
    tracker.track("new-event2");
    await vi.runAllTimersAsync();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(tracker.q.length).toBe(0);
  });

  it("should send events after throttle timeout", async () => {
    const tracker = new ActivityTracker();

    tracker.track("event1");
    tracker.track("event2");
    const copy = [...tracker.q];
    expect(global.fetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8888/track",
      expect.objectContaining({
        body: JSON.stringify(copy),
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
      }),
    );
    expect(tracker.q.length).toBe(0);
  });

  it("should retry sending events on failure", async () => {
    const tracker = new ActivityTracker();
    vi.mocked(global.fetch).mockImplementationOnce(() =>
      Promise.reject("Network error"),
    );

    tracker.track("event1");
    tracker.track("event2");
    tracker.track("event3");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    tracker.track("event4");
    tracker.track("event5");
    await vi.runAllTimersAsync();
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const secondCallArgs = vi.mocked(global.fetch).mock.calls[1];
    const requestOptions = secondCallArgs[1];
    const sentBody = JSON.parse(requestOptions!.body as string);
    const eventNames = sentBody.map((e) => e.event);

    expect(eventNames).toEqual(
      expect.arrayContaining([
        "event1",
        "event2",
        "event3",
        "event4",
        "event5",
      ]),
    );
    expect(tracker.q.length).toBe(0);
  });

  it("should flush and clear timer on document hidden", () => {
    const tracker = new ActivityTracker();
    const flushSpy = vi.spyOn(tracker, "flushSync");
    const clearSpy = vi.spyOn(tracker, "clearTimer");

    tracker.track("event1");

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(clearSpy).toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalled();
    expect(global.navigator.sendBeacon).toHaveBeenCalledWith(
      "http://localhost:8888/track",
      expect.stringContaining("event1"),
    );
  });

  it("should flush and clear timer on beforeunload", () => {
    const tracker = new ActivityTracker();
    const flushSpy = vi.spyOn(tracker, "flushSync");
    const clearSpy = vi.spyOn(tracker, "clearTimer");

    tracker.track("event1");

    window.dispatchEvent(new Event("beforeunload"));

    expect(clearSpy).toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalled();
    expect(global.navigator.sendBeacon).toHaveBeenCalledWith(
      "http://localhost:8888/track",
      expect.stringContaining("event1"),
    );
  });

  it("should not send events if queue is empty", () => {
    const tracker = new ActivityTracker();
    const flushSpy = vi.spyOn(tracker, "flushSync");
    const clearSpy = vi.spyOn(tracker, "clearTimer");

    window.dispatchEvent(new Event("beforeunload"));

    expect(clearSpy).toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalled();
    expect(global.navigator.sendBeacon).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(clearSpy).toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalled();
    expect(global.navigator.sendBeacon).not.toHaveBeenCalled();
  });
});
