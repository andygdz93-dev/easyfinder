export * from "./types.js";
export * from "./data.js";
export * from "./demoImages.js";

// Explicitly export scoring symbols so they ALWAYS appear in dist/index.js
export {
  defaultScoringConfig,
  DefaultScoringConfig,
  scoreListing,
} from "./scoring.js";
