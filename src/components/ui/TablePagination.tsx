import Select from './Select';

interface TablePaginationProps {
  summary: string;
  pageNumber: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export default function TablePagination({
  summary,
  pageNumber,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onPrevious,
  onNext,
  disabled = false,
}: TablePaginationProps) {
  return (
    <div className="mb-3 rounded-xl border border-pearl-200 bg-gradient-to-r from-white to-pearl-50 px-3.5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium text-ink-500">{summary}</span>

        <div className="flex items-center gap-2">
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="min-w-[110px]"
            searchable={false}
            disabled={disabled}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </Select>

          <button
            type="button"
            onClick={onPrevious}
            disabled={disabled || pageNumber <= 1}
            className="h-9 rounded-lg border border-pearl-200 bg-white px-3 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-pearl-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="min-w-[62px] text-center text-[12px] font-semibold text-ink-400">
            {pageNumber}/{Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={disabled || pageNumber >= Math.max(1, totalPages)}
            className="h-9 rounded-lg border border-pearl-200 bg-white px-3 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-pearl-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
