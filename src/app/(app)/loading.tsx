import { Skeleton } from "@/components/ui/skeleton";

// Fallback for every page in the app shell that has no loading.tsx of its own.
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}
