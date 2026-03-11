export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-28 rounded-[2rem] bg-black/10" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[2rem] bg-black/10" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-[2rem] bg-black/10" />
        <div className="h-96 rounded-[2rem] bg-black/10" />
      </div>
    </div>
  );
}
