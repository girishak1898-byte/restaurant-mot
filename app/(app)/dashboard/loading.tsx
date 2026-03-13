export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded" />
          <div className="h-4 w-52 bg-muted rounded" />
        </div>
        <div className="h-8 w-28 bg-muted rounded-lg" />
      </div>

      {/* Owner summary card */}
      <div className="h-40 bg-muted rounded-xl mb-10" />

      {/* Section divider + alerts */}
      <div className="h-4 w-16 bg-muted rounded mb-5" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>

      {/* Revenue section */}
      <div className="h-4 w-20 bg-muted rounded mb-5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl mb-6" />
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="h-52 bg-muted rounded-xl" />
        <div className="h-52 bg-muted rounded-xl" />
      </div>

      {/* Prime cost section */}
      <div className="h-4 w-24 bg-muted rounded mb-5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl mb-10" />

      {/* Margin leak section */}
      <div className="h-4 w-24 bg-muted rounded mb-5" />
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="h-52 bg-muted rounded-xl" />
        <div className="h-52 bg-muted rounded-xl" />
      </div>
    </div>
  )
}
