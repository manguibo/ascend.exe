import { afterEach, describe, expect, it } from "vitest";
import {
  UI_RAIL_DENSITY_STORAGE_KEY,
  defaultRailDensity,
  getRailDensitySnapshot,
  saveRailDensity,
  subscribeRailDensity,
} from "./ui-rail-state";

type MockListener = () => void;

function createMockWindow(initialDensity?: string) {
  const store = new Map<string, string>();
  if (initialDensity) {
    store.set(UI_RAIL_DENSITY_STORAGE_KEY, initialDensity);
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

describe("ui rail density state", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  });

  it("returns default density when window is unavailable", () => {
    delete (globalThis as { window?: Window }).window;
    expect(getRailDensitySnapshot()).toBe(defaultRailDensity);
  });

  it("loads persisted density from storage", () => {
    const mockWindow = createMockWindow("COMPACT");
    globalThis.window = mockWindow as unknown as Window;
    expect(getRailDensitySnapshot()).toBe("COMPACT");
  });

  it("sanitizes invalid persisted values", () => {
    const mockWindow = createMockWindow("INVALID");
    globalThis.window = mockWindow as unknown as Window;
    expect(getRailDensitySnapshot()).toBe(defaultRailDensity);
  });

  it("saves and emits update events", () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow as unknown as Window;

    let updates = 0;
    const unsubscribe = subscribeRailDensity(() => {
      updates += 1;
    });

    saveRailDensity("COMPACT");
    expect(getRailDensitySnapshot()).toBe("COMPACT");
    expect(updates).toBe(1);

    unsubscribe();
  });
});
