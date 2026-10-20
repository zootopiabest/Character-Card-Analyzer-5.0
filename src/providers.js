import { fetchOpenRouterCatalog, selectLatestDeepSeekPro } from "./openrouter-models.js?v=5.2.0";
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
async function sendJson(url, headers, body, config) {
  const controller=new AbortController();
  const abort=()=>controller.abort(config.signal.reason);
  config.signal?.throwIfAborted();
  config.signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('Model request timed out. No automatic retry was sent.','TimeoutError')),config.timeoutMs||300000);
  const entry={purpose:config.requestLabel||'completion',requestedModel:config.requestedModel||config.model,
    sentModel:config.model,maxOutputTokens:config.maxTokens,temperature:config.provider==='gemini'?0.25:null,
    startedAt:new Date().toISOString(),status:'pending'};
  config.requests?.push(entry);
  try {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body), signal:controller.signal
  });
  const data = await response.json().catch(() => null);
  controller.signal.throwIfAborted();
  if (!response.ok) failResponse(response.status, data);
  if (!data) throw new Error("Provider returned a non-JSON response.");
  entry.status='received';entry.model=data.model||data.modelVersion||null;
  // Native aliases are resolved by the provider's first response; pin later calls.
  if(config.provider==='openrouter'&&config.session?.model.startsWith('~')&&typeof data.model==='string'&&data.model.includes('/')&&!data.model.startsWith('~'))config.session.model=data.model;
  entry.responseId=data.id||data.responseId||null;
  entry.usage=data.usage||data.usageMetadata||null;
  entry.finishReason=data.choices?.[0]?.finish_reason||data.candidates?.[0]?.finishReason||null;
  return data;
  }catch(error){entry.status='failed';entry.error=controller.signal.aborted?String(controller.signal.reason?.message||'Cancelled'):String(error.message);throw controller.signal.aborted?controller.signal.reason:error;}
  finally{entry.completedAt=new Date().toISOString();clearTimeout(timer);config.signal?.removeEventListener('abort',abort);}
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
const messageText = (message) => {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) return message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text || "").join("\n");
  return "";
};
const outputOf = (data) => {
  const choice = data.choices?.[0];
  if (!choice) throw new Error("Provider did not return any choices.");
  const text = messageText(choice.message);
  const finish = [choice.finish_reason, choice.native_finish_reason]
    .filter(Boolean).map((value) => String(value).toLowerCase());
  if (finish.some((value) => /^(length|max_tokens|max_output_tokens|token_limit)$/.test(value))) {
    const error = new Error("The provider cut off the response at its output-token limit. Increase max output tokens or choose a model with a higher limit.");
    if (text.trim()) error.rawResponse = text;
    throw error;
  }
  if (finish.includes("content_filter")) throw new Error("The provider stopped generation due to its content filter.");
  if (text.trim()) return text;
  throw new Error("Provider returned no usable text. Try a different model or output limit.");
};
export async function prepareRun(config) {
  if(config.prepared)return config;
  if (!config.key?.trim()) throw new Error("Enter an API key in Settings first.");
  if (!config.model?.trim()) throw new Error("Choose a model ID.");
  config={...config,model:config.model.trim(),requestedModel:config.model.trim(),requests:[],startedAt:new Date().toISOString()};
  config.signal?.throwIfAborted();
  let ceiling=Infinity;
  if(config.model.startsWith('latest:')||config.model.startsWith('~')){
    if(config.provider!=='openrouter')throw new Error('Latest model choices require the OpenRouter provider.');
    if(config.model.startsWith('latest:')){
      if(config.model!=='latest:deepseek-pro')throw new Error('Unknown latest-model family.');
      const resolved=selectLatestDeepSeekPro(await fetchOpenRouterCatalog({signal:config.signal}));
      config.model=resolved.id;config.inputModalities=resolved.architecture?.input_modalities;
      if(Number.isFinite(resolved.top_provider?.max_completion_tokens)&&resolved.top_provider.max_completion_tokens>0)ceiling=resolved.top_provider.max_completion_tokens;
    }
  }
  config.maxTokens=Math.min(ceiling,Math.max(1024,Math.min(32768,Number(config.maxTokens)||8192)));
  return {...config,session:{model:config.model},prepared:true};
}
export function runRecord(config,details={}) {
  const requests=(config.requests||[]).map(r=>({...r}));
  return {startedAt:config.startedAt,completedAt:new Date().toISOString(),provider:config.provider,
    requestedModel:config.requestedModel||config.model,resolvedModel:config.session?.model||config.model,
    returnedModels:[...new Set(requests.map(r=>r.model).filter(Boolean))],
    settings:{maxOutputTokens:config.maxTokens,temperature:config.provider==='gemini'?0.25:'provider default',timeoutMs:config.timeoutMs||300000},
    requests,requestCount:requests.length,...details};
}
export async function complete(config, system, user, imageDataUrl = null) {
  config=await prepareRun(config);
  config.signal?.throwIfAborted();
  if(imageDataUrl&&Array.isArray(config.inputModalities)&&!config.inputModalities.includes('image'))
    throw new Error(config.model+' does not accept images. Remove the portrait or choose a vision-capable model.');
  config={...config,model:config.session?.model||config.model};
  const budget=config.maxTokens;
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
      model + ":generateContent?key=" + encodeURIComponent(config.key.trim()), {}, payload, config);
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") {
      const error = new Error("Gemini reached its output-token limit. Increase max output tokens or use a shorter report.");
      const partial = candidate.content?.parts?.filter(p=>typeof p.text === "string" && !p.thought).map(p=>p.text).join("") || "";
      if (partial.trim()) error.rawResponse = partial;
      throw error;
    }
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
  };
  // Newer OpenAI reasoning-model families use max_completion_tokens.
  if (config.provider === "openai" && /^(o[1-9]|gpt-5|gpt-6)/i.test(config.model.trim()))
    body.max_completion_tokens = budget;
  else body.max_tokens = budget;
  const endpoint = baseUrl(config).replace(/\/chat\/completions$/,"") + "/chat/completions";
  const result = await sendJson(endpoint,
    { Authorization: "Bearer " + config.key.trim(),
      ...(config.provider === "openrouter" ? {
        "HTTP-Referer": "https://github.com/zootopiabest/Character-Card-Analyzer-5.0",
        "X-Title": "Character Card Analyzer 5.0"
      } : {}) }, body, config);
  return outputOf(result);
}

