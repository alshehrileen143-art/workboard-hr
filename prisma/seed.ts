import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_HR_EMAIL ?? "hr@example.com";
  const password = process.env.SEED_HR_PASSWORD ?? "ChangeMe123!";
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      role: Role.HR,
    },
  });

  console.log(`Seeded HR user -> email: ${email} / password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
