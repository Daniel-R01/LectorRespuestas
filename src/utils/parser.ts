export function cleanOCRText(raw: string): string {
  return raw
    .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,:;¿?¡!()\-%$€a-dA-D]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
