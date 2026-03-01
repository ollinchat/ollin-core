"use client";

import { useParams } from "next/navigation";
import { ContactInfoPage } from "@/components/messages/ContactInfoPage";

export default function ContactPage() {
  const params = useParams();
  const contactId = typeof params.contactId === "string" ? params.contactId : "";
  return <ContactInfoPage contactId={contactId} />;
}
