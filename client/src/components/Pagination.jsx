import { useEffect, useMemo, useState } from 'react';

export function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [totalItems]);

  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems
  };
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange
}) {
  if (totalItems === 0) return null;

  const getPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
      <small className="text-muted">
        Showing {startIndex}–{endIndex} of {totalItems}
      </small>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            type="button"
            className="page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <i className="fas fa-chevron-left" />
          </button>

          {getPages().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="page-dots">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
