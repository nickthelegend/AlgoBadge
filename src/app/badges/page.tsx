"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import * as algosdk from "algosdk"
import { Buffer } from "buffer" // Ensure Buffer is available

import PageTitleHeader from "@/components/page-title-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AwardIcon, PlusCircleIcon, Edit3Icon, Trash2Icon, Loader2, AlertTriangle } from "lucide-react"

// Configuration
const BADGE_MANAGER_APP_ID = 741171409 // Your Badge Manager App ID
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
const INDEXER_PORT = ""
const INDEXER_TOKEN = ""

interface BadgeInfo {
  id: string // This will be the App ID of the badge contract
  name: string
  rawBoxName: string // For debugging
}

interface DebugInfo {
  appId: number
  boxCount?: number
  timestamp: string
  errors?: string[]
  processedBoxNames?: string[]
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const fetchBadges = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const newDebugInfo: DebugInfo = {
      appId: BADGE_MANAGER_APP_ID,
      timestamp: new Date().toISOString(),
      errors: [],
      processedBoxNames: [],
    }

    try {
      const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
      const abiTypeString = algosdk.ABIType.from("(string)")
      const abiTypeUint64 = algosdk.ABIType.from("(uint64)") // For decoding box names

      newDebugInfo.appId = BADGE_MANAGER_APP_ID

      const boxesResponse = await indexerClient.searchForApplicationBoxes(BADGE_MANAGER_APP_ID).do()
      newDebugInfo.boxCount = boxesResponse.boxes.length

      if (!boxesResponse.boxes || boxesResponse.boxes.length === 0) {
        setError("No badges found. The Badge Manager may not have any registered badges yet.")
        setBadges([])
        setIsLoading(false)
        setDebugInfo(newDebugInfo)
        return
      }

      const fetchedBadges: BadgeInfo[] = []

      for (const box of boxesResponse.boxes) {
        if (!box.name) continue

        const rawBoxNameBase64 = Buffer.from(box.name).toString("base64")
        newDebugInfo.processedBoxNames?.push(rawBoxNameBase64)

        let badgeAppIdString: string
        try {
          // Decode box name using ABIType.from("(uint64)")
          const [appIdBigInt] = abiTypeUint64.decode(box.name) as [bigint]
          badgeAppIdString = appIdBigInt.toString()
        } catch (e) {
          const errorMsg = `Could not decode box name as uint64: ${rawBoxNameBase64}. Error: ${(e as Error).message}`
          console.warn(errorMsg, e)
          newDebugInfo.errors?.push(`Skipping box: ${errorMsg}`)
          continue
        }

        try {
          const boxValueResponse = await indexerClient
            .lookupApplicationBoxByIDandName(BADGE_MANAGER_APP_ID, box.name) // box.name must be Uint8Array
            .do()

          let valueBytes: Uint8Array
          if (typeof boxValueResponse.value === "string") {
            valueBytes = Buffer.from(boxValueResponse.value, "base64")
          } else {
            valueBytes = boxValueResponse.value
          }

          let badgeName: string
          try {
            // Attempt to decode as ABI (string)
            const decodedValue = abiTypeString.decode(valueBytes) as [string]
            badgeName = decodedValue[0]
          } catch (abiError: any) {
            // If ABI decoding fails with the specific length error, try raw UTF-8
            if (abiError.message && abiError.message.includes("string length bytes do not match")) {
              console.warn(
                `ABI string decoding failed for box ${rawBoxNameBase64} (App ID: ${badgeAppIdString}). Falling back to raw UTF-8. Error: ${abiError.message}`,
              )
              badgeName = Buffer.from(valueBytes).toString("utf-8")
              // Basic check for non-printable characters or excessive length if it's a raw string
              if (badgeName.length > 100 || (/[\x00-\x1F\x7F]/.test(badgeName) && !/[\t\n\r]/.test(badgeName))) {
                console.warn(
                  `Raw UTF-8 decoding for box ${rawBoxNameBase64} resulted in suspicious string: "${badgeName.substring(0, 50)}..."`,
                )
                // Potentially mark as undecodable or use a placeholder
                // badgeName = `[Undecodable value for ${badgeAppIdString}]`;
              }
            } else {
              // Re-throw if it's a different ABI error
              throw abiError
            }
          }

          // If badgeName is empty after attempting decodes, provide a placeholder
          if (!badgeName || badgeName.trim() === "") {
            badgeName = `[No name found for App ID: ${badgeAppIdString}]`
            newDebugInfo.errors?.push(
              `Empty or undecodable name for box ${rawBoxNameBase64} (App ID: ${badgeAppIdString}).`,
            )
          }

          fetchedBadges.push({
            id: badgeAppIdString,
            name: badgeName,
            rawBoxName: rawBoxNameBase64,
          })
        } catch (e: any) {
          const errorMsg = `Error processing value for box ${rawBoxNameBase64} (App ID: ${badgeAppIdString}): ${e.message}`
          console.error(errorMsg, e)
          newDebugInfo.errors?.push(errorMsg)
        }
      }

      setDebugInfo(newDebugInfo) // Update debug info once after the loop
      setBadges(fetchedBadges)

      if (fetchedBadges.length === 0 && (newDebugInfo.errors?.length ?? 0) > 0) {
        setError(
          "Processed boxes but found no valid badges. Check debug info or contract data. Errors: " +
            newDebugInfo.errors?.join("; "),
        )
      } else if (fetchedBadges.length === 0 && boxesResponse.boxes.length > 0) {
        setError("Found boxes, but could not decode any valid badge data.")
      }
    } catch (e: any) {
      console.error("Failed to fetch badges:", e)
      setError(`Failed to fetch badges: ${e.message}`)
      newDebugInfo.errors?.push(`General fetch error: ${e.message}`)
    } finally {
      setIsLoading(false)
      // Set debug info here as well to capture general errors
      setDebugInfo(newDebugInfo)
    }
  }, [])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<AwardIcon />}
        title="Manage Badges"
        subtitle="Browse existing badge types registered in the Badge Manager contract."
        actionButton={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/badges/new">
              <PlusCircleIcon className="mr-2 h-4 w-4" /> Create New Badge Type
            </Link>
          </Button>
        }
      />

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading badges from blockchain...</p>
        </div>
      )}

      {error && !isLoading && (
        <Card className="text-center py-12 bg-destructive/10 border-destructive">
          <CardHeader>
            <div className="mx-auto bg-destructive/20 rounded-full p-3 w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-destructive">Error Fetching Badges</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchBadges} variant="destructive">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && badges.length === 0 && (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No Badge Types Found</CardTitle>
            <CardDescription>
              There are currently no badges registered in the Badge Manager contract, or they could not be loaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/badges/new">
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Create First Badge Type
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && badges.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => (
            <Card key={badge.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{badge.name}</CardTitle>
                <CardDescription className="text-sm">
                  Badge App ID: <span className="font-mono text-xs bg-muted px-1 rounded">{badge.id}</span>
                  <br />
                  <span className="text-xs">Raw Box Name: {badge.rawBoxName}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-xs text-muted-foreground">This badge is registered in the Badge Manager.</p>
              </CardContent>
              <CardFooter className="mt-auto flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://app.dappflow.org/explorer/application/${badge.id}/transactions`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Edit3Icon className="mr-1.5 h-3.5 w-3.5" /> View on Explorer
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive"
                  onClick={() =>
                    alert(`Deletion of badge ${badge.name} (App ID: ${badge.id}) requires a contract call.`)
                  }
                >
                  <Trash2Icon className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {debugInfo && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1 break-all">
            <p>Badge Manager App ID: {debugInfo.appId}</p>
            <p>Boxes Found (Reported by Indexer): {debugInfo.boxCount ?? "N/A"}</p>
            <p>Processed Box Names: {debugInfo.processedBoxNames?.join(", ") ?? "N/A"}</p>
            <p>Last Fetch Attempt: {debugInfo.timestamp}</p>
            {debugInfo.errors && debugInfo.errors.length > 0 && (
              <div>
                <p className="font-semibold mt-2">Errors/Warnings during fetch:</p>
                <ul className="list-disc list-inside">
                  {debugInfo.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
