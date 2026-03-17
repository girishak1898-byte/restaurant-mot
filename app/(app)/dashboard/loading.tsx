function Skel({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />
}

export default function DashboardLoading() {
  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Skel className="h-6 w-28" />
          <Skel className="h-4 w-44" />
        </div>
        <Skel className="h-8 w-28 rounded-lg" />
      </div>

      {/* Owner summary card */}
      <Skel className="h-44 rounded-xl mb-8" />

      {/* Section label */}
      <div className="flex items-center gap-3 mb-5">
        <Skel className="h-3 w-14 rounded" />
        <Skel className="flex-1 h-px rounded" />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-12">
        <Skel className="h-20 rounded-xl" />
        <Skel className="h-20 rounded-xl" />
      </div>

      {/* Revenue section label */}
      <div className="flex items-center gap-3 mb-5">
        <Skel className="h-3 w-16 rounded" />
        <Skel className="flex-1 h-px rounded" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skel key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Revenue bar chart */}
      <Skel className="h-64 rounded-xl mb-5" />

      {/* Channel / outlet charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-12">
        <Skel className="h-52 rounded-xl" />
        <Skel className="h-52 rounded-xl" />
      </div>

      {/* Prime cost section */}
      <div className="flex items-center gap-3 mb-5">
        <Skel className="h-3 w-20 rounded" />
        <Skel className="flex-1 h-px rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {[...Array(3)].map((_, i) => (
          <Skel key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skel className="h-64 rounded-xl mb-12" />

      {/* Margin leak section */}
      <div className="flex items-center gap-3 mb-5">
        <Skel className="h-3 w-24 rounded" />
        <Skel className="flex-1 h-px rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skel className="h-52 rounded-xl" />
        <Skel className="h-52 rounded-xl" />
      </div>
    </div>
  )
}
