const PRESETS = {
  gemini: { label: "Google Gemini", model: "gemini-2.5-pro" },
  openai: { label: "OpenAI", model: "gpt-4.1" },
  openrouter: { label: "OpenRouter", model: "google/gemini-2.5-pro" },
  deepseek: { label: "DeepSeek", model: "deepseek-chat" },
  custom: { label: "Custom OpenAI-compatible endpoint", model: "" }
};
export const PROVIDERS = PRESETS;
export const DEFAULT_MODEL = (name) => PRESETS[name]?.model || "";

function failResponse(status, json) {
  const detail = json?.error?.message || json?.message || JSON.stringify(json || {}).slice(0, 300);
  throw new Error("Provider HTTP " + status + ": " + detail);
}
async function sendJson(url, headers, body) {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) failResponse(response.status, data);
  if (!data) throw new Error("Provider returned a non-JSON response.");
  return data;
}
function baseUrl(config) {
  switch (config.provider) {
    case "openai": return "https://api.openai.com/v1";
    case "openrouter": return "https://openrouter.ai/api/v1";
    case "deepseek": return "https://api.deepseek.com";
    case "custom": {
      const base = config.baseUrl?.trim().replace(/\/+$/g, "");
      if (!base || !/^https:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base))
        throw new Error("Custom API URL must use HTTPS, except for localhost.");
      return base;
    }
    default: throw new Error("Unknown provider.");
  }
}
const outputOf = (data) => {
  const choice = data.choices?.[0];
  if (!choice) throw new Error("Provider did not return any choices.");
  if (choice.finish_reason === "length") throw new Error("Report was cut off. Increase max output tokens.");
  const message = choice.message;
  if (typeof message?.content === "string" && message.content.trim()) return message.content;
  if (Array.isArray(message?.content)) {
    const text = message.content.filter((p) => p.type === "text").map((p) => p.text || "").join("\n");
    if (text.trim()) return text;
  }
  throw new Error("Provider returned no usable text. Try a different model or output limit.");
};
export async function complete(config, system, user, imageDataUrl = null) {
  if (!config.key?.trim()) throw new Error("Enter an API key in Settings first.");
  if (!config.model?.trim()) throw new Error("Choose a model ID.");
  const budget = Math.max(1024, Math.min(32768, Number(config.maxTokens) || 8192));
  if (config.provider === "gemini") {
    const model = encodeURIComponent(config.model.trim());
    const parts = [{ text: user }];
    if (imageDataUrl) {
      const [,mime,b64] = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/) || [];
      if (mime && b64) parts.push({ inline_data: { mime_type: mime, data: b64 } });
    }
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { maxOutputTokens: budget, temperature: 0.25, responseMimeType: "application/json" }
    };
    const data = await sendJson("https://generativelanguage.googleapis.com/v1beta/models/" +
      model + ":generateContent?key=" + encodeURIComponent(config.key.trim()), {}, payload);
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini reached its output limit.");
    if (!candidate?.content?.parts) throw new Error("Gemini returned no content: " + (candidate?.finishReason || data.promptFeedback?.blockReason || "unknown"));
    const result = candidate.content.parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("");
    if (!result.trim()) throw new Error("Gemini returned empty text.");
    return result;
  }
  const roleContent = imageDataUrl
    ? [{type:"text",text:user}, {type:"image_url", image_url:{url:imageDataUrl}}]
    : user;
  const body = {
    model: config.model.trim(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: roleContent }
    ],
    temperature: 0.25
  };
  // Newer OpenAI reasoning-model families use max_completion_tokens.
  if (config.provider === "openai" && /^(o[1-9]|gpt-5|gpt-6)/i.test(config.model.trim()))
    body.max_completion_tokens = budget;
  else body.max_tokens = budget;
  const endpoint = baseUrl(config).replace(/\/chat\/completions$/,"") + "/chat/completions";
  const result = await sendJson(endpoint,
    { Authorization: "Bearer " + config.key.trim(),
      ...(config.provider === "openrouter" ? {"X-Title":"Character Card Analyzer 5.0"} : {}) }, body);
  return outputOf(result);
}
