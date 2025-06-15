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
import { CheckCircleIcon, XCircleIcon, ClockIcon, UserCheckIcon, ShieldIcon, Loader2, AlertTriangle, UsersIcon, TagIcon, ArrowLeftIcon, ListChecks, AwardIcon, Settings } from 'lucide-react'
import { toast } from "react-toastify"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount"
import { BadgeContractClient } from "@/contracts/BadgeContractClient"

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
  sigID?: number
  rawBoxNameInManager?: string // For debugging
}

interface RegisteredUser {
  address: string
  description: string // desc field from (string,uint64) decoding
  multiSignAppID: number // multiSignAppID field from (string,uint64) decoding
  status: "pending" | "admin_approved" | "mentor_approved" | "fully_approved" | "rejected"
  adminSignature?: string
  mentorSignature?: string
}

// Helper functions for multisig operations
function combineUint64AndUint8(uint64: number, uint8: number) {
  const uint64buffer = algosdk.bigIntToBytes(uint64, 8)
  const uint8buffer = algosdk.bigIntToBytes(uint8, 1)
  const combinedbuffer = new Uint8Array(9)
  combinedbuffer.set(uint64buffer, 0)
  combinedbuffer.set(uint8buffer, 8)
  return combinedbuffer
}

function combineAddressAndUint64(address: string, uint64: number) {
  const addressbuffer = algosdk.decodeAddress(address).publicKey
  const uint64buffer = algosdk.bigIntToBytes(uint64, 8)
  const combinedbuffer = new Uint8Array(40)
  combinedbuffer.set(uint64buffer, 0)
  combinedbuffer.set(addressbuffer, 8)
  return combinedbuffer
}

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
  const [isApproving, setIsApproving] = useState(false)

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
      const abiTypeBadgeManager = algosdk.ABIType.from("(bool,string,uint64)") // For Badge Manager
      const abiTypeUserData = algosdk.ABIType.from("(string,uint64)") // For user data
      const abiTypeUint64 = algosdk.ABIType.from("(uint64)")

      let fetchedBadgeName = `Badge ID: ${badgeAppId}` // Default name
      let fetchedSigID: number | undefined = undefined
      let rawBoxNameInManagerForDebug: string | undefined = undefined

      console.log("=== STARTING BADGE DATA FETCH ===")
      console.log("Badge App ID:", badgeAppId)

      // 1. Fetch Badge Name and SigID from Badge Manager
      try {
        console.log("--- FETCHING FROM BADGE MANAGER ---")
        const badgeAppIdAsUint64Bytes = abiTypeUint64.encode(BigInt(badgeAppId))
        rawBoxNameInManagerForDebug = Buffer.from(badgeAppIdAsUint64Bytes).toString("base64")
        
        console.log("Badge Manager App ID:", BADGE_MANAGER_APP_ID)
        console.log("Box name (base64):", rawBoxNameInManagerForDebug)

        const managerBoxValueResponse = await indexerClient
          .lookupApplicationBoxByIDandName(BADGE_MANAGER_APP_ID, badgeAppIdAsUint64Bytes)
          .do()

        console.log("Manager box response:", managerBoxValueResponse)

        let managerValueBytes: Uint8Array
        if (typeof managerBoxValueResponse.value === "string") {
          managerValueBytes = Buffer.from(managerBoxValueResponse.value, "base64")
        } else {
          managerValueBytes = managerBoxValueResponse.value
        }

        console.log("Manager value bytes length:", managerValueBytes.length)
        console.log("Manager value bytes (hex):", Buffer.from(managerValueBytes).toString("hex"))

        try {
          const [status, desc, sigID] = abiTypeBadgeManager.decode(managerValueBytes) as [boolean, string, bigint]
          fetchedBadgeName = desc
          fetchedSigID = Number(sigID)
          
          console.log("BADGE MANAGER ABI DECODING SUCCESSFUL:")
          console.log("- Status:", status)
          console.log("- Description:", desc)
          console.log("- SigID:", fetchedSigID)
        } catch (abiError: any) {
          console.error("Badge Manager ABI decoding failed:", abiError)
          localErrors.push(`Badge Manager ABI decoding failed: ${abiError.message}`)
          
          // Fallback to string decoding
          try {
            fetchedBadgeName = Buffer.from(managerValueBytes).toString("utf-8")
            console.log("Fallback string decoding:", fetchedBadgeName)
          } catch (fallbackError) {
            console.error("Fallback string decoding also failed:", fallbackError)
          }
        }
      } catch (e: any) {
        localErrors.push(`Could not fetch badge data from Badge Manager: ${e.message}`)
        console.error("Badge Manager fetch error:", e)
      }

      // 2. Fetch Asset ID from the badge contract's global state
      let fetchedAssetId: number | undefined = undefined
      try {
        console.log("--- FETCHING ASSET ID FROM BADGE CONTRACT ---")
        const appInfo = await indexerClient.lookupApplications(Number(badgeAppId)).do()
        
        if (appInfo.application && appInfo.application.params && appInfo.application.params["global-state"]) {
          const globalState = appInfo.application.params["global-state"]
          console.log("Badge contract global state:", globalState)

          const assetIdEntry = globalState.find((entry: any) => {
            let keyStr: string
            if (typeof entry.key === "string") {
              keyStr = Buffer.from(entry.key, "base64").toString()
            } else {
              keyStr = Buffer.from(entry.key).toString()
            }
            console.log("Checking global state key:", keyStr)
            return keyStr === "assetID"
          })

          if (assetIdEntry) {
            console.log("Found assetID entry:", assetIdEntry)
            if (assetIdEntry.value && assetIdEntry.value.uint !== undefined) {
              fetchedAssetId = Number(assetIdEntry.value.uint)
              console.log("Asset ID decoded:", fetchedAssetId)
            }
          } else {
            console.log("assetID key not found in global state")
            localErrors.push("assetID key not found in global state of badge contract.")
          }
        }
      } catch (e: any) {
        localErrors.push(`Error fetching asset ID: ${e.message}`)
        console.error("Asset ID fetch error:", e)
      }

      setBadgeDetails({
        id: badgeAppId,
        name: fetchedBadgeName,
        assetId: fetchedAssetId,
        sigID: fetchedSigID,
        rawBoxNameInManager: rawBoxNameInManagerForDebug,
      })

      // 3. Fetch ALL boxes and decode user data with (string,uint64) ABI type
      console.log("--- FETCHING USER BOXES FROM BADGE CONTRACT ---")
      const fetchedUsers: RegisteredUser[] = []
      
      try {
        const userBoxesResponse = await indexerClient.searchForApplicationBoxes(Number(badgeAppId)).do()
        console.log("User boxes response:", userBoxesResponse)
        
        if (userBoxesResponse.boxes && userBoxesResponse.boxes.length > 0) {
          console.log(`Found ${userBoxesResponse.boxes.length} boxes`)
          
          for (let i = 0; i < userBoxesResponse.boxes.length; i++) {
            const box = userBoxesResponse.boxes[i]
            console.log(`\n--- PROCESSING BOX ${i + 1}/${userBoxesResponse.boxes.length} ---`)
            
            if (!box.name) {
              console.log("Box has no name, skipping")
              continue
            }

            // Decode user address from box name
            let userAddress = ""
            try {
              if (box.name.length === 32) {
                userAddress = algosdk.encodeAddress(box.name)
                console.log("User address decoded:", userAddress)
              } else {
                const boxNameBase64 = Buffer.from(box.name).toString("base64")
                console.log("Invalid box name length:", box.name.length, "base64:", boxNameBase64)
                localErrors.push(`Box name for user is not 32 bytes: ${boxNameBase64}`)
                userAddress = `[Invalid Address Format: ${boxNameBase64}]`
              }
            } catch (addrError: any) {
              const boxNameBase64 = Buffer.from(box.name).toString("base64")
              console.error("Address decoding error:", addrError)
              localErrors.push(`Could not decode user address from box name ${boxNameBase64}: ${addrError.message}`)
              continue
            }

            // Fetch and decode box value
            let userDescription = "[No description]"
            let multiSignAppID = 0
            
            try {
              console.log("Fetching box value for user:", userAddress)
              const userBoxValueResponse = await indexerClient
                .lookupApplicationBoxByIDandName(Number(badgeAppId), box.name)
                .do()

              console.log("User box value response:", userBoxValueResponse)

              let userValueBytes: Uint8Array
              if (typeof userBoxValueResponse.value === "string") {
                userValueBytes = Buffer.from(userBoxValueResponse.value, "base64")
              } else {
                userValueBytes = userBoxValueResponse.value
              }

              console.log("User value bytes length:", userValueBytes.length)
              console.log("User value bytes (hex):", Buffer.from(userValueBytes).toString("hex"))

              // Decode with (string,uint64) ABI type
              try {
                const [decodedDesc, decodedMultiSignAppID] = abiTypeUserData.decode(userValueBytes) as [string, bigint]
                userDescription = decodedDesc
                multiSignAppID = Number(decodedMultiSignAppID)
                
                console.log("USER DATA ABI DECODING SUCCESSFUL:")
                console.log("- Description:", userDescription)
                console.log("- MultiSign App ID:", multiSignAppID)
              } catch (abiError: any) {
                console.error("User data ABI decoding failed:", abiError)
                localErrors.push(`ABI decoding error for user ${userAddress}: ${abiError.message}`)
                
                // Fallback to string decoding
                try {
                  userDescription = Buffer.from(userValueBytes).toString("utf-8")
                  console.log("Fallback string decoding for user:", userDescription)
                } catch (fallbackError) {
                  console.error("Fallback string decoding failed:", fallbackError)
                }
              }
            } catch (e: any) {
              console.error("Error fetching box value for user:", userAddress, e)
              localErrors.push(`Error fetching data for user ${userAddress}: ${e.message}`)
            }

            // Determine status based on multiSignAppID
            let status: RegisteredUser["status"] = "pending"
            if (multiSignAppID > 0) {
              status = "mentor_approved" // Has multisig app assigned
            }

            const userData: RegisteredUser = {
              address: userAddress,
              description: userDescription,
              multiSignAppID: multiSignAppID,
              status: status,
              adminSignature: undefined,
              mentorSignature: multiSignAppID > 0 ? "existing_approval" : undefined,
            }

            console.log("Final user data:", userData)
            fetchedUsers.push(userData)
          }
        } else {
          console.log("No boxes found for this badge")
          localErrors.push("No registered users (boxes) found for this badge.")
        }
        
        console.log(`\n=== FINAL RESULTS ===`)
        console.log(`Total users processed: ${fetchedUsers.length}`)
        setRegisteredUsers(fetchedUsers)
      } catch (e: any) {
        localErrors.push(`Error fetching registered users: ${e.message}`)
        console.error("User boxes fetch error:", e)
      }

      if (localErrors.length > 0) {
        console.log("=== ERRORS ENCOUNTERED ===")
        localErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`)
        })
        setError(localErrors.join("; "))
      }

      console.log("=== BADGE DATA FETCH COMPLETE ===")
    } catch (e: any) {
      console.error("Overall fetch error:", e)
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
      const app_address = deployment.appAddress

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
      const suggestedParams = await algodClient.getTransactionParams().do()
      if (!activeAddress || !transactionSigner) {
        toast.error("Please connect your wallet and ensure badge data is loaded.")
        return
      }
      console.log("Generated App ID:", app_id)
      

      toast.update("applying", { render: "Signing transactions..." })
      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
        indexerConfig: {
          server: "https://testnet-api.algonode.cloud", // Corrected: was algonode.cloud, should be idx for indexer
          port: "",
          token: "",
        },
      })

      const newBadgeContract = algorand.client.getTypedAppClientById(BadgeContractClient, {
        appId: BigInt(badgeAppId),
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
      })
      await algorand
      .newGroup()
      .addAppCallMethodCall(
        await newBadgeContract.params.assignAppId({
          args: { 
            
            appId: BigInt(app_id)

          
            
          },
          // Consider adding explicit fees if needed: , { fee: AlgoAmount.MicroAlgos(2000) }
        }),
      )
      .send({ populateAppCallResources: true })



     await algorand.newGroup()
      .addPayment({
        sender: activeAddress,
        receiver: app_address,
        amount: AlgoAmount.MicroAlgos(100_000),
        signer: transactionSigner,
      })
      .send({ populateAppCallResources: true })
      // Sign both transactions
      // const signedTxns = await transactionSigner(txns, [0, 1])

      toast.update("applying", { render: "Sending transactions to network..." })
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

  const getNewGroupId = async (appClient: MsigAppClient) => {
    const global = await appClient.getGlobalState()
    if (global.arc55_nonce) {
      const nonce = global.arc55_nonce?.asNumber()
      return nonce + 1
    } else {
      return 1
    }
  }

  const handleApprove = async (userAddress: string, role: "admin" | "mentor") => {
    if (!activeAccount || !transactionSigner) {
      toast.error("Please connect your wallet first.")
      return
    }

    const user = registeredUsers.find((u) => u.address === userAddress)
    if (!user) {
      toast.error("User not found.")
      return
    }

    // If user has a multisig app ID, use multisig flow
    if (user.multiSignAppID > 0) {
      setIsApproving(true)
      toast.info("Creating multisig transaction for approval...", { autoClose: false, toastId: "approving" })

      try {
        const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)

        // Initialize the Multisig App Client with the user's multisig app ID
        const appClient = new MsigAppClient(
          {
            resolveBy: "id",
            id: Number(user.multiSignAppID),
          },
          algodClient,
        )

        // Get app reference and multisig details
        const appReference = await appClient.appClient.getAppReference()
        const global = await appClient.getGlobalState()

        let threshold = 2
        const addresses: string[] = [MASTER_ADDRESS, ADMIN_ADDRESS]

        if (global.arc55_threshold) {
          threshold = global.arc55_threshold.asNumber()
        }

        // Get addresses from global state
        const rawGlobal = await appClient.appClient.getGlobalState()
        const addressList: { index: number; address: string }[] = []
        Object.keys(rawGlobal).forEach((key) => {
          const val = rawGlobal[key]
          if (val.keyRaw.length === 8) {
            addressList.push({
              index: Number(algosdk.bytesToBigInt(val.keyRaw)),
              address: "valueRaw" in val ? algosdk.encodeAddress(val.valueRaw) : "",
            })
          }
        })

        const orderedAddresses = addressList.sort((a, b) => a.index - b.index)
        const onlyAddresses = orderedAddresses.map((a) => a.address)

        const multiSig = algosdk.multisigAddress({
          version: 1,
          threshold: threshold,
          addrs: onlyAddresses,
        })

        console.log("Multisig address:", multiSig)

        toast.update("approving", { render: "Creating approval transaction..." })

        // Create a test transaction (you can modify this to be the actual approval transaction)
        const encoder = new TextEncoder()
        const approvalTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: multiSig,
          receiver: multiSig,
          amount: 0,
          suggestedParams: await algodClient.getTransactionParams().do(),
          note: encoder.encode(`Approval for ${userAddress} by ${role}`),
        })

        const txnSize = approvalTxn.toByte().length
        const mbrCost = 2500 + 400 * (9 + txnSize)

        const newGroupId = await getNewGroupId(appClient)

        const add_txn_mbr = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAccount.address,
          receiver: appReference.appAddress,
          amount: mbrCost,
          suggestedParams: await algodClient.getTransactionParams().do(),
        })

        const boxes = Array.from({ length: 8 }, () => ({
          appIndex: 0,
          name: combineUint64AndUint8(newGroupId, 0),
        }))

        const final_txn = appClient
          .compose()
          .arc55NewTransactionGroup(
            {},
            {
              sender: {
                signer: transactionSigner,
                addr: activeAccount.address,
              },
            },
          )
          .arc55AddTransaction(
            {
              costs: add_txn_mbr,
              transactionGroup: newGroupId,
              index: 0,
              transaction: approvalTxn.toByte(),
            },
            {
              sender: {
                signer: transactionSigner,
                addr: activeAccount.address,
              },
              boxes: boxes,
            },
          )

        const res = await final_txn.execute()
        console.log(`Approval Transaction Created: ${res.txIds[1]}\ngroup: ${newGroupId}`)

        toast.update("approving", {
          render: `Multisig approval transaction created! Group: ${newGroupId}`,
          type: "success",
          autoClose: 5000,
        })

        // Update the user's status in local state
        setRegisteredUsers((prev) =>
          prev.map((u) => {
            if (u.address === userAddress) {
              const updated = { ...u }
              if (role === "admin") {
                updated.status = "fully_approved"
                updated.adminSignature = `multisig_approval_${Date.now()}`
              } else if (role === "mentor") {
                updated.status = "mentor_approved"
                updated.mentorSignature = `multisig_approval_${Date.now()}`
              }
              return updated
            }
            return u
          }),
        )

        console.log(`${role} created multisig approval for user ${userAddress} in group ${newGroupId}`)
      } catch (error: any) {
        console.error("Error creating multisig approval:", error)
        toast.update("approving", {
          render: `Failed to create multisig approval: ${error.message || "Unknown error"}`,
          type: "error",
          autoClose: 5000,
        })
      } finally {
        setIsApproving(false)
      }
    } else {
      // Regular approval flow (no multisig)
      try {
        setRegisteredUsers((prev) =>
          prev.map((u) => {
            if (u.address === userAddress) {
              const updated = { ...u }
              if (role === "admin") {
                updated.status = "admin_approved"
                updated.adminSignature = `admin_sig_${Date.now()}`
              } else if (role === "mentor") {
                updated.status = "mentor_approved"
                updated.mentorSignature = `mentor_sig_${Date.now()}`
              }
              return updated
            }
            return u
          }),
        )

        console.log(`${role} approved user ${userAddress} for badge ${badgeAppId}`)
        toast.success(`User approved successfully!`)
      } catch (e: any) {
        console.error(`Error approving user:`, e)
        toast.error(`Failed to approve user: ${e.message}`)
      }
    }
  }

  const handleReject = async (userAddress: string) => {
    try {
      setRegisteredUsers((prev) =>
        prev.map((user) => (user.address === userAddress ? { ...user, status: "rejected" } : user)),
      )
      console.log(`Rejected user ${userAddress} for badge ${badgeAppId}`)
      toast.success("User rejected successfully!")
    } catch (e: any) {
      console.error(`Error rejecting user:`, e)
      toast.error(`Failed to reject user: ${e.message}`)
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
      return user.status !== "fully_approved" && user.status !== "admin_approved"
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
            <p className="text-xs text-muted-foreground mt-1">From badge contract global state</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signature ID</CardTitle>
            <ShieldIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {badgeDetails.sigID !== undefined ? (
              <div className="text-2xl font-bold">{badgeDetails.sigID}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Not found or N/A</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">From badge manager</p>
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
                      Description
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
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
                          href={`https://lora.algokit.io/testnet/account/${user.address}/transactions`}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-muted-foreground">
                        {user.multiSignAppID || "Not assigned"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          {canUserApprove(user, userRole!) && user.status !== "rejected" && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.address, userRole!)}
                              disabled={isApproving}
                              className="w-full"
                            >
                              {isApproving ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircleIcon className="mr-1 h-3 w-3" />
                              )}
                              {userRole === "admin" ? "Approve" : "Mentor Approve"}
                              {user.multiSignAppID > 0 && " (Multisig)"}
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
