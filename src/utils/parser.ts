export function cleanOCRText(raw: string): string {
  return raw
    .replace(/[|<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
