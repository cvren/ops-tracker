export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="w-full animate-pulse rounded-[2rem] border border-black/10 bg-white/70 p-10 shadow-panel">
        <div className="h-3 w-32 rounded-full bg-black/10" />
        <div className="mt-4 h-12 w-72 rounded-full bg-black/10" />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="h-40 rounded-[2rem] bg-black/10" />
          <div className="h-40 rounded-[2rem] bg-black/10" />
          <div className="h-40 rounded-[2rem] bg-black/10" />
        </div>
      </div>
    </main>
  );
}
