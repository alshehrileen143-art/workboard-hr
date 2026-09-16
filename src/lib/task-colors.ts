// Fixed, mode-invariant status colors (validated against the light chart
// surface; red/green sit below the CVD adjacent-pair floor for deuteranopia,
// which is why every chart using these MUST also carry a text legend/label
// alongside the color -- never rely on hue alone to tell "done" from
// "overdue" apart).
export const TASK_BUCKET_COLORS = {
  done: "#0ca30c",
  overdue: "#d03b3b",
  inProgress: "#2a78d6",
  pending: "#898781",
} as const;

export const TASK_BUCKET_LABELS = {
  done: "منجزة",
  overdue: "متأخرة",
  inProgress: "قيد التنفيذ",
  pending: "لم تبدأ",
} as const;
