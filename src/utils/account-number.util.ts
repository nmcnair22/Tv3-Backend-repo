// src/utils/account-number.util.ts

export function cleanAccountNumber(accountNumber: string): string {
  // Remove all non-digit characters
  return accountNumber.replace(/\D/g, '');
}
