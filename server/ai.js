const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

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

function normalizeProvider(provider) {
  return provider === "anthropic" ? "anthropic" : "openai";
}

function getProviderClient(provider, keys) {
  if (provider === "anthropic") {
    if (!keys.anthropicApiKey) {
      throw new Error("No Claude API key linked to this account.");
    }

    return {
      provider,
      client: new Anthropic({ apiKey: keys.anthropicApiKey })
    };
  }

  if (!keys.openaiApiKey) {
    throw new Error("No OpenAI API key linked to this account.");
  }

  return {
    provider: "openai",
    client: new OpenAI({ apiKey: keys.openaiApiKey })
  };
}

async function runJsonPrompt({ provider, client, model, prompt }) {
  if (provider === "anthropic") {
    const response = await client.messages.create({
      model: model || "claude-3-5-sonnet-latest",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = (response.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    return parseJson(text || "");
  }

  const response = await client.responses.create({
    model: model || "gpt-4o-mini",
    input: prompt
  });

  return parseJson(response.output_text || "");
}

async function generateSummary({
  provider,
  openaiApiKey,
  anthropicApiKey,
  model,
  audience,
  length,
  documentText,
  fileName,
  brand
}) {
  const normalizedProvider = normalizeProvider(provider);
  const { client } = getProviderClient(normalizedProvider, {
    openaiApiKey,
    anthropicApiKey
  });

  const prompt = [
    "You are Reclaim, an AI assistant for engineering firms.",
    `Provider mode: ${normalizedProvider}.`,
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

  return runJsonPrompt({
    provider: normalizedProvider,
    client,
    model,
    prompt
  });
}

async function generatePresentation({
  provider,
  openaiApiKey,
  anthropicApiKey,
  model,
  brief,
  slideCount,
  brand
}) {
  const normalizedProvider = normalizeProvider(provider);
  const { client } = getProviderClient(normalizedProvider, {
    openaiApiKey,
    anthropicApiKey
  });

  const prompt = [
    "You create presentation outlines for engineering firms.",
    `Provider mode: ${normalizedProvider}.`,
    `Brand name: ${brand.name || "Reclaim"}.`,
    `Brand tone: ${brand.tone || "clear, confident, technical"}.`,
    `Brand primary color: ${brand.primaryColor || "#101113"}.`,
    `Brand rules: ${brand.rules || "Use concise headings, practical proof points, and disciplined technical language."}.`,
    `Target slide count: ${slideCount}.`,
    'Return JSON only in this shape: {"title":"string","themeNote":"string","slides":[{"title":"string","objective":"string","bullets":["string"],"speakerNote":"string"}]}',
    "",
    brief
  ].join("\n");

  return runJsonPrompt({
    provider: normalizedProvider,
    client,
    model,
    prompt
  });
}

module.exports = {
  generateSummary,
  generatePresentation
};
