import { PaginationEllipsis, PaginationItem, PaginationLink } from '~/components/ui/pagination';

/**
 * Generates a pagination range array for a given current page, total pages, and delta.
 * The range includes the first page, the last page, and ellipses to indicate gaps.
 *
 * @param {number} currentPage - The current active page.
 * @param {number} totalPages - The total number of pages.
 * @param {number} [delta=2] - The number of pages to show before and after the current page.
 * @returns {(number | 'ellipsis')[]} An array representing the pagination range, including page numbers and 'ellipsis' for gaps.
 */
const getPaginationRange = (currentPage: number, totalPages: number, delta = 2) => {
  const range: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, currentPage - delta);
  const end = Math.min(totalPages - 1, currentPage + delta);

  /**
   * Insert ellipsis if there's a gap between the first page and the start.
   */
  if (start > 2) {
    range.push('ellipsis');
  }

  /**
   * Insert the range of pages between the start and the end.
   */
  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  /**
   * Insert ellipsis if there's a gap between the end and the last page.
   */
  if (end < totalPages - 1) {
    range.push('ellipsis');
  }

  /**
   * Insert the last page if it's not already in the range.
   */
  if (totalPages > 1) {
    range.push(totalPages);
  }

  return range;
};

/**
 * Renders pagination links based on the provided pagination range.
 *
 * @param {Array<number | 'ellipsis'>} paginationRange - An array representing the pagination range, which can include numbers and 'ellipsis' to indicate a gap.
 * @param {number} currentPage - The current active page number.
 * @param {function} onPageChange - A callback function to handle page changes. It receives the new page number as an argument.
 * @returns {JSX.Element[]} An array of JSX elements representing the pagination links.
 */
const renderPaginationLinks = (paginationRange: (number | 'ellipsis')[], currentPage: number, onPageChange: (page: number) => void) => {
  return paginationRange.map((item, index) => {
    if (item === 'ellipsis') {
      return (
        <PaginationItem key={`ellipsis-${index}`}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    return (
      <PaginationItem key={item}>
        <PaginationLink
          onClick={(e) => {
            e.preventDefault();
            onPageChange(item as number);
          }}
          isActive={item === currentPage}
          href='#'
        >
          {item}
        </PaginationLink>
      </PaginationItem>
    );
  });
};

export { getPaginationRange, renderPaginationLinks };
