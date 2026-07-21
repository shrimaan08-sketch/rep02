export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-hairline">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="skeleton h-3.5 rounded" style={{ width: `${50 + ((i * 17) % 45)}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-md2 border border-hairline bg-paper p-4 shadow-panel">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton mt-3 h-7 w-16 rounded" />
    </div>
  );
}
