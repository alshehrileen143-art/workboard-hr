"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@/generated/prisma/client";

export type ImportRowFailure = {
  row: number;
  reason: string;
};

export type ImportEmployeesState = {
  error?: string;
  report?: {
    totalRows: number;
    importedCount: number;
    failedCount: number;
    failures: ImportRowFailure[];
  };
};

const REQUIRED_COLUMNS = [
  "fullName",
  "email",
  "jobTitle",
  "department",
  "hireDate",
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

type ParsedRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  hireDate: Date;
};

export async function importEmployeesFromExcel(
  _prevState: ImportEmployeesState,
  formData: FormData,
): Promise<ImportEmployeesState> {
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
  const columnIndex: Partial<Record<(typeof REQUIRED_COLUMNS)[number], number>> =
    {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = cell.value;
    const name = typeof value === "string" ? value.trim() : "";
    if ((REQUIRED_COLUMNS as readonly string[]).includes(name)) {
      columnIndex[name as (typeof REQUIRED_COLUMNS)[number]] = colNumber;
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

  const failures: ImportRowFailure[] = [];
  const parsedRows: ParsedRow[] = [];
  const seenEmails = new Set<string>();
  let totalRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows += 1;

    const cellValue = (column: (typeof REQUIRED_COLUMNS)[number]) =>
      row.getCell(columnIndex[column] as number).value;

    const fullName = String(cellValue("fullName") ?? "").trim();
    const email = String(cellValue("email") ?? "")
      .trim()
      .toLowerCase();
    const jobTitle = String(cellValue("jobTitle") ?? "").trim();
    const department = String(cellValue("department") ?? "").trim();
    const hireDateRaw = cellValue("hireDate");

    if (!fullName || !email || !jobTitle || !department || !hireDateRaw) {
      failures.push({ row: rowNumber, reason: "بيانات ناقصة (حقل مطلوب فارغ)" });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      failures.push({
        row: rowNumber,
        reason: "صيغة البريد الإلكتروني غير صحيحة",
      });
      return;
    }

    let hireDate: Date;
    if (hireDateRaw instanceof Date) {
      hireDate = hireDateRaw;
    } else {
      hireDate = new Date(String(hireDateRaw));
    }
    if (Number.isNaN(hireDate.getTime())) {
      failures.push({ row: rowNumber, reason: "تاريخ التوظيف غير صالح" });
      return;
    }

    if (seenEmails.has(email)) {
      failures.push({
        row: rowNumber,
        reason: "بريد إلكتروني مكرر داخل نفس الملف",
      });
      return;
    }
    seenEmails.add(email);

    parsedRows.push({ rowNumber, fullName, email, jobTitle, department, hireDate });
  });

  if (parsedRows.length === 0) {
    return {
      report: {
        totalRows,
        importedCount: 0,
        failedCount: failures.length,
        failures: failures.sort((a, b) => a.row - b.row),
      },
    };
  }

  const emails = parsedRows.map((row) => row.email);
  const [existingEmployees, existingUsers] = await Promise.all([
    prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
  ]);
  const existingEmails = new Set([
    ...existingEmployees.map((e) => e.email),
    ...existingUsers.map((u) => u.email),
  ]);

  let importedCount = 0;

  for (const row of parsedRows) {
    if (existingEmails.has(row.email)) {
      failures.push({
        row: row.rowNumber,
        reason: "يوجد موظف أو حساب بهذا البريد الإلكتروني مسبقًا",
      });
      continue;
    }

    try {
      const tempPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({
          data: {
            fullName: row.fullName,
            email: row.email,
            jobTitle: row.jobTitle,
            department: row.department,
            hireDate: row.hireDate,
          },
        });

        await tx.user.create({
          data: {
            email: row.email,
            password: hashedPassword,
            role: Role.EMPLOYEE,
            employeeId: employee.id,
          },
        });
      });

      importedCount += 1;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        failures.push({
          row: row.rowNumber,
          reason: "يوجد موظف أو حساب بهذا البريد الإلكتروني مسبقًا",
        });
      } else {
        failures.push({
          row: row.rowNumber,
          reason: "خطأ غير متوقع أثناء الحفظ",
        });
      }
    }
  }

  if (importedCount > 0) {
    revalidatePath("/hr");
  }

  return {
    report: {
      totalRows,
      importedCount,
      failedCount: failures.length,
      failures: failures.sort((a, b) => a.row - b.row),
    },
  };
}
