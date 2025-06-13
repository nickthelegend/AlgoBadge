"use client"

import { ConnectWalletButton } from "./connect-wallet-button"
import { ThemeToggle } from "./theme-toggle"

export default function Nav() {
  return (
    <nav className="flex justify-between items-center p-4 border-b">
      <h1 className="text-xl font-bold pl-20">Connect-Wallet-Starter</h1>
      <div className="flex items-center">
        <ThemeToggle />
        <ConnectWalletButton />
      </div>
    </nav>
  )
}
