"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./theme-toggle"
import { ConnectWalletButton } from "./connect-wallet-button"
import { HomeIcon, UsersIcon, WalletIcon, AwardIcon, BrainIcon, ShieldCheckIcon, CheckCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinksBase = [
  { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
  { href: "/badges", label: "Badges", icon: <AwardIcon className="h-5 w-5" /> },
  { href: "/quiz", label: "Quiz", icon: <BrainIcon className="h-5 w-5" /> },
  { href: "/verify", label: "Apply Badge", icon: <ShieldCheckIcon className="h-5 w-5" /> },
  { href: "/approve", label: "Approve", icon: <CheckCircleIcon className="h-5 w-5" /> },
  { href: "/users", label: "Users", icon: <UsersIcon className="h-5 w-5" /> },
]

export default function Header() {
  const pathname = usePathname()
  const navLinks = navLinksBase

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40",
        // Adjusted background classes for better blur effect:
        // Lower opacity for the base background, and even lower for when backdrop-filter is supported.
        "bg-background/80 backdrop-blur-lg", // Increased blur intensity to -lg
        "supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-neutral-900/60",
      )}
    >
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2.5">
          <WalletIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <span className="font-semibold text-lg sm:text-xl">AlgoBadges</span>
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-1 sm:gap-2 md:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3",
                pathname === link.href
                  ? "text-foreground bg-accent dark:bg-accent/70"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/80 dark:hover:bg-accent/50", // Adjusted dark hover
              )}
            >
              {link.icon}
              <span className="hidden md:inline">{link.label}</span>
              <span className="md:hidden sr-only">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-shrink-0 items-center justify-end space-x-2 sm:space-x-3">
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}
