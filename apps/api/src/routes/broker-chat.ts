import type { FastifyInstance } from "fastify";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const SYSTEM_PROMPT = `You are EasyFinder AI, a battle-tested heavy equipment deal analyst with 20 years of auction and resale market experience. You specialize in CAT, Komatsu, Volvo, John Deere, JCB — excavators, dozers, wheel loaders, backhoes, telehandlers, motor graders, and compactors.

Your job is to protect buyers from bad deals and find the ones worth chasing.

DECISION FRAMEWORK:
- BUY: Price at or below FMV, hours reasonable for year, risk low
- NEGOTIATE: Price 5-20 percent above FMV, or risk factors justify pushback
- WALK: Price over 20 percent above FMV, hours excessive, or critical risk flags present

RESPONSE FORMAT — always return valid JSON only, no markdown:
{
  "recommendation": "BUY or NEGOTIATE or WALK",
  "confidence": 0-100,
  "reasoning": "2-3 sentence direct assessment",
  "fmv_estimate": number or null,
  "price_delta_percent": number or null,
  "risk_factors": ["factor1", "factor2"],
  "negotiation_plan": [
    { "round": 1, "offer": number, "rationale": "string" },
    { "round": 2, "offer": number, "rationale": "string" },
    { "round": 3, "offer": number, "rationale": "string" }
  ],
  "market_context": "1-2 sentences on current market for this category"
}

RULES:
- Never guess. Missing data is a risk factor. Lower confidence accordingly.
- Hours benchmarks: excavators under 3000 low, 3000-6000 moderate, over 6000 high wear
- Age over 10 years adds 15-25 percent depreciation risk
- Always provide negotiation_plan when recommendation is NEGOTIATE
- Be terse. No filler. Every word earns its place.`;

interface ListingContext {
  title?: string;
  price?: number;
  hours?: number;
  year?: number;
  state?: string;
  condition?: number;
  verifiedSeller?: boolean;
  hasInspectionReport?: boolean;
  hasServiceHistory?: boolean;
  sellerType?: string;
  availability?: string;
  source?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default async function brokerChatRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      messages: ChatMessage[];
      listing?: ListingContext;
    };
  }>(
    "/",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { messages, listing } = request.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return reply.status(400).send({
          error: { code: "BAD_REQUEST", message: "messages array is required" },
          requestId: request.requestId,
        });
      }

      const validRoles = new Set(["user", "assistant"]);
      for (const m of messages) {
        const isInvalidRole = !validRoles.has(m.role);
        const isInvalidContent = typeof m.content !== "string" || m.content.trim() === "";
        if (isInvalidRole || isInvalidContent) {
          return reply.status(400).send({
            error: { code: "BAD_REQUEST", message: "Each message must have role user or assistant and non-empty content" },
            requestId: request.requestId,
          });
        }
      }

      const listingContext = listing
        ? "\n\nLISTING DATA:\n" + JSON.stringify(listing, null, 2)
        : "";

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT + listingContext,
        messages,
      });

      const rawText = response.content
        .filter((b): b is TextBlock => b.type === "text")
        .map((b: TextBlock) => b.text)
        .join("");

      let parsed: unknown;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : rawText;
      } catch {
        parsed = rawText;
      }

      return reply.send({
        data: {
          messages: [{ role: "assistant", content: parsed }],
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          },
        },
        requestId: request.requestId,
      });
    }
  );
}
