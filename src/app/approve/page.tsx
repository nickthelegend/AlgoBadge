"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PageTitleHeader from "@/components/page-title-header"
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserCheckIcon,
  ShieldIcon,
  Loader2,
  AlertTriangle,
  FileTextIcon,
  UsersIcon,
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
  pendingApplications: number
  totalUsers: number
}

interface PendingApplication {
  id: string
  badgeId: string
  badgeName: string
  applicantAddress: string
  description: string // From the box value
  submittedAt?: string
  status: "pending" | "admin_approved" | "mentor_approved" | "fully_approved" | "rejected"
}

export default function ApprovePage() {
  const { activeAccount, activeAddress } = useWallet()
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const [applications, setApplications] = useState<PendingApplication[]>([])
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
        setApplications([])
        setIsLoading(false)
        return
      }

      const fetchedBadges: BadgeInfo[] = []
      const allApplications: PendingApplication[] = []

      // 2. Process each badge
      for (const box of boxesResponse.boxes) {
        if (!box.name) continue

        let badgeAppIdString: string
        try {
          const [appIdBigInt] = abiTypeUint64.decode(box.name) as [bigint]
          badgeAppIdString = appIdBigInt.toString()
        } catch (e) {
          localErrors.push(`Could not decode badge App ID from box name: ${Buffer.from(box.name).toString("base64")}`)
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

        // 3. Fetch users/applications from the individual badge contract
        let totalUsers = 0
        const pendingApplications = 0
        try {
          const userBoxesResponse = await indexerClient.searchForApplicationBoxes(Number(badgeAppIdString)).do()

          if (userBoxesResponse.boxes && userBoxesResponse.boxes.length > 0) {
            totalUsers = userBoxesResponse.boxes.length

            // Process each user box to create applications
            for (const userBox of userBoxesResponse.boxes) {
              if (!userBox.name) continue

              let userAddress = ""
              try {
                if (userBox.name.length === 32) {
                  userAddress = algosdk.encodeAddress(userBox.name)
                } else {
                  localErrors.push(`Invalid user address format in badge ${badgeAppIdString}`)
                  continue
                }
              } catch (addrError: any) {
                localErrors.push(`Could not decode user address in badge ${badgeAppIdString}: ${addrError.message}`)
                continue
              }

              let userDescription = "[No description]"
              try {
                const userBoxValueResponse = await indexerClient
                  .lookupApplicationBoxByIDandName(Number(badgeAppIdString), userBox.name)
                  .do()

                let userValueBytes: Uint8Array
                if (typeof userBoxValueResponse.value === "string") {
                  userValueBytes = Buffer.from(userBoxValueResponse.value, "base64")
                } else {
                  userValueBytes = userBoxValueResponse.value
                }

                try {
                  const [decodedDesc] = abiTypeString.decode(userValueBytes) as [string]
                  userDescription = decodedDesc
                } catch (abiError: any) {
                  if (abiError.message && abiError.message.includes("string length bytes do not match")) {
                    userDescription = Buffer.from(userValueBytes).toString("utf-8")
                  }
                }
              } catch (e: any) {
                localErrors.push(`Error fetching description for user ${userAddress} in badge ${badgeAppIdString}`)
              }

              // Create application entry
              // Note: In a real system, you'd have additional metadata to determine if this is pending, approved, etc.
              // For now, we'll treat all entries as "approved" since they're already in the badge contract
              const application: PendingApplication = {
                id: `${badgeAppIdString}_${userAddress}`,
                badgeId: badgeAppIdString,
                badgeName: badgeName,
                applicantAddress: userAddress,
                description: userDescription,
                status: "fully_approved", // Since they're already in the contract
              }

              allApplications.push(application)
            }
          }
        } catch (e: any) {
          localErrors.push(`Error fetching users for badge ${badgeAppIdString}: ${e.message}`)
        }

        fetchedBadges.push({
          id: badgeAppIdString,
          name: badgeName,
          pendingApplications: pendingApplications,
          totalUsers: totalUsers,
        })
      }

      setBadges(fetchedBadges)
      setApplications(allApplications)

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

  const handleApprove = async (applicationId: string, role: "admin" | "mentor") => {
    try {
      // In a real app, this would make an API call to update the application status
      // and potentially trigger blockchain transactions

      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === applicationId) {
            const updated = { ...app }
            if (role === "admin") {
              updated.status = updated.status === "mentor_approved" ? "fully_approved" : "admin_approved"
            } else if (role === "mentor") {
              updated.status = updated.status === "admin_approved" ? "fully_approved" : "mentor_approved"
            }
            return updated
          }
          return app
        }),
      )

      console.log(`${role} approved application ${applicationId}`)
    } catch (e: any) {
      console.error(`Error approving application:`, e)
    }
  }

  const handleReject = async (applicationId: string) => {
    try {
      setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, status: "rejected" } : app)))
      console.log(`Rejected application ${applicationId}`)
    } catch (e: any) {
      console.error(`Error rejecting application:`, e)
    }
  }

  const getStatusBadge = (status: PendingApplication["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <ClockIcon className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "admin_approved":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <UserCheckIcon className="mr-1 h-3 w-3" />
            Admin Approved
          </Badge>
        )
      case "mentor_approved":
        return (
          <Badge variant="outline" className="text-purple-600 border-purple-600">
            <ShieldIcon className="mr-1 h-3 w-3" />
            Mentor Approved
          </Badge>
        )
      case "fully_approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircleIcon className="mr-1 h-3 w-3" />
            Fully Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircleIcon className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

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
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Badge Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Badge Overview</CardTitle>
          <CardDescription>Summary of all badges and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No badges found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Badge Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      App ID
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Total Users
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {badges.map((badge) => (
                    <tr key={badge.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{badge.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">{badge.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{badge.totalUsers}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/badges/${badge.id}`} target="_blank" rel="noopener noreferrer">
                            View Details
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Holders</CardTitle>
          <CardDescription>
            Users who have been issued badges (Note: In a real approval system, this would show pending applications)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No badge holders found.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{application.badgeName}</CardTitle>
                        <CardDescription className="text-sm">
                          Badge ID: {application.badgeId} • Holder: {application.applicantAddress.substring(0, 8)}...
                          {application.applicantAddress.substring(application.applicantAddress.length - 8)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center">
                        <FileTextIcon className="mr-2 h-4 w-4" />
                        Description
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">{application.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
