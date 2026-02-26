import { afterEach, describe, expect, it } from "vitest";
import {
  UI_PANEL_STATE_STORAGE_KEY,
  getPanelOpenSnapshot,
  savePanelOpenSnapshot,
  subscribePanelState,
} from "./ui-panel-state";

type MockListener = () => void;

function createMockWindow(initial?: string) {
  const store = new Map<string, string>();
  if (typeof initial === "string") {
    store.set(UI_PANEL_STATE_STORAGE_KEY, initial);
  }

  const listeners = new Map<string, Set<MockListener>>();

  return {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    addEventListener: (name: string, listener: MockListener) => {
      const bucket = listeners.get(name) ?? new Set<MockListener>();
      bucket.add(listener);
      listeners.set(name, bucket);
    },
    removeEventListener: (name: string, listener: MockListener) => {
      listeners.get(name)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener());
      return true;
    },
  };
}

describe("ui panel state", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  });

  it("uses fallback when no window exists", () => {
    delete (globalThis as { window?: Window }).window;
    expect(getPanelOpenSnapshot("x", true)).toBe(true);
    expect(getPanelOpenSnapshot("x", false)).toBe(false);
  });

  it("loads previously stored panel states", () => {
    const mockWindow = createMockWindow(JSON.stringify({ "panel-a": false, "panel-b": true }));
    globalThis.window = mockWindow as unknown as Window;

    expect(getPanelOpenSnapshot("panel-a", true)).toBe(false);
    expect(getPanelOpenSnapshot("panel-b", false)).toBe(true);
    expect(getPanelOpenSnapshot("panel-c", true)).toBe(true);
  });

  it("sanitizes invalid storage payloads", () => {
    const mockWindow = createMockWindow("not-json");
    globalThis.window = mockWindow as unknown as Window;

    expect(getPanelOpenSnapshot("panel-a", true)).toBe(true);
  });

  it("emits updates when panel state changes", () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow as unknown as Window;

    let updates = 0;
    const unsubscribe = subscribePanelState(() => {
      updates += 1;
    });

    savePanelOpenSnapshot("panel-a", false);
    expect(getPanelOpenSnapshot("panel-a", true)).toBe(false);
    expect(updates).toBe(1);

    unsubscribe();
  });
});
