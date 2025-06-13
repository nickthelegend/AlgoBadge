"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, UsersIcon, ZapIcon, AwardIcon } from "lucide-react" // Changed TagIcon to AwardIcon
import { useWallet } from "@txnlab/use-wallet-react"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const { activeAccount } = useWallet()

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 lg:py-40 bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 top-[-60px] grid grid-cols-2 -space-x-52 opacity-40 transition-opacity duration-500 group-hover:opacity-50 dark:opacity-20"
        >
          <div className="h-60 bg-gradient-to-br from-primary to-purple-400 blur-[100px] dark:from-blue-700" />
          <div className="h-80 bg-gradient-to-r from-cyan-400 to-sky-300 blur-[100px] dark:to-indigo-600" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Welcome to <span className="text-primary block sm:inline">AlgoBadges</span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground sm:text-xl md:max-w-2xl">
            The premier platform for creating, managing, and showcasing your Algorand-based achievements and digital
            credentials.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            {!activeAccount ? (
              <ConnectWalletButton />
            ) : (
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="/#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-secondary/30 dark:bg-neutral-800/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Platform Features</h2>
            <p className="mt-3 max-w-2xl mx-auto text-md text-muted-foreground">
              Discover the tools that make AlgoBadges powerful and easy to use.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<AwardIcon className="h-7 w-7 text-primary" />} // Changed from TagIcon
              title="Manage Badges" // Changed from "Advanced Tagging"
              description="Organize and categorize your achievements with a flexible badge system." // Changed description
            />
            <FeatureCard
              icon={<ZapIcon className="h-7 w-7 text-primary" />}
              title="Seamless Creation"
              description="Intuitive tools to design, mint, and issue badges directly on the Algorand blockchain."
            />
            <FeatureCard
              icon={<UsersIcon className="h-7 w-7 text-primary" />}
              title="User Profiles"
              description="Showcase your achievements and manage your digital identity with personalized profiles."
            />
          </div>
        </div>
      </section>

      {/* Conditional Badges Section (if wallet connected) */}
      {activeAccount && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="text-center shadow-xl border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl sm:text-3xl">My AlgoBadges</CardTitle>
                <CardDescription className="text-md">Access your collected badges and create new ones.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/badges/my-badges">View My Badges</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  {/* This now points to the page that was formerly for creating tags */}
                  <Link href="/badges/new">Create New Badge</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-left shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex-shrink-0 mt-1 p-2.5 bg-primary/10 rounded-lg">{icon}</div>
        <div>
          <CardTitle className="text-xl mb-1">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}
