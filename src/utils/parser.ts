export function cleanOCRText(raw: string): string {
  return raw
    .replace(/[|<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractQuestion(text: string): string | null {
  const optionPattern = /[a-dA-D][).]\s*.+[a-dA-D][).]\s*.+[a-dA-D][).]\s*/;
  if (optionPattern.test(text)) return text;

  const lettersPattern = /\b[a-dA-D](?:\s+[a-dA-D]){2,}\b/;
  if (lettersPattern.test(text)) return text;

  return null;
}

export function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = b.toLowerCase().split(/\s+/);
  let matches = 0;
  for (const w of wordsB) {
    if (wordsA.has(w)) matches++;
  }
  return matches / Math.max(wordsA.size, 1);
}
