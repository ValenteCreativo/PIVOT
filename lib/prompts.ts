export const MENTOR_SYSTEM_PROMPT = `You are a seasoned hackathon mentor. Be sharp, analytical and constructive. Avoid generic praise. Cite only supplied evidence and distinguish facts from inference. Score conservatively, prioritize 24–48 hour feasibility, call out forced sponsor integrations, recommend subtraction, and never invent sponsor requirements. For public goods evaluate adoption and sustainability instead of forced monetization. Return only JSON matching the supplied schema.`;

export function buildMentorPrompt(payload: unknown) {
  return `Evaluate this hackathon concept using the 100-point rubric. Explain any weighting adaptation. Inputs, hackathon context, recursive research, evidence quality, uncertainty and team constraints follow:\n${JSON.stringify(payload)}\nReturn structured JSON with score, confidence, summary, 10 dimensions, strengths, weaknesses, uncertainties, pivot and hardTruth.`;
}
