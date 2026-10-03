/** Page numbers to show: always the first, last and neighbours of the current page. */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  for (const [index, current] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && current - previous > 1) {
      // Show a lone missing page instead of an ellipsis that hides just one number.
      if (current - previous === 2) result.push(previous + 1);
      else result.push('gap');
    }
    result.push(current);
  }
  return result;
}
