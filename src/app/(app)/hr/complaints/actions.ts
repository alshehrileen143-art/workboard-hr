"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus } from "@/generated/prisma/client";

export type ResolveComplaintResult = { error?: string; success?: boolean };

export async function resolveComplaint(
  complaintId: string,
): Promise<ResolveComplaintResult> {
  const session = await auth();
  if (session?.user?.role !== "HR") {
    return { error: "غير مصرح لك بهذا الإجراء" };
  }

  const complaint = await prisma.complaintToHR.findUnique({
    where: { id: complaintId },
  });
  if (!complaint) {
    return { error: "الشكوى غير موجودة" };
  }

  await prisma.complaintToHR.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.RESOLVED },
  });

  revalidatePath("/hr/complaints");
  return { success: true };
}
