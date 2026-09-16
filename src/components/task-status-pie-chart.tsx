"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
} from "recharts";
import type { TaskStatusBuckets } from "@/lib/tasks";
import { TASK_BUCKET_COLORS, TASK_BUCKET_LABELS } from "@/lib/task-colors";

const RADIAN = Math.PI / 180;

function renderSliceLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const cxNum = Number(cx);
  const cyNum = Number(cy);
  const outerRadiusNum = Number(outerRadius);
  const radius = outerRadiusNum + 18;
  const angle = -(midAngle ?? 0) * RADIAN;
  const x = cxNum + radius * Math.cos(angle);
  const y = cyNum + radius * Math.sin(angle);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cxNum ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fill="#52514e"
    >
      {`${name}: ${value}`}
    </text>
  );
}

export function TaskStatusPieChart({
  buckets,
}: {
  buckets: TaskStatusBuckets;
}) {
  const data = [
    { key: "done", name: TASK_BUCKET_LABELS.done, value: buckets.done },
    {
      key: "overdue",
      name: TASK_BUCKET_LABELS.overdue,
      value: buckets.overdue,
    },
    {
      key: "inProgress",
      name: TASK_BUCKET_LABELS.inProgress,
      value: buckets.inProgress,
    },
    {
      key: "pending",
      name: TASK_BUCKET_LABELS.pending,
      value: buckets.pending,
    },
  ].filter((entry) => entry.value > 0);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted">
        لا توجد مهام بعد لعرضها بالرسم البياني
      </p>
    );
  }

  return (
    <div className="h-80 w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            label={renderSliceLabel}
            labelLine
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={
                  TASK_BUCKET_COLORS[
                    entry.key as keyof typeof TASK_BUCKET_COLORS
                  ]
                }
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
