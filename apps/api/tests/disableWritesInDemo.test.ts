import { describe, expect, it, vi } from "vitest";

describe("disableWritesInDemo", () => {
  it("returns 403 when DEMO_MODE=true", async () => {
    vi.resetModules();
    process.env.DEMO_MODE = "true";

    const { disableWritesInDemo } = await import("../src/middleware/disableWritesInDemo.js");

    const reply = {
      statusCode: 200,
      payload: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await disableWritesInDemo({ requestId: "req-1" } as any, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({
      error: {
        code: "DEMO_WRITE_DISABLED",
        requestId: "req-1",
      },
    });

    const payload = reply.payload as { error: { message: string; requestId: string } };
    expect(payload.error.message).toEqual(expect.any(String));
    expect(payload.error.message).not.toHaveLength(0);
    expect(payload.error.message).toContain("Writes are disabled");
  });
});
