import { useEffect, useState, type MouseEventHandler, type ReactNode } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import Select from "./Select";

interface IconButtonProps {
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  label: string;
}

interface TablePaginationProps {
  summary: string;
  pageNumber: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onGoToPage: (page: number) => void;
  disabled?: boolean;
}

function IconButton({ children, onClick, disabled, label }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-white hover:text-stone-900 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:text-stone-500"
    >
      {children}
    </button>
  );
}

function TablePagination({
  summary,
  pageNumber,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onPrevious,
  onNext,
  onFirst,
  onLast,
  onGoToPage,
  disabled = false,
}: TablePaginationProps) {
  const [pageInput, setPageInput] = useState(String(pageNumber));

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const goToPage = () => {
    if (pageInput === "") {
      setPageInput(String(pageNumber));
      return;
    }
    let page = Number(pageInput);
    if (Number.isNaN(page)) {
      setPageInput(String(pageNumber));
      return;
    }
    page = Math.max(1, Math.min(page, totalPages));
    onGoToPage(page);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm leading-tight text-slate-500">{summary}</span>
        <div className="hidden h-4 w-px bg-stone-200 sm:block" />
        <div className="relative">
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="min-w-[120px]"
            searchable={false}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
        <IconButton onClick={onFirst} disabled={disabled || pageNumber === 1} label="First page">
          <ChevronsLeft size={16} />
        </IconButton>
        <IconButton onClick={onPrevious} disabled={disabled || pageNumber === 1} label="Previous page">
          <ChevronLeft size={16} />
        </IconButton>

        <div className="flex items-center gap-1.5 px-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={goToPage}
            onKeyDown={(e) => e.key === "Enter" && goToPage()}
            disabled={disabled}
            className="h-8 w-9 rounded-lg bg-white text-center text-sm font-semibold text-slate-800 shadow-sm outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-amber-700 disabled:opacity-50"
          />
          <span className="text-sm text-slate-400">of {Math.max(1, totalPages)}</span>
        </div>

        <IconButton onClick={onNext} disabled={disabled || pageNumber >= totalPages} label="Next page">
          <ChevronRight size={16} />
        </IconButton>
        <IconButton onClick={onLast} disabled={disabled || pageNumber >= totalPages} label="Last page">
          <ChevronsRight size={16} />
        </IconButton>
      </div>
    </div>
  );
}

export default TablePagination;