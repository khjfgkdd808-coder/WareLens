export function SkeletonProductCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="aspect-[3/4] bg-gray-100 animate-shimmer"/>
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-shimmer w-3/4"/>
        <div className="h-3 bg-gray-100 rounded animate-shimmer w-1/2"/>
        <div className="h-4 bg-gray-100 rounded animate-shimmer w-1/3 mt-1"/>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonProductCard key={i}/>)}
    </div>
  )
}
