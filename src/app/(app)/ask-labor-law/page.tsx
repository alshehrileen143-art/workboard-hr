import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AskLaborLawChat } from "@/components/ask-labor-law-chat";

export default async function AskLaborLawPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-primary">اسأل عن نظام العمل</h1>

      <AskLaborLawChat />
    </main>
  );
}
