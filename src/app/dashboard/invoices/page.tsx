import { redirect } from "next/navigation";

export default function DashboardInvoicesPage() {
  redirect("/dashboard/finances/documents");
}
