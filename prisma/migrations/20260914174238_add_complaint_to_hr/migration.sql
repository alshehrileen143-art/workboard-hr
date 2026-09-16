-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "ComplaintToHR" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintToHR_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ComplaintToHR" ADD CONSTRAINT "ComplaintToHR_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintToHR" ADD CONSTRAINT "ComplaintToHR_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintToHR" ADD CONSTRAINT "ComplaintToHR_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
