import { FastifyInstance, FastifyRequest } from "fastify";
import { ok, fail } from "../response.js";

// Define broker route
export default async function brokerRoutes(app: FastifyInstance) {
  // POST /api/broker/chat — analyze deals and negotiate
  app.post("/chat", { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as any;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!body?.data?.messages) {
      return fail(request, reply, "INVALID_INPUT", "messages array required", 400);
    }

    // Mock deal scoring
    const scored = [
      {
        id: "deal-001",
        decision: "BUY",
        roi: 0.28,
        reasoning: "Strong margin at current price",
      },
    ];

    const buildDealOutput = (deals: any[]) =>
      deals.map(
        (d) =>
          `[${d.decision}] Deal ${d.id}: ${d.roi * 100}% ROI\n${d.reasoning}`
      );

    // ===== ZERO-COST ENGINE =====
    const deals = buildDealOutput(scored);

    if (!anthropicKey) {
      return ok(request, {
        content: `Top evaluated deals:\n\n${deals.join("\n\n")}`,
        fallback: true,
      });
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          messages: body.data.messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return ok(request, {
          content: `Top evaluated deals:\n\n${deals.join("\n\n")}`,
          fallback: true,
        });
      }

      return ok(request, {
        content: data?.content?.[0]?.text || "No response",
      });
    } catch {
      return ok(request, {
        content: `Top evaluated deals:\n\n${deals.join("\n\n")}`,
        fallback: true,
      });
    }
  });
}
