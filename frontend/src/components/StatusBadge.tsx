import { statusClasses, titleCase } from "@/lib/format";

export default function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium ${pad} ${statusClasses(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {titleCase(status)}
    </span>
  );
}
