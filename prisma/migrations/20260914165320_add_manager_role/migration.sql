-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
