export function safeParseJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  let cleaned = text.replace(/```(?:json)?|```/g, "").trim();
  const lastObj = cleaned.lastIndexOf("}");
  const lastArr = cleaned.lastIndexOf("]");
  const cut = Math.max(lastObj, lastArr);
  if (cut > 0) {
    try { return JSON.parse(cleaned.slice(0, cut + 1)); } catch {}
  }
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(cleaned); } catch {}
  console.error("[DEBUG] safeParseJson failed completely:", text);
  return null;
}
