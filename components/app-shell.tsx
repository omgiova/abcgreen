"use client"

import { BottomNav } from "./bottom-nav"
import { Toaster } from "./ui/toaster"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
      <Toaster />
    </div>
  )
}
