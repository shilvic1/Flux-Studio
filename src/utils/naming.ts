/**
 * Smart naming helper for duplicates.
 * When an item named "Layer 1" or "My Animation" is duplicated:
 * First duplicate: "Layer 1 (1)"
 * Second duplicate: "Layer 1 (2)"
 * Third duplicate: "Layer 1 (3)"
 */
export function formatDuplicateTitle(baseTitle: string, existingTitles: string[]): string {
  // Strip legacy " (Copy)" if present
  const cleaned = baseTitle.replace(/\s*\((?:copy|Copy)\)$/i, '').trim();

  // Extract base prefix without any existing (N) suffix
  const match = cleaned.match(/^(.*?)(?:\s*\((\d+)\))?$/);
  const prefix = (match ? match[1] : cleaned).trim();

  // Find all existing numbers for this prefix
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapeRegex(prefix)}(?:\\s*\\((\\d+)\\))?$`, 'i');

  let maxNum = 0;
  let hasPrefix = false;

  for (const t of existingTitles) {
    const trimmed = t.trim();
    const m = trimmed.match(regex);
    if (m) {
      hasPrefix = true;
      if (m[1] !== undefined) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  // Next number is maxNum + 1 (starting at 1 if this is the first duplicate)
  const nextNumber = maxNum > 0 ? maxNum + 1 : (hasPrefix ? 1 : 1);
  return `${prefix} (${nextNumber})`;
}
