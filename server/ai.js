const OpenAI = require("openai");

function getClient(apiKey) {
  if (!apiKey) {
    throw new Error("No OpenAI API key linked to this account.");
  }

  return new OpenAI({ apiKey });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("The AI response was not valid JSON.");
  }
}

async function generateSummary({ apiKey, model, audience, length, documentText, fileName, brand }) {
  const client = getClient(apiKey);
  const prompt = [
    "You are Reclaim, an AI assistant for engineering firms.",
    `Audience: ${audience}.`,
    `Length: ${length}.`,
    `Document name: ${fileName}.`,
    `Brand name: ${brand.name || "Reclaim"}.`,
    `Brand tone: ${brand.tone || "clear, confident, technical"}.`,
    `Brand rules: ${brand.rules || "Keep it concise, practical, and client-ready."}.`,
    "Return JSON only with keys: headline, overview, keyPoints, metrics, risks, actions.",
    "",
    documentText
  ].join("\n");

  const response = await client.responses.create({
    model: model || "gpt-4o-mini",
    input: prompt
  });

  return parseJson(response.output_text || "");
}

async function generatePresentation({ apiKey, model, brief, slideCount, brand }) {
  const client = getClient(apiKey);
  const prompt = [
    "You create presentation outlines for engineering firms.",
    `Brand name: ${brand.name || "Reclaim"}.`,
    `Brand tone: ${brand.tone || "clear, confident, technical"}.`,
    `Brand primary color: ${brand.primaryColor || "#101113"}.`,
    `Brand rules: ${brand.rules || "Use concise headings, practical proof points, and disciplined technical language."}.`,
    `Target slide count: ${slideCount}.`,
    'Return JSON only in this shape: {"title":"string","themeNote":"string","slides":[{"title":"string","objective":"string","bullets":["string"],"speakerNote":"string"}]}',
    "",
    brief
  ].join("\n");

  const response = await client.responses.create({
    model: model || "gpt-4o-mini",
    input: prompt
  });

  return parseJson(response.output_text || "");
}

module.exports = {
  generateSummary,
  generatePresentation
};
