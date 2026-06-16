export function deriveIsOverageFromUsage(
  row: { usedCount: number; usageLimit: number | null } | undefined,
): boolean {
  if (!row || row.usageLimit == null) {
    return false
  }

  return row.usedCount + 1 > row.usageLimit
}
