import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pt-8 md:pt-0 md:pl-[200px]">{children}</div>
    </div>
  );
}
