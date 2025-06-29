/**
 * Pagination component with infinite scroll support
 * Provides both traditional pagination and infinite scrolling
 */

import React from 'react';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  showPageNumbers?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  showPageNumbers = true
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 py-6">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>

      {/* Page Numbers */}
      {showPageNumbers && (
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-slate-400">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  disabled={loading}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    currentPage === page
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-600 rounded-lg transition-colors duration-200"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center space-x-2 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span className="text-sm text-slate-400">Loading...</span>
        </div>
      )}
    </div>
  );
};

interface InfiniteScrollProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  hasMore,
  loading,
  onLoadMore,
  children
}) => {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  return (
    <div>
      {children}
      
      {/* Loading trigger */}
      <div ref={ref} className="py-6">
        {loading && (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            <span className="text-slate-400">Loading more...</span>
          </div>
        )}
        
        {!hasMore && !loading && (
          <div className="text-center text-slate-400">
            <p>You've reached the end!</p>
          </div>
        )}
      </div>
    </div>
  );
};