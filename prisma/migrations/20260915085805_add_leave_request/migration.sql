-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "requestDate" DATE,
    "hours" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "managerStatus" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "managerNote" TEXT,
    "hrStatus" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
