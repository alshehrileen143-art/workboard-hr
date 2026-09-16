"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, combineDateAndTime } from "@/lib/attendance";
import { AttendanceSource } from "@/generated/prisma/client";

export type ImportAttendanceRowFailure = {
  row: number;
  reason: string;
};

export type ImportAttendanceState = {
  error?: string;
  report?: {
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    failedCount: number;
    failures: ImportAttendanceRowFailure[];
  };
};

const REQUIRED_COLUMNS = [
  "employeeEmail",
  "date",
  "checkInTime",
  "checkOutTime",
] as const;

type Column = (typeof REQUIRED_COLUMNS)[number];

function cellToTimeString(value: unknown): string {
  if (value instanceof Date) {
    const hours = String(value.getUTCHours()).padStart(2, "0");
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return String(value ?? "").trim();
}

type ParsedRow = {
  rowNumber: number;
  email: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
};

export async function importAttendanceFromExcel(
  _prevState: ImportAttendanceState,
  formData: FormData,
): Promise<ImportAttendanceState> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "الرجاء اختيار ملف Excel" };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { error: "الملف يجب أن يكون بصيغة xlsx" };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: "تعذر قراءة الملف، تأكد أنه ملف Excel صالح (.xlsx)" };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { error: "الملف لا يحتوي على أي ورقة عمل" };
  }

  const headerRow = worksheet.getRow(1);
  const columnIndex: Partial<Record<Column, number>> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = cell.value;
    const name = typeof value === "string" ? value.trim() : "";
    if ((REQUIRED_COLUMNS as readonly string[]).includes(name)) {
      columnIndex[name as Column] = colNumber;
    }
  });

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !(column in columnIndex),
  );
  if (missingColumns.length > 0) {
    return {
      error: `الملف ناقص الأعمدة التالية: ${missingColumns.join(", ")}`,
    };
  }

  const failures: ImportAttendanceRowFailure[] = [];
  const parsedRows: ParsedRow[] = [];
  let totalRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows += 1;

    const cellValue = (column: Column) =>
      row.getCell(columnIndex[column] as number).value;

    const email = String(cellValue("employeeEmail") ?? "")
      .trim()
      .toLowerCase();
    const dateRaw = cellValue("date");

    if (!email) {
      failures.push({ row: rowNumber, reason: "بريد الموظف مفقود" });
      return;
    }

    const dateStr =
      dateRaw instanceof Date
        ? dateRaw.toISOString().slice(0, 10)
        : String(dateRaw ?? "").trim();
    const date = dateStr ? parseDateOnly(dateStr) : null;
    if (!date) {
      failures.push({ row: rowNumber, reason: "التاريخ مفقود أو غير صالح" });
      return;
    }

    const checkInStr = cellToTimeString(cellValue("checkInTime"));
    const checkOutStr = cellToTimeString(cellValue("checkOutTime"));

    if (!checkInStr && !checkOutStr) {
      failures.push({
        row: rowNumber,
        reason: "لا يوجد وقت حضور ولا وقت انصراف بهذا الصف",
      });
      return;
    }

    const checkIn = checkInStr ? combineDateAndTime(date, checkInStr) : null;
    const checkOut = checkOutStr
      ? combineDateAndTime(date, checkOutStr)
      : null;

    if (checkInStr && !checkIn) {
      failures.push({
        row: rowNumber,
        reason: "صيغة وقت الحضور غير صحيحة (يجب أن تكون HH:MM)",
      });
      return;
    }
    if (checkOutStr && !checkOut) {
      failures.push({
        row: rowNumber,
        reason: "صيغة وقت الانصراف غير صحيحة (يجب أن تكون HH:MM)",
      });
      return;
    }

    parsedRows.push({
      rowNumber,
      email,
      date,
      checkIn,
      checkOut,
      hasCheckIn: !!checkInStr,
      hasCheckOut: !!checkOutStr,
    });
  });

  if (parsedRows.length === 0) {
    return {
      report: {
        totalRows,
        createdCount: 0,
        updatedCount: 0,
        failedCount: failures.length,
        failures: failures.sort((a, b) => a.row - b.row),
      },
    };
  }

  const emails = [...new Set(parsedRows.map((row) => row.email))];
  const employees = await prisma.employee.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const employeeIdByEmail = new Map(
    employees.map((employee) => [employee.email, employee.id]),
  );

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of parsedRows) {
    const employeeId = employeeIdByEmail.get(row.email);
    if (!employeeId) {
      failures.push({
        row: row.rowNumber,
        reason: "البريد الإلكتروني لا يطابق أي موظف مسجّل",
      });
      continue;
    }

    try {
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: row.date } },
      });

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            ...(row.hasCheckIn ? { checkIn: row.checkIn } : {}),
            ...(row.hasCheckOut ? { checkOut: row.checkOut } : {}),
            source: AttendanceSource.IMPORT,
          },
        });
        updatedCount += 1;
      } else {
        await prisma.attendance.create({
          data: {
            employeeId,
            date: row.date,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            source: AttendanceSource.IMPORT,
          },
        });
        createdCount += 1;
      }
    } catch {
      failures.push({
        row: row.rowNumber,
        reason: "خطأ غير متوقع أثناء الحفظ",
      });
    }
  }

  if (createdCount > 0 || updatedCount > 0) {
    revalidatePath("/hr/attendance");
  }

  return {
    report: {
      totalRows,
      createdCount,
      updatedCount,
      failedCount: failures.length,
      failures: failures.sort((a, b) => a.row - b.row),
    },
  };
}
