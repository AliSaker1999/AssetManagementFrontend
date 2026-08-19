/**
 * Shown while a lazily-loaded page chunk is being fetched.
 *
 * Lives in its own module rather than in App.tsx: Layout needs it for its Suspense
 * boundary, and App already imports Layout, so exporting it from App would make the two
 * files import each other.
 */
export default function PageChunkFallback() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
      <span className="w-5 h-5 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
