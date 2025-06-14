"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PageTitleHeader from "@/components/page-title-header"
import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldIcon,
  Loader2,
  AlertTriangle,
  FileTextIcon,
  UsersIcon,
  EyeIcon,
  ExternalLinkIcon,
} from "lucide-react"

// Configuration
const BADGE_MANAGER_APP_ID = 741171409 // Your Badge Manager App ID
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
const INDEXER_PORT = ""
const INDEXER_TOKEN = ""

const ADMIN_ADDRESSES = [
  "LEGENDMQQJJWSQVHRFK36EP7GTM3MTI3VD3GN25YMKJ6MEBR35J4SBNVD4", // Your admin address
  // Add more admin addresses as needed
]

const MENTOR_ADDRESSES = [
  "MENTOR_ADDRESS_1_HERE", // Replace with actual mentor address
  "MENTOR_ADDRESS_2_HERE", // Replace with actual mentor address
]

interface BadgeInfo {
  id: string // Badge App ID
  name: string
  totalUsers: number
  rawBoxName: string
}

export default function ApprovePage() {
  const { activeAccount, activeAddress } = useWallet()
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "mentor" | "unauthorized" | null>(null)

  // Check user authorization
  useEffect(() => {
    if (!activeAddress) {
      setUserRole(null)
      return
    }

    if (ADMIN_ADDRESSES.includes(activeAddress)) {
      setUserRole("admin")
    } else if (MENTOR_ADDRESSES.includes(activeAddress)) {
      setUserRole("mentor")
    } else {
      setUserRole("unauthorized")
    }
  }, [activeAddress])

  // Load badges and their applications
  const loadBadgesAndApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const localErrors: string[] = []

    try {
      const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
      const abiTypeString = algosdk.ABIType.from("(string)")
      const abiTypeUint64 = algosdk.ABIType.from("(uint64)")

      // 1. Fetch all badges from Badge Manager
      const boxesResponse = await indexerClient.searchForApplicationBoxes(BADGE_MANAGER_APP_ID).do()

      if (!boxesResponse.boxes || boxesResponse.boxes.length === 0) {
        setError("No badges found in the Badge Manager contract.")
        setBadges([])
        setIsLoading(false)
        return
      }

      const fetchedBadges: BadgeInfo[] = []

      // 2. Process each badge
      for (const box of boxesResponse.boxes) {
        if (!box.name) continue

        const rawBoxNameBase64 = Buffer.from(box.name).toString("base64")

        let badgeAppIdString: string
        try {
          const [appIdBigInt] = abiTypeUint64.decode(box.name) as [bigint]
          badgeAppIdString = appIdBigInt.toString()
        } catch (e) {
          localErrors.push(`Could not decode badge App ID from box name: ${rawBoxNameBase64}`)
          continue
        }

        // Get badge name from Badge Manager
        let badgeName: string
        try {
          const boxValueResponse = await indexerClient
            .lookupApplicationBoxByIDandName(BADGE_MANAGER_APP_ID, box.name)
            .do()

          let valueBytes: Uint8Array
          if (typeof boxValueResponse.value === "string") {
            valueBytes = Buffer.from(boxValueResponse.value, "base64")
          } else {
            valueBytes = boxValueResponse.value
          }

          try {
            const [decodedValue] = abiTypeString.decode(valueBytes) as [string]
            badgeName = decodedValue
          } catch (abiError: any) {
            if (abiError.message && abiError.message.includes("string length bytes do not match")) {
              badgeName = Buffer.from(valueBytes).toString("utf-8")
            } else {
              throw abiError
            }
          }

          if (!badgeName || badgeName.trim() === "") {
            badgeName = `Badge ID: ${badgeAppIdString}`
          }
        } catch (e: any) {
          localErrors.push(`Error fetching badge name for ${badgeAppIdString}: ${e.message}`)
          badgeName = `Badge ID: ${badgeAppIdString}`
        }

        // 3. Fetch users count from the individual badge contract
        let totalUsers = 0
        try {
          const userBoxesResponse = await indexerClient.searchForApplicationBoxes(Number(badgeAppIdString)).do()
          if (userBoxesResponse.boxes) {
            totalUsers = userBoxesResponse.boxes.length
          }
        } catch (e: any) {
          localErrors.push(`Error fetching users for badge ${badgeAppIdString}: ${e.message}`)
        }

        fetchedBadges.push({
          id: badgeAppIdString,
          name: badgeName,
          totalUsers: totalUsers,
          rawBoxName: rawBoxNameBase64,
        })
      }

      setBadges(fetchedBadges)

      if (localErrors.length > 0) {
        setError("Some data could not be loaded: " + localErrors.join("; "))
      }
    } catch (e: any) {
      console.error("Failed to load badges and applications:", e)
      setError(`Failed to load data: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userRole === "admin" || userRole === "mentor") {
      loadBadgesAndApplications()
    } else {
      setIsLoading(false)
    }
  }, [userRole, loadBadgesAndApplications])

  // Show connection prompt if not connected
  if (!activeAccount) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              <ShieldIcon className="mr-2 h-6 w-6 text-primary" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please connect your wallet to access the approval system.</p>
            <p className="text-sm text-muted-foreground">
              Only authorized admins and mentors can approve badge applications.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show unauthorized message
  if (userRole === "unauthorized") {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <XCircleIcon className="mr-2 h-6 w-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your wallet address is not authorized to access the approval system.
            </p>
            <p className="text-sm text-muted-foreground">
              Connected as: <span className="font-mono text-xs bg-muted px-1 rounded">{activeAddress}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact an administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading badge data from blockchain...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="text-center py-12 bg-destructive/10 border-destructive">
          <CardHeader>
            <div className="mx-auto bg-destructive/20 rounded-full p-3 w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-destructive">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/80 mb-4">{error}</p>
            <Button onClick={loadBadgesAndApplications} variant="destructive">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<CheckCircleIcon />}
        title="Badge Application Approval"
        subtitle={`Review badge data and applications as ${userRole}. Connected as: ${activeAddress?.substring(0, 8)}...${activeAddress?.substring(activeAddress.length - 8)}`}
      />

      {/* Badge Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Badges</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{badges.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered in Badge Manager</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{badges.reduce((sum, badge) => sum + badge.totalUsers, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all badges</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{userRole}</div>
            <p className="text-xs text-muted-foreground mt-1">Access level</p>
          </CardContent>
        </Card>
      </div>

      {/* Badge Details */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Management</CardTitle>
          <CardDescription>Click on a badge to review and approve its users</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No badges found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {badges.map((badge) => (
                <Card key={badge.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{badge.name}</CardTitle>
                    <CardDescription className="text-sm">
                      Badge App ID: <span className="font-mono text-xs bg-muted px-1 rounded">{badge.id}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Users:</span>
                      <span className="text-lg font-semibold">{badge.totalUsers}</span>
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0 flex justify-between items-center gap-2 border-t">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/approve/${badge.id}`}>
                        <EyeIcon className="mr-1.5 h-3.5 w-3.5" /> Manage Users
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a
                        href={`https://lora.algokit.io/testnet/application/${badge.id}/transactions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Explorer"
                      >
                        <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">View on Explorer</span>
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
