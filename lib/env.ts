export function cleanEnvValue(v: string | undefined | null): string {
  if (!v) return ''
  // Remove BOM, carriage returns, newlines, and surrounding whitespace/quotes
  return v.replace(/^\uFEFF/, '').replace(/\r/g, '').replace(/\n/g, '').replace(/^["']|["']$/g, '').trim()
}

