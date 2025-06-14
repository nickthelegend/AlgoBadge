"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWallet } from "@txnlab/use-wallet-react"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import PageTitleHeader from "@/components/page-title-header"
import {
  AwardIcon,
  Loader2,
  AlertTriangle,
  UsersIcon,
  TagIcon,
  ArrowLeftIcon,
  ListChecks,
  Send,
  CheckCircle,
  FileText,
} from "lucide-react"
import { toast } from "react-toastify"

// Configuration
const BADGE_MANAGER_APP_ID = 741171409 // Your Badge Manager App ID
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
const ALGOD_SERVER = "https://testnet-api.algonode.cloud"
const INDEXER_PORT = ""
const INDEXER_TOKEN = ""
const ALGOD_PORT = ""
const ALGOD_TOKEN = ""

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
  const { activeAccount, activeAddress, transactionSigner } = useWallet()
  const badgeAppId = params.id as string

  const [badgeDetails, setBadgeDetails] = useState<BadgeDetails | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Application form state
  const [applicationDescription, setApplicationDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [userAlreadyRegistered, setUserAlreadyRegistered] = useState(false)

  const fetchAssetIdFromAPI = useCallback(async (appId: string): Promise<number | undefined> => {
    try {
      const response = await fetch(`${INDEXER_SERVER}/v2/applications/${appId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const globalState = data.application?.params?.["global-state"]

      if (!globalState) {
        console.warn("No global state found for application")
        return undefined
      }

      // Look for the assetID key (base64 encoded "assetID" is "YXNzZXRJRA==")
      const assetIdEntry = globalState.find((entry: any) => entry.key === "YXNzZXRJRA==")

      if (assetIdEntry && assetIdEntry.value && assetIdEntry.value.uint !== undefined) {
        return Number(assetIdEntry.value.uint)
      }

      console.warn("Asset ID not found in global state")
      return undefined
    } catch (error) {
      console.error("Error fetching asset ID from API:", error)
      return undefined
    }
  }, [])

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
            throw abiError
          }
        }
      } catch (e: any) {
        localErrors.push(`Could not fetch badge name from Badge Manager: ${e.message}`)
        console.warn(`Could not fetch badge name for ${badgeAppId} from Badge Manager:`, e)
      }

      // 2. Fetch Asset ID using the new API method
      const fetchedAssetId = await fetchAssetIdFromAPI(badgeAppId)
      if (!fetchedAssetId) {
        localErrors.push("Could not fetch Asset ID from badge contract")
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
              if (box.name.length === 32) {
                userAddress = algosdk.encodeAddress(box.name)
              } else {
                localErrors.push(`Box name for user is not 32 bytes: ${Buffer.from(box.name).toString("base64")}`)
                userAddress = `[Invalid Address Format: ${Buffer.from(box.name).toString("base64")}]`
              }
            } catch (addrError: any) {
              localErrors.push(
                `Could not decode user address from box name ${Buffer.from(box.name).toString("base64")}: ${addrError.message}`,
              )
              continue
            }

            // Check if current user is already registered
            if (activeAddress && userAddress === activeAddress) {
              setUserAlreadyRegistered(true)
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
        setError(localErrors.join("; "))
      }
    } catch (e: any) {
      console.error("Overall fetch error for badge details:", e)
      setError(`Failed to load badge details: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [badgeAppId, activeAddress, fetchAssetIdFromAPI])

  useEffect(() => {
    fetchBadgeData()
  }, [fetchBadgeData])

  const handleApplyForBadge = async () => {
    if (!activeAddress || !transactionSigner || !badgeDetails?.assetId) {
      toast.error("Please connect your wallet and ensure badge data is loaded.")
      return
    }

    if (!applicationDescription.trim()) {
      toast.error("Please provide a description for your application.")
      return
    }

    setIsSubmitting(true)
    toast.info("Preparing transactions...", { autoClose: false, toastId: "applying" })

    try {
      const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
      const suggestedParams = await algodClient.getTransactionParams().do()

      // Create the registerEvent transaction
      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: Number(badgeAppId),
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "registerEvent",
                  desc: "",
                  args: [{ type: "string", name: "email", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "registerEvent",
            )
            .getSelector(),
          new algosdk.ABIStringType().encode(applicationDescription.trim()),
        ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAddress).publicKey }],
        foreignAssets: [badgeDetails.assetId],
      })

      // Create the opt-in transaction
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        assetIndex: badgeDetails.assetId,
        amount: 0,
        suggestedParams,
      })

      // Group the transactions
      const txns = [optInTxn, txn]
      algosdk.assignGroupID(txns)

      toast.update("applying", { render: "Signing transactions..." })

      // Sign both transactions
      const signedTxns = await transactionSigner(txns, [0, 1])

      toast.update("applying", { render: "Sending transactions to network..." })

      // Send the signed group to the network
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()

      toast.update("applying", {
        render: "Application submitted successfully!",
        type: "success",
        autoClose: 5000,
      })

      console.log("Transaction ID:", txid)
      setHasApplied(true)
      setApplicationDescription("")

      // Refresh badge data to show the new registration
      setTimeout(() => {
        fetchBadgeData()
      }, 3000)
    } catch (error: any) {
      console.error("Error applying for badge:", error)
      toast.update("applying", {
        render: `Application failed: ${error.message || "Unknown error"}`,
        type: "error",
        autoClose: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading badge details...</p>
      </div>
    )
  }

  if (error && !badgeDetails) {
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
        subtitle={`Badge App ID: ${badgeDetails.id} • Apply for this badge or view registered users`}
      />

      {error && (
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
            <p className="text-xs text-muted-foreground mt-1">From badge contract API</p>
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

      {/* Application Form */}
      {!userAlreadyRegistered && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="mr-2 h-5 w-5 text-primary" />
              Apply for This Badge
            </CardTitle>
            <CardDescription>
              Submit your application to earn this badge. You'll need to opt-in to the associated asset and register
              your details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeAccount ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Please connect your wallet to apply for this badge.</p>
              </div>
            ) : hasApplied ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700 mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground">
                  Your application has been submitted successfully. The page will refresh shortly to show your
                  registration.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="application-description" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    Description / Email
                  </Label>
                  <Textarea
                    id="application-description"
                    value={applicationDescription}
                    onChange={(e) => setApplicationDescription(e.target.value)}
                    placeholder="Provide your email address or a brief description of why you deserve this badge..."
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleApplyForBadge}
                    disabled={isSubmitting || !applicationDescription.trim() || !badgeDetails.assetId}
                    className="min-w-[150px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Apply for Badge
                      </>
                    )}
                  </Button>
                </div>

                {!badgeDetails.assetId && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                    ⚠️ Asset ID not found. Application may not work properly.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Already Registered Message */}
      {userAlreadyRegistered && (
        <Card className="mb-8 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <CheckCircle className="mr-2 h-5 w-5" />
              You Already Have This Badge!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-600">
              Congratulations! You are already registered for this badge. You can see your entry in the registered users
              list below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Registered Users List */}
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
                    <tr key={index} className={user.address === activeAddress ? "bg-green-50" : ""}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                        <div className="flex items-center">
                          <a
                            href={`https://app.dappflow.org/explorer/account/${user.address}/transactions`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-primary"
                          >
                            {user.address.substring(0, 8)}...{user.address.substring(user.address.length - 8)}
                          </a>
                          {user.address === activeAddress && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">You</span>
                          )}
                        </div>
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
