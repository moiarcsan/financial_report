import { type BankMovement } from "../types/movement";
import { isInternalTransfer } from "./categoryUtils";

export interface BalancePoint {
  date: string;
  dateLabel: string;
  balanceCents: number;
}

export interface FinancialMetrics {
  savingsRatePercent: number;
  monthlyIncomesCents: number;
  monthlyExpensesCents: number;
  monthlyNetBalanceCents: number;
  monthlyTransfersCents: number;
  dailyAverageExpenseCents: number;
  daysTracked: number;
}

/**
 * Calculates daily balance evolution for the tracked accounts.
 * Returns points for visualization starting at initialBalance and then applying each movement.
 */
export function calculateBalanceEvolution(
  movements: BankMovement[],
  initialBalanceCents: number,
  startDate?: string,
  endDate?: string,
  userRules?: Map<string, string>
): BalancePoint[] {
  // Balance evolution should reflect the real account balance over time.
  // Traspasos can still be excluded from income/expense KPIs separately.
  const relevantMovements = movements;

  // Filter by date range if provided
  let filtered = relevantMovements;
  if (startDate || endDate) {
    filtered = relevantMovements.filter((m) => {
      const movDate = m.operationDate;
      if (startDate && movDate < startDate) return false;
      if (endDate && movDate > endDate) return false;
      return true;
    });
  }

  // Sort by date ascending
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
  );

  // Group net movement by date first, then build points in date order.
  const dailyNetByDate = new Map<string, number>();
  for (const movement of sorted) {
    const amountCents = Math.round(movement.amount * 100);
    dailyNetByDate.set(
      movement.operationDate,
      (dailyNetByDate.get(movement.operationDate) || 0) + amountCents
    );
  }

  const sortedDates = Array.from(dailyNetByDate.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const formatDateLabel = (date: string) => {
    const dateObj = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat("es-ES", {
      month: "short",
      day: "numeric",
    }).format(dateObj);
  };

  const points: BalancePoint[] = [];
  const initialPointDate = startDate || sortedDates[0];

  if (initialPointDate) {
    points.push({
      date: initialPointDate,
      dateLabel: formatDateLabel(initialPointDate),
      balanceCents: initialBalanceCents,
    });
  }

  let runningBalance = initialBalanceCents;
  for (const date of sortedDates) {
    runningBalance += dailyNetByDate.get(date) || 0;
    points.push({
      date,
      dateLabel: formatDateLabel(date),
      balanceCents: runningBalance,
    });
  }

  // Ensure we always include the selected end date in the chart.
  if (endDate && points[points.length - 1]?.date !== endDate) {
    points.push({
      date: endDate,
      dateLabel: formatDateLabel(endDate),
      balanceCents: runningBalance,
    });
  }

  return points;
}

/**
 * Calculates financial metrics for the current month (excluding internal transfers).
 */
export function calculateMonthlyMetrics(
  movements: BankMovement[],
  initialBalanceCents: number,
  currentBalanceCents: number,
  selectedMonthOrRules?: string | Map<string, string>,
  maybeUserRules?: Map<string, string>
): FinancialMetrics {
  const selectedMonth = typeof selectedMonthOrRules === "string" ? selectedMonthOrRules : undefined;
  const userRules = selectedMonthOrRules instanceof Map ? selectedMonthOrRules : maybeUserRules;

  // Get selected month date range (or current month by default)
  const now = new Date();
  const selectedMonthMatch = selectedMonth?.match(/^(\d{4})-(\d{2})$/);
  const selectedYear = selectedMonthMatch ? parseInt(selectedMonthMatch[1], 10) : now.getFullYear();
  const selectedMonthIndex = selectedMonthMatch ? parseInt(selectedMonthMatch[2], 10) - 1 : now.getMonth();
  const firstDay = new Date(selectedYear, selectedMonthIndex, 1);
  const lastDay = new Date(selectedYear, selectedMonthIndex + 1, 0);

  const monthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;

  // Filter movements for this month (robust with YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss)
  const monthMovements = movements.filter((m) => {
    return m.operationDate.substring(0, 7) === monthKey;
  });

  // Real balance delta in the month (used for savings rate and net balance KPI)
  const monthlyNetBalanceCents = monthMovements.reduce(
    (sum, mov) => sum + Math.round(mov.amount * 100),
    0
  );

  // Separate by type
  let totalIncomesCents = 0;
  let totalExpensesCents = 0;
  let totalTransfersCents = 0;

  for (const mov of monthMovements) {
    // movement.amount is in euros, convert to cents
    const amountCents = Math.round(mov.amount * 100);
    
    // Check if it's a transfer first
    if (isInternalTransfer(mov.concept, userRules)) {
      totalTransfersCents += Math.abs(amountCents);
    } else if (amountCents > 0) {
      // Positive amounts that aren't transfers = income
      totalIncomesCents += amountCents;
    } else if (amountCents < 0) {
      // Negative amounts = expenses
      totalExpensesCents += Math.abs(amountCents);
    }
  }

  // Calculate savings rate against real monthly balance delta
  const savingsRatePercent =
    totalIncomesCents > 0 ? (monthlyNetBalanceCents / totalIncomesCents) * 100 : 0;

  // Calculate days tracked in the selected month
  const today = new Date();
  const isSelectedCurrentMonth =
    today.getFullYear() === firstDay.getFullYear() && today.getMonth() === firstDay.getMonth();
  const daysTracked =
    isSelectedCurrentMonth
      ? today.getDate()
      : lastDay.getDate();

  // Calculate daily average expense
  const dailyAverageExpenseCents =
    daysTracked > 0 ? Math.round(totalExpensesCents / daysTracked) : 0;

  return {
    savingsRatePercent,
    monthlyIncomesCents: totalIncomesCents,
    monthlyExpensesCents: totalExpensesCents,
    monthlyNetBalanceCents,
    monthlyTransfersCents: totalTransfersCents,
    dailyAverageExpenseCents,
    daysTracked,
  };
}
