// utils/sanitize.ts
export const sanitizeNumericFields = <T extends Record<string, any>>(
  obj: T,
): T => {
  // 1. Clone the object and cast to a flexible indexable type
  const cleaned = { ...obj } as Record<string, any>;

  // 2. List the numeric fields that could be empty strings
  const numericFields = [
    "starting_amount",
    "lowest_amount",
    "auto_decline_amount",
  ];

  // 3. Convert empty strings/undefined/null to null
  for (const field of numericFields) {
    if (
      cleaned[field] === "" ||
      cleaned[field] === undefined ||
      cleaned[field] === null
    ) {
      cleaned[field] = null;
    }
  }

  // 4. Return with the original type
  return cleaned as T;
};
