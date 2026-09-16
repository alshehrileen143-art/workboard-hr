type TaskStatCardsProps = {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  size?: "normal" | "small";
};

export function TaskStatCards({
  total,
  done,
  inProgress,
  overdue,
  size = "normal",
}: TaskStatCardsProps) {
  const cards = [
    { label: "إجمالي المهام", value: total },
    { label: "منجزة", value: done },
    { label: "قيد التنفيذ", value: inProgress },
    { label: "متأخرة", value: overdue, isOverdue: true },
  ];

  const valueClass = size === "small" ? "text-xl" : "text-3xl";
  const padClass = size === "small" ? "p-3" : "p-4";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex flex-col gap-1 rounded-lg border ${padClass} ${
            card.isOverdue && card.value > 0
              ? "border-red-600/30 bg-red-600/5"
              : "border-border"
          }`}
        >
          <span className="text-xs text-muted">
            {card.label}
          </span>
          <span
            className={`${valueClass} font-semibold ${
              card.isOverdue && card.value > 0
                ? "text-red-600 dark:text-red-400"
                : ""
            }`}
          >
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}
