interface SortableMedia {
  name: string;
  sortValue?: number | null;
}

export function getLeadingNumber(name: string): number | null {
  const match = name.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

export function compareByLeadingNumber<T extends SortableMedia>(
  left: T,
  right: T,
): number {
  const leftNumber = left.sortValue ?? getLeadingNumber(left.name);
  const rightNumber = right.sortValue ?? getLeadingNumber(right.name);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;

  return left.name.localeCompare(right.name, "zh-CN", {
    sensitivity: "base",
  });
}

export function sortByLeadingNumber<T extends SortableMedia>(
  values: readonly T[],
): T[] {
  return [...values].sort(compareByLeadingNumber);
}
