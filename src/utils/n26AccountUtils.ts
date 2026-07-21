import type { BankMovement } from "../types/movement";

export function summarizeAccountTotalsByBank(
  movements: Pick<BankMovement, "bank" | "account" | "amount">[],
  bank: "N26" | "Sabadell"
) {
  const totals: Record<string, number> = {};

  for (const movement of movements) {
    if (movement.bank !== bank) {
      continue;
    }

    const accountName = movement.account?.trim() || bank;
    const cents = Math.round(movement.amount * 100);
    totals[accountName] = (totals[accountName] || 0) + cents;
  }

  return totals;
}
