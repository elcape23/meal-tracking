export default function AppLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-20 animate-pulse rounded-[28px] bg-muted/70" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-[28px] bg-muted/70" />
        <div className="h-72 animate-pulse rounded-[28px] bg-muted/70" />
      </div>
    </div>
  );
}
