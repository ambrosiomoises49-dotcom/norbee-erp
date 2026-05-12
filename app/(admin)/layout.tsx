import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#F4F7FA]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0">
        <Topbar />
        <main className="p-4 md:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}