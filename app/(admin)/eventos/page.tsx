"use client";

import { useRouter } from "next/navigation";
import EventsCalendar from "@/features/dashboard/components/EventsCalendar";

export default function EventosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-4 md:p-6">
      <EventsCalendar onClose={() => router.back()} />
    </div>
  );
}