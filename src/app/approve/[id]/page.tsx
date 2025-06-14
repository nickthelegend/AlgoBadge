"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWallet } from "@txnlab/use-wallet-react"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"
import { MsigAppClient } from "@/contracts/MsigAppClient"
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
  UsersIcon,
  TagIcon,
  ArrowLeftIcon,
  ListChecks,
  AwardIcon,
  Settings,
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

const ADMIN_ADDRESSES = [
  "LEGENDMQQJJWSQVHRFK36EP7GTM3MTI3VD3GN25YMKJ6MEBR35J4SBNVD4", // Your admin address
  // Add more admin addresses as needed
]

const MENTOR_ADDRESSES = [
  "MENTOR_ADDRESS_1_HERE", // Replace with actual mentor address
  "MENTOR_ADDRESS_2_HERE", // Replace with actual mentor address
]

// Multisig configuration
const MASTER_ADDRESS = "DWZX2YSNBJFZS7P53TCW37MOZ4O2YOJTK75HMIBOBVBAILY4EZIF4DKC6Q"
const ADMIN_ADDRESS = "LEGENDMQQJJWSQVHRFK36EP7GTM3MTI3VD3GN25YMKJ6MEBR35J4SBNVD4"

interface BadgeDetails {
  id: string
  name: string
  assetId?: number
  rawBoxNameInManager?: string // For debugging
}

interface RegisteredUser {
  address: string
  approved: boolean
  description: string // desc field
  multiSignAppID: number // multiSignAppID field
  status: "pending" | "admin_approved" | "mentor_approved" | "fully_approved" | "rejected"
  adminSignature?: string
  mentorSignature?: string
}

// Mock MsigAppClient - replace with actual import


