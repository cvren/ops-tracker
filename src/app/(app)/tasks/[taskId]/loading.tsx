export default function TaskDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 rounded-[2rem] bg-black/10" />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="h-[38rem] rounded-[2rem] bg-black/10" />
        <div className="space-y-6">
          <div className="h-72 rounded-[2rem] bg-black/10" />
          <div className="h-56 rounded-[2rem] bg-black/10" />
        </div>
      </div>
    </div>
  );
}
