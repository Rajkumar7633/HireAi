export default function VideoCallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#1b1b1b]">
      {children}
    </div>
  )
}
