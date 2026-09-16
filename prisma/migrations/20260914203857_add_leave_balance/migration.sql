-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'EMERGENCY', 'PERMISSION', 'UNAUTHORIZED_ABSENCE');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "annualLeaveBalance" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "leaveBalanceNote" TEXT;