export default function ApproveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeAccount, activeAddress, transactionSigner } = useWallet()
  const badgeAppId = params.id as string

  const [badgeDetails, setBadgeDetails] = useState<BadgeDetails | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "mentor" | "unauthorized" | null>(null)
  const [isCreatingMultisig, setIsCreatingMultisig] = useState(false)

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
      const abiTypeString = algosdk.ABIType.from("(bool,string,uint64)")
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
          console.log("Global state for badge contract:", globalState) // Debug log

          const assetIdEntry = globalState.find((entry: any) => {
            // Decode the key properly
            let keyStr: string
            if (typeof entry.key === "string") {
              // entry.key is base64-encoded string
              keyStr = Buffer.from(entry.key, "base64").toString()
            } else {
              // entry.key is Uint8Array
              keyStr = Buffer.from(entry.key).toString()
            }
            console.log("Checking global state key:", keyStr) // Debug log
            return keyStr === "assetID"
          })

          if (assetIdEntry) {
            console.log("Found assetID entry:", assetIdEntry) // Debug log
            if (assetIdEntry.value && assetIdEntry.value.uint !== undefined) {
              fetchedAssetId = Number(assetIdEntry.value.uint)
              console.log("Decoded Asset ID:", fetchedAssetId)
            } else if (assetIdEntry.value && assetIdEntry.value.bytes) {
              // Sometimes asset ID might be stored as bytes, try to decode
              const assetIdBytes =
                typeof assetIdEntry.value.bytes === "string"
                  ? Buffer.from(assetIdEntry.value.bytes, "base64")
                  : Buffer.from(assetIdEntry.value.bytes)

              if (assetIdBytes.length === 8) {
                // Try to decode as uint64
                try {
                  const assetIdBigInt = algosdk.decodeUint64(assetIdBytes, "safe")
                  fetchedAssetId = Number(assetIdBigInt)
                  console.log("Decoded Asset ID from bytes:", fetchedAssetId)
                } catch (decodeError) {
                  localErrors.push(`Could not decode asset ID from bytes: ${decodeError}`)
                }
              } else {
                localErrors.push(`Asset ID bytes length unexpected: ${assetIdBytes.length}`)
              }
            } else {
              localErrors.push("assetID entry found but value format is unexpected.")
            }
          } else {
            localErrors.push("assetID key not found in global state of badge contract.")
            console.log(
              "Available global state keys:",
              globalState.map((entry: any) => {
                const keyStr =
                  typeof entry.key === "string"
                    ? Buffer.from(entry.key, "base64").toString()
                    : Buffer.from(entry.key).toString()
                return keyStr
              }),
            )
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

            let approved = false
            let userDescription = "[No description]"
            let multiSignAppID = 0
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
                const [decodedApproved, decodedDesc, decodedMultiSignAppID] = abiTypeString.decode(userValueBytes) as [
                  boolean,
                  string,
                  bigint,
                ]
                approved = decodedApproved
                userDescription = decodedDesc
                multiSignAppID = Number(decodedMultiSignAppID)
              } catch (abiError: any) {
                localErrors.push(`ABI decoding error for user ${userAddress}: ${abiError.message}`)
                // Fallback to try reading as string for backward compatibility
                try {
                  userDescription = Buffer.from(userValueBytes).toString("utf-8")
                } catch {
                  // Keep default values
                }
              }
            } catch (e: any) {
              localErrors.push(`Error fetching description for user ${userAddress}: ${e.message}`)
            }

            // Determine status based on approval and multisig app ID
            let status: RegisteredUser["status"] = "pending"
            if (approved && multiSignAppID > 0) {
              status = "fully_approved"
            } else if (approved) {
              status = "admin_approved"
            } else if (multiSignAppID > 0) {
              status = "mentor_approved"
            }

            fetchedUsers.push({
              address: userAddress,
              approved: approved,
              description: userDescription,
              multiSignAppID: multiSignAppID,
              status: status,
              adminSignature: approved ? "existing_approval" : undefined,
              mentorSignature: multiSignAppID > 0 ? "existing_approval" : undefined,
            })
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
    if (userRole === "admin" || userRole === "mentor") {
      fetchBadgeData()
    } else if (userRole === "unauthorized") {
      setIsLoading(false)
    }
  }, [userRole, fetchBadgeData])

  const handleAssignAppID = async (userAddress: string) => {
    if (!activeAccount || !transactionSigner) {
      toast.error("Please connect your wallet first.")
      return
    }

    setIsCreatingMultisig(true)
    toast.info("Creating Multisig App...", { autoClose: false, toastId: "multisig" })

    try {
      const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)

      // Configuration for multisig
      const addresses = [MASTER_ADDRESS, ADMIN_ADDRESS]
      const signaturesRequired = 2

      // Generate the multisig address
      const msig_addr = algosdk.multisigAddress({
        version: 1,
        threshold: Number(signaturesRequired),
        addrs: addresses,
      })
      console.log("msig_addr", msig_addr)

      // Initialize the Multisig App Client
      const appClient = new MsigAppClient(
        {
          resolveBy: "id",
          id: 0,
        },
        algodClient,
      )

      toast.update("multisig", { render: "Deploying Multisig Contract..." })

      // Deploy the contract
      const deployment = await appClient.create.deploy(
        {
          admin: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
        },
        {
          sender: {
            signer: transactionSigner,
            addr: activeAccount.address,
          },
        },
      )
      const app_id = deployment.appId

      toast.update("multisig", { render: "Setting up Multisig Contract..." })

      // Set up the Multisig contract
      const setup = await appClient.arc55Setup(
        {
          threshold: Number(signaturesRequired),
          addresses: addresses,
        },
        {
          sender: {
            addr: activeAccount.address,
            signer: transactionSigner,
          },
        },
      )

      console.log("Generated App ID:", app_id)

      toast.update("multisig", {
        render: `Multisig App created successfully! App ID: ${app_id}`,
        type: "success",
        autoClose: 5000,
      })

      // Update the user's multisig app ID in the local state
      setRegisteredUsers((prev) =>
        prev.map((user) =>
          user.address === userAddress ? { ...user, multiSignAppID: Number(app_id), status: "mentor_approved" } : user,
        ),
      )

      console.log(`Assigned App ID ${app_id} to user ${userAddress}`)
    } catch (error: any) {
      console.error("Error creating multisig app:", error)
      toast.update("multisig", {
        render: `Failed to create multisig app: ${error.message || "Unknown error"}`,
        type: "error",
        autoClose: 5000,
      })
    } finally {
      setIsCreatingMultisig(false)
    }
  }

  const handleApprove = async (userAddress: string, role: "admin" | "mentor") => {
    try {
      // In a real app, this would make an API call to update the approval status
      // and potentially trigger blockchain transactions

      setRegisteredUsers((prev) =>
        prev.map((user) => {
          if (user.address === userAddress) {
            const updated = { ...user }
            if (role === "admin") {
              updated.approved = true
              updated.status = updated.multiSignAppID > 0 ? "fully_approved" : "admin_approved"
              updated.adminSignature = `admin_sig_${Date.now()}`
            } else if (role === "mentor") {
              updated.status = updated.approved ? "fully_approved" : "mentor_approved"
              updated.mentorSignature = `mentor_sig_${Date.now()}`
            }
            return updated
          }
          return user
        }),
      )

      console.log(`${role} approved user ${userAddress} for badge ${badgeAppId}`)
    } catch (e: any) {
      console.error(`Error approving user:`, e)
    }
  }

  const handleReject = async (userAddress: string) => {
    try {
      setRegisteredUsers((prev) =>
        prev.map((user) => (user.address === userAddress ? { ...user, status: "rejected" } : user)),
      )
      console.log(`Rejected user ${userAddress} for badge ${badgeAppId}`)
    } catch (e: any) {
      console.error(`Error rejecting user:`, e)
    }
  }

  const getStatusBadge = (status: RegisteredUser["status"]) => {
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

  const canUserApprove = (user: RegisteredUser, role: "admin" | "mentor") => {
    if (role === "admin") {
      return !user.approved
    } else if (role === "mentor") {
      return user.multiSignAppID === 0
    }
    return false
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
        <Button variant="outline" onClick={() => router.push("/approve")} className="mb-4">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Approve Dashboard
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
        <Button variant="outline" onClick={() => router.push("/approve")} className="mt-4">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Approve Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Button variant="outline" onClick={() => router.push("/approve")} className="mb-6">
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Approve Dashboard
      </Button>

      <PageTitleHeader
        icon={<CheckCircleIcon />}
        title={`Approve: ${badgeDetails.name}`}
        subtitle={`Review and approve users for Badge App ID: ${badgeDetails.id} as ${userRole}`}
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
            <p className="text-xs text-muted-foreground mt-1">Users with this badge</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            User Approval Management
          </CardTitle>
          <CardDescription>
            Review and manage approval status for users who have been issued this badge.
          </CardDescription>
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
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Approved
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      MultiSign App ID
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {registeredUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                        <a
                          href={`https://app.dappflow.org/explorer/account/${user.address}/transactions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-primary"
                        >
                          {user.address.substring(0, 12)}...{user.address.substring(user.address.length - 12)}
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-normal text-sm text-muted-foreground break-all max-w-xs">
                        {user.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.approved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.approved ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-muted-foreground">
                        {user.multiSignAppID || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          {canUserApprove(user, userRole!) && user.status !== "rejected" && (
                            <Button size="sm" onClick={() => handleApprove(user.address, userRole!)} className="w-full">
                              <CheckCircleIcon className="mr-1 h-3 w-3" />
                              {userRole === "admin" ? "Approve" : "Mentor Approve"}
                            </Button>
                          )}

                          {userRole === "admin" && user.multiSignAppID === 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignAppID(user.address)}
                              disabled={isCreatingMultisig}
                              className="w-full"
                            >
                              {isCreatingMultisig ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Settings className="mr-1 h-3 w-3" />
                              )}
                              AssignAppID
                            </Button>
                          )}

                          {user.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(user.address)}
                              className="w-full"
                            >
                              <XCircleIcon className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          )}
                        </div>
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
