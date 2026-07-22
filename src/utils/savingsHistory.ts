export interface MonthlySavingsPoint {
  monthKey: string;
  label: string;
  startBalanceCents: number;
  endBalanceCents: number;
  deltaCents: number;
}

export function buildMonthlySavingsHistory(
  movements: Array<{ operationDate: string; amount: number }>,
  startDate: string,
  endDate: string,
  initialBalanceCents: number = 0,
  currentBalanceCents?: number
): MonthlySavingsPoint[] {
  const sortedMovements = [...movements].sort((a, b) => a.operationDate.localeCompare(b.operationDate));
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  const months: MonthlySavingsPoint[] = [];

  const initialMonth = start;
  const current = initialMonth ? new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1) : null;

  let cumulativeBalanceCents = initialBalanceCents;

  while (current && current <= end) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(current);
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const effectiveMonthEnd = monthEnd > today ? today : monthEnd;

    if (effectiveMonthEnd < monthStart) {
      break;
    }

    const startBalanceCents = cumulativeBalanceCents;
    const monthMovements = sortedMovements.filter((movement) => {
      const movementDate = new Date(`${movement.operationDate}T00:00:00`);
      return movementDate >= monthStart && movementDate <= effectiveMonthEnd;
    });

    const monthDeltaCents = monthMovements.reduce((sum, movement) => sum + Math.round(movement.amount * 100), 0);
    const endBalanceCents = isCurrentMonth(monthStart, today) && currentBalanceCents !== undefined
      ? currentBalanceCents
      : startBalanceCents + monthDeltaCents;

    months.push({
      monthKey,
      label: monthLabel,
      startBalanceCents,
      endBalanceCents,
      deltaCents: monthDeltaCents,
    });

    cumulativeBalanceCents = endBalanceCents;
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function isCurrentMonth(monthStart: Date, today: Date): boolean {
  return monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth();
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
