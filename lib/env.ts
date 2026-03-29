export function cleanEnvValue(v: string | undefined | null): string {
  if (!v) return ''
  // Remove BOM and trailing/leading whitespace/newlines that can break API calls.
  return v.replace(/^\uFEFF/, '').trim()
}

