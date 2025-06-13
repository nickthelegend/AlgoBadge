import type React from "react"
import { cn } from "@/lib/utils"

interface PageTitleHeaderProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  actionButton?: React.ReactNode
  className?: string
}

export default function PageTitleHeader({ icon, title, subtitle, actionButton, className }: PageTitleHeaderProps) {
  return (
    <div className={cn("pb-8 mb-8 border-b border-border/70", className)}>
      {" "}
      {/* Softer border */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          {icon && (
            <div className="flex-shrink-0 text-primary p-2.5 bg-primary/10 rounded-lg [&>svg]:h-6 [&>svg]:w-6 sm:[&>svg]:h-7 sm:[&>svg]:w-7">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1> {/* Larger title */}
            {subtitle && <p className="mt-2 text-base text-muted-foreground max-w-2xl">{subtitle}</p>}{" "}
            {/* Slightly larger subtitle */}
          </div>
        </div>
        {actionButton && <div className="mt-4 sm:mt-0 flex-shrink-0 w-full sm:w-auto">{actionButton}</div>}
      </div>
    </div>
  )
}
