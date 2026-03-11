export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-[2rem] bg-black/10" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="h-24 rounded-[2rem] bg-black/10" />
          <div className="h-52 rounded-[2rem] bg-black/10" />
          <div className="h-52 rounded-[2rem] bg-black/10" />
        </div>
        <div className="h-[34rem] rounded-[2rem] bg-black/10" />
      </div>
    </div>
  );
}
