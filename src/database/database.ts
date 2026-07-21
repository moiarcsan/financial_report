import Dexie, { type Table } from "dexie";
import { type BankMovement } from "../types/movement";

export class BankDatabase extends Dexie {
  movements!: Table<BankMovement, string>;

  constructor() {
    super("BankMovementsDatabase");
    this.version(1).stores({
      // "&" indicates unique index, and setting it as first field makes it the primary key.
      movements: "&fingerprint, bank, account, operationDate, amount"
    });
  }
}

export const db = new BankDatabase();
