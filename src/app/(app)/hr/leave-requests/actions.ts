"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysBetweenInclusive } from "@/lib/leave";
import { LeaveRequestStatus, LeaveType } from "@/generated/prisma/client";

export type DecideLeaveRequestResult = { error?: string; success?: boolean };

export async function decideHrLeaveRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
): Promise<DecideLeaveRequestResult> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    return { error: "الطلب غير موجود" };
  }
  if (request.managerStatus !== LeaveRequestStatus.APPROVED) {
    return { error: "هذا الطلب لم يوافق عليه المدير بعد" };
  }
  if (request.hrStatus !== LeaveRequestStatus.PENDING) {
    return { error: "تم اتخاذ قرار بخصوص هذا الطلب بالفعل" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        hrStatus: decision as LeaveRequestStatus,
        hrNote: note.trim() || null,
      },
    });

    if (
      decision === "APPROVED" &&
      request.type === LeaveType.ANNUAL &&
      request.startDate &&
      request.endDate
    ) {
      const requestedDays = daysBetweenInclusive(
        request.startDate,
        request.endDate,
      );

      const employee = await tx.employee.findUnique({
        where: { id: request.employeeId },
        select: { annualLeaveBalance: true },
      });
      if (employee) {
        await tx.employee.update({
          where: { id: request.employeeId },
          data: {
            annualLeaveBalance: Math.max(
              0,
              employee.annualLeaveBalance - requestedDays,
            ),
          },
        });
      }
    }
  });

  revalidatePath("/hr/leave-requests");
  revalidatePath("/my-profile");
  return { success: true };
}
