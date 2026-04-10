const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "de",
  "het",
  "een",
  "en",
  "van",
  "voor",
  "op",
  "te",
  "zijn",
  "waren",
  "dat",
  "dit",
  "die",
  "met",
  "als",
  "bij",
  "om",
  "naar",
  "aan",
  "ook",
  "door",
  "over"
]);

const ACTION_WORDS = [
  "action",
  "follow-up",
  "follow up",
  "next step",
  "next steps",
  "should",
  "must",
  "need to",
  "owner",
  "deadline",
  "plan",
  "recommend",
  "act",
  "besluit",
  "actie",
  "volgende stap",
  "moet",
  "nodig",
  "eigenaar",
  "aanbevolen"
];

const RISK_WORDS = [
  "risk",
  "issue",
  "blocker",
  "blocked",
  "delay",
  "concern",
  "dependency",
  "dependencies",
  "escalation",
  "problem",
  "risico",
  "probleem",
  "vertraging",
  "afhankelijk",
  "blokkade",
  "zorg"
];

const METRIC_PATTERN =
  /(\b\d+(?:[.,]\d+)?%|\b(?:EUR|USD|GBP|€|\$)\s?\d+(?:[.,]\d+)?(?:\s?[kKmM])?|\b\d+(?:[.,]\d+)?\s?(?:hours?|hrs?|days?|weeks?|months?|dagen|uren|weken|maanden|items?|users?|klanten|projects?|tickets?)\b)/i;

const AUDIENCE_OPENERS = {
  leadership: "Leadership snapshot:",
  client: "Client-ready summary:",
  team: "Team briefing:"
};

const LENGTH_CONFIG = {
  short: { summaryCount: 2, bullets: 3 },
  standard: { summaryCount: 3, bullets: 4 },
  detailed: { summaryCount: 5, bullets: 6 }
};

function normalizeText(value) {
  return value.replace(/\r/g, "").trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u017f\s-]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function buildFrequencyMap(sentences) {
  const frequency = new Map();

  sentences.forEach((sentence) => {
    tokenize(sentence).forEach((token) => {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    });
  });

  return frequency;
}

function scoreSentence(sentence, frequency) {
  const lowerSentence = sentence.toLowerCase();
  const tokens = tokenize(sentence);
  let score = 0;

  tokens.forEach((token) => {
    score += frequency.get(token) || 0;
  });

  if (METRIC_PATTERN.test(sentence)) {
    score += 5;
  }

  if (ACTION_WORDS.some((word) => lowerSentence.includes(word))) {
    score += 4;
  }

  if (RISK_WORDS.some((word) => lowerSentence.includes(word))) {
    score += 4;
  }

  if (sentence.length > 180) {
    score -= 2;
  }

  return score;
}

function uniqueByValue(items) {
  return [...new Set(items.map((item) => item.trim()))].filter(Boolean);
}

function pickTopSentences(sentences, frequency, count) {
  return [...sentences]
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, frequency)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, count)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);
}

function pickCategorySentences(sentences, words, limit) {
  return uniqueByValue(
    sentences.filter((sentence) =>
      words.some((word) => sentence.toLowerCase().includes(word))
    )
  ).slice(0, limit);
}

function pickMetricSentences(sentences, limit) {
  return uniqueByValue(
    sentences.filter((sentence) => METRIC_PATTERN.test(sentence))
  ).slice(0, limit);
}

function fallbackBullets(sentences, count) {
  return sentences.slice(0, count);
}

function buildHeadline(summarySentences, audience) {
  const opener = AUDIENCE_OPENERS[audience] || AUDIENCE_OPENERS.team;
  const firstSentence = summarySentences[0] || "No summary available yet.";
  return `${opener} ${firstSentence}`;
}

function compressParagraph(sentences) {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

export function summarizeReport(sourceText, options) {
  const text = normalizeText(sourceText);

  if (!text) {
    return null;
  }

  const sentences = splitSentences(text);
  const frequency = buildFrequencyMap(sentences);
  const config = LENGTH_CONFIG[options.length] || LENGTH_CONFIG.standard;
  const summarySentences = pickTopSentences(
    sentences,
    frequency,
    config.summaryCount
  );
  const keyPoints = fallbackBullets(
    pickTopSentences(sentences, frequency, config.bullets),
    config.bullets
  );
  const risks = pickCategorySentences(sentences, RISK_WORDS, config.bullets);
  const actions = pickCategorySentences(sentences, ACTION_WORDS, config.bullets);
  const metrics = pickMetricSentences(sentences, config.bullets);
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);

  return {
    id: `summary-${Date.now()}`,
    createdAt: new Date().toISOString(),
    headline: buildHeadline(summarySentences, options.audience),
    overview: compressParagraph(summarySentences),
    stats: {
      words: text.split(/\s+/).filter(Boolean).length,
      sections: paragraphs.length || 1,
      sentences: sentences.length
    },
    options,
    summarySentences,
    keyPoints,
    risks: risks.length ? risks : ["No explicit risks detected in the report."],
    actions: actions.length ? actions : ["No direct action items were detected."],
    metrics: metrics.length ? metrics : ["No clear metrics were detected."],
    audienceLabel:
      options.audience === "leadership"
        ? "Leadership"
        : options.audience === "client"
          ? "Client"
          : "Team",
    sourcePreview: paragraphs.slice(0, 2).join("\n\n")
  };
}

export function formatSummaryExport(summary, sourceTitle = "Untitled report") {
  if (!summary) {
    return "";
  }

  return [
    `# ${sourceTitle}`,
    "",
    `Generated: ${new Date(summary.createdAt).toLocaleString()}`,
    `Audience: ${summary.audienceLabel}`,
    `Length: ${summary.options.length}`,
    "",
    "## Headline",
    summary.headline,
    "",
    "## Overview",
    summary.overview,
    "",
    "## Key points",
    ...summary.keyPoints.map((item) => `- ${item}`),
    "",
    "## Metrics",
    ...summary.metrics.map((item) => `- ${item}`),
    "",
    "## Risks",
    ...summary.risks.map((item) => `- ${item}`),
    "",
    "## Actions",
    ...summary.actions.map((item) => `- ${item}`)
  ].join("\n");
}
