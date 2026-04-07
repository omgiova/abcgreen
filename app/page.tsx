import { AppShell } from "@/components/app-shell"
import { Dashboard } from "@/components/dashboard"

export default function HomePage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <Dashboard />
      </div>
    </AppShell>
  )
}
