"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, Home } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
    }
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="font-semibold">Analytics</span>
            </Link>

            <div className="flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Button key={item.href} variant={pathname === item.href ? "default" : "ghost"} size="sm" asChild>
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
