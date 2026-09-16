"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TASK_BUCKET_COLORS, TASK_BUCKET_LABELS } from "@/lib/task-colors";

export type ManagerTaskBarDatum = {
  managerName: string;
  done: number;
  overdue: number;
};

export function ManagerTasksBarChart({
  data,
}: {
  data: ManagerTaskBarDatum[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted">
        لا توجد بيانات مهام بعد لعرضها بالرسم البياني
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
          <XAxis dataKey="managerName" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="done"
            name={TASK_BUCKET_LABELS.done}
            fill={TASK_BUCKET_COLORS.done}
          />
          <Bar
            dataKey="overdue"
            name={TASK_BUCKET_LABELS.overdue}
            fill={TASK_BUCKET_COLORS.overdue}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
