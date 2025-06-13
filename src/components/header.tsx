"use client"

// components/header.tsx
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import { ConnectWalletButton } from "./connect-wallet-button"
import { HomeIcon, UsersIcon, WalletIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinksBase = [
  { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
  { href: "/users", label: "Users", icon: <UsersIcon className="h-5 w-5" /> },
]

export default function Header() {
  // In a real app, you might get the active path to style the active link
  // const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        "border-black/10 dark:border-white/10", // Softer border color
        "bg-background/75 dark:bg-neutral-900/75", // Semi-transparent background. For dark mode, using a specific dark shade for more control like the screenshot.
        "backdrop-blur-md supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-neutral-900/60", // Blur effect
      )}
    >
      <div className="container flex h-[60px] items-center px-4 sm:px-6 lg:px-8">
        {" "}
        {/* Slightly taller header */}
        <Link href="/" className="mr-8 flex items-center space-x-2.5">
          <WalletIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <span className="font-semibold text-lg sm:text-xl">AlgoBadges</span>
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-3 sm:gap-4 md:gap-6">
          {navLinksBase.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-accent/80 dark:hover:bg-white/10",
                // Example active link styling (uncomment and use usePathname if needed)
                // pathname === link.href ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
              {link.icon}
              <span className="hidden sm:inline">{link.label}</span>
              <span className="sm:hidden sr-only">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end space-x-3">
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}
