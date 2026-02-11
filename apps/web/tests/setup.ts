import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

type RuntimeHealthMock = {
  demoMode: boolean;
  billingEnabled: boolean;
};

type TestFetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | Promise<Response>;

declare global {
  var setRuntimeHealthMock: (next: Partial<RuntimeHealthMock>) => void;
  var setTestFetchHandler: (handler: TestFetchHandler | null) => void;
}

const defaultRuntimeHealth: RuntimeHealthMock = {
  demoMode: false,
  billingEnabled: false,
};

let runtimeHealthMock: RuntimeHealthMock = { ...defaultRuntimeHealth };
let testFetchHandler: TestFetchHandler | null = null;

const toUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

globalThis.setRuntimeHealthMock = (next) => {
  runtimeHealthMock = { ...runtimeHealthMock, ...next };
};

globalThis.setTestFetchHandler = (handler) => {
  testFetchHandler = handler;
};

beforeEach(() => {
  runtimeHealthMock = { ...defaultRuntimeHealth };
  testFetchHandler = null;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = toUrl(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ ok: true, ...runtimeHealthMock });
      }

      if (testFetchHandler) {
        return testFetchHandler(input, init);
      }

      return jsonResponse({ data: {} });
    })
  );
});

afterEach(() => {
  testFetchHandler = null;
});
