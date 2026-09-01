export type ExpirePresetKind = 'immediate' | 'monthly' | 'yearly'

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

/** Build start/end dates for renewal testing expire presets. */
export function buildExpirePresetDates(
  kind: ExpirePresetKind,
  subscriptionStartDate?: string,
): { start: Date; end: Date } {
  const end = new Date()

  if (kind === 'monthly') {
    return { start: addMonths(end, -1), end }
  }

  if (kind === 'yearly') {
    return { start: addYears(end, -1), end }
  }

  const start = subscriptionStartDate
    ? new Date(subscriptionStartDate)
    : new Date(end.getTime() - 86400000)

  return { start, end }
}

export const expirePresetLabels: Record<ExpirePresetKind, string> = {
  immediate: 'Expire now',
  monthly: 'Expire now (monthly cycle)',
  yearly: 'Expire now (yearly cycle)',
}
