-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "iqamaExpiryDate" DATE,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EmployeeAuditLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmployeeAuditLog" ADD CONSTRAINT "EmployeeAuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAuditLog" ADD CONSTRAINT "EmployeeAuditLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
