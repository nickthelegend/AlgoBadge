"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PageTitleHeader from "@/components/page-title-header"
import { AwardIcon, Loader2, AlertTriangle, UsersIcon, TagIcon, ArrowLeftIcon, ListChecks } from "lucide-react"

// Configuration
const BADGE_MANAGER_APP_ID = 741171409 // Your Badge Manager App ID
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
const INDEXER_PORT = ""
const INDEXER_TOKEN = ""

interface BadgeDetails {
  id: string
  name: string
  assetId?: number
  rawBoxNameInManager?: string // For debugging
}

interface RegisteredUser {
  address: string
  description: string // Email or other description
}

export default function BadgeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const badgeAppId = params.id as string

  const [badgeDetails, setBadgeDetails] = useState<BadgeDetails | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBadgeData = useCallback(async () => {
    if (!badgeAppId) {
      setError("Badge App ID is missing.")
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const localErrors: string[] = []

    try {
      const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
      const abiTypeString = algosdk.ABIType.from("(string)")
      const abiTypeUint64 = algosdk.ABIType.from("(uint64)")

      let fetchedBadgeName = `Badge ID: ${badgeAppId}` // Default name
      let rawBoxNameInManagerForDebug: string | undefined = undefined

      // 1. Fetch Badge Name from Badge Manager
      try {
        // The box name in Badge Manager is the uint64 encoded App ID of the badge
        const badgeAppIdAsUint64Bytes = abiTypeUint64.encode(BigInt(badgeAppId))
        rawBoxNameInManagerForDebug = Buffer.from(badgeAppIdAsUint64Bytes).toString("base64")

        const managerBoxValueResponse = await indexerClient
          .lookupApplicationBoxByIDandName(BADGE_MANAGER_APP_ID, badgeAppIdAsUint64Bytes)
          .do()

        let managerValueBytes: Uint8Array
        if (typeof managerBoxValueResponse.value === "string") {
          managerValueBytes = Buffer.from(managerBoxValueResponse.value, "base64")
        } else {
          managerValueBytes = managerBoxValueResponse.value
        }

        try {
          const [decodedName] = abiTypeString.decode(managerValueBytes) as [string]
          fetchedBadgeName = decodedName
        } catch (abiError: any) {
          if (abiError.message && abiError.message.includes("string length bytes do not match")) {
            fetchedBadgeName = Buffer.from(managerValueBytes).toString("utf-8")
          } else {
            throw abiError // Re-throw other ABI errors
          }
        }
      } catch (e: any) {
        localErrors.push(`Could not fetch badge name from Badge Manager: ${e.message}`)
        console.warn(`Could not fetch badge name for ${badgeAppId} from Badge Manager:`, e)
      }

      // 2. Fetch Asset ID from the badge contract's global state
      let fetchedAssetId: number | undefined = undefined
      try {
        const appInfo = await indexerClient.lookupApplications(Number(badgeAppId)).do()
        if (appInfo.application && appInfo.application.params && appInfo.application.params["global-state"]) {
          const globalState = appInfo.application.params["global-state"]
          const assetIdEntry = globalState.find((entry: any) => {
            const keyStr = Buffer.from(entry.key, "base64").toString()
            return keyStr === "assetID"
          })
          if (assetIdEntry && assetIdEntry.value.uint) {
            fetchedAssetId = Number(assetIdEntry.value.uint)
          } else {
            localErrors.push("assetID not found in global state of badge contract.")
          }
        } else {
          localErrors.push("Could not retrieve global state for badge contract.")
        }
      } catch (e: any) {
        localErrors.push(`Error fetching asset ID from global state: ${e.message}`)
        console.error(`Error fetching asset ID for ${badgeAppId}:`, e)
      }

      setBadgeDetails({
        id: badgeAppId,
        name: fetchedBadgeName,
        assetId: fetchedAssetId,
        rawBoxNameInManager: rawBoxNameInManagerForDebug,
      })

      // 3. Fetch Registered Users from the badge contract's boxes
      const fetchedUsers: RegisteredUser[] = []
      try {
        const userBoxesResponse = await indexerClient.searchForApplicationBoxes(Number(badgeAppId)).do()
        if (userBoxesResponse.boxes && userBoxesResponse.boxes.length > 0) {
          for (const box of userBoxesResponse.boxes) {
            if (!box.name) continue

            let userAddress = ""
            try {
              // Box name is expected to be raw public key bytes (32 bytes)
              if (box.name.length === 32) {
                userAddress = algosdk.encodeAddress(box.name)
              } else {
                // If not 32 bytes, it might be something else or an error in contract logic
                localErrors.push(`Box name for user is not 32 bytes: ${Buffer.from(box.name).toString("base64")}`)
                userAddress = `[Invalid Address Format: ${Buffer.from(box.name).toString("base64")}]`
              }
            } catch (addrError: any) {
              localErrors.push(
                `Could not decode user address from box name ${Buffer.from(box.name).toString("base64")}: ${addrError.message}`,
              )
              continue
            }

            let userDescription = "[No description]"
            try {
              const userBoxValueResponse = await indexerClient
                .lookupApplicationBoxByIDandName(Number(badgeAppId), box.name)
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
                } else {
                  // Log other ABI errors but don't stop processing other users
                  localErrors.push(`ABI decoding error for user ${userAddress} description: ${abiError.message}`)
                }
              }
            } catch (e: any) {
              localErrors.push(`Error fetching description for user ${userAddress}: ${e.message}`)
            }
            fetchedUsers.push({ address: userAddress, description: userDescription })
          }
        } else {
          localErrors.push("No registered users (boxes) found for this badge.")
        }
        setRegisteredUsers(fetchedUsers)
      } catch (e: any) {
        localErrors.push(`Error fetching registered users: ${e.message}`)
        console.error(`Error fetching registered users for ${badgeAppId}:`, e)
      }

      if (localErrors.length > 0) {
        setError(localErrors.join("; ")) // Concatenate errors or handle them more gracefully
      }
    } catch (e: any) {
      console.error("Overall fetch error for badge details:", e)
      setError(`Failed to load badge details: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [badgeAppId])

  useEffect(() => {
    fetchBadgeData()
  }, [fetchBadgeData])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading badge details...</p>
      </div>
    )
  }

  if (error && !badgeDetails) {
    // Show critical error if badgeDetails couldn't even be partially loaded
    return (
      <div className="container mx-auto p-4">
        <Button variant="outline" onClick={() => router.push("/badges")} className="mb-4">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Badges
        </Button>
        <Card className="text-center py-12 bg-destructive/10 border-destructive">
          <CardHeader>
            <div className="mx-auto bg-destructive/20 rounded-full p-3 w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-destructive">Error Loading Badge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/80 mb-4">{error}</p>
            <Button onClick={fetchBadgeData} variant="destructive">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!badgeDetails) {
    // Should be covered by error state, but as a fallback
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Badge not found or could not be loaded.</p>
        <Button variant="outline" onClick={() => router.push("/badges")} className="mt-4">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Badges
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Button variant="outline" onClick={() => router.push("/badges")} className="mb-6">
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to All Badges
      </Button>

      <PageTitleHeader
        icon={<AwardIcon />}
        title={badgeDetails.name}
        subtitle={`Details for Badge App ID: ${badgeDetails.id}`}
      />

      {error && ( // Display non-critical errors (e.g., if some parts failed but main details loaded)
        <Card className="mb-6 bg-amber-50 border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-700 text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Partial Data Warning
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-600 text-sm">
            <p>Some information might be missing or incomplete due to the following issues:</p>
            <pre className="mt-2 p-2 bg-amber-100 rounded text-xs whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badge App ID</CardTitle>
            <AwardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{badgeDetails.id}</div>
            {badgeDetails.rawBoxNameInManager && (
              <p className="text-xs text-muted-foreground mt-1">Manager Box Name: {badgeDetails.rawBoxNameInManager}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Associated Asset ID</CardTitle>
            <TagIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {badgeDetails.assetId !== undefined ? (
              <div className="text-2xl font-bold">{badgeDetails.assetId}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Not found or N/A</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">From badge contract global state</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registeredUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Count of users holding this badge</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            Registered User List
          </CardTitle>
          <CardDescription>Users who have been issued this badge according to its contract boxes.</CardDescription>
        </CardHeader>
        <CardContent>
          {registeredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      User Address
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Description / Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {registeredUsers.map((user, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                        <a
                          href={`https://app.dappflow.org/explorer/account/${user.address}/transactions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-primary"
                        >
                          {user.address.substring(0, 8)}...{user.address.substring(user.address.length - 8)}
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-normal text-sm text-muted-foreground break-all">
                        {user.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No registered users found for this badge, or data could not be loaded.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
