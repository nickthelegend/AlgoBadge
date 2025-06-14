"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import * as algosdk from "algosdk"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  Send,
  FileText,
  Github,
  Users,
  ShieldCheck,
  ListChecks,
  Loader2,
  AlertTriangle,
} from "lucide-react"

// Configuration (same as badges/page.tsx)
const BADGE_MANAGER_APP_ID = 741171409 // Your Badge Manager App ID
const INDEXER_SERVER = "https://testnet-idx.algonode.cloud"
const INDEXER_PORT = ""
const INDEXER_TOKEN = ""

interface BadgeInfo {
  id: string // App ID of the badge contract
  name: string
  rawBoxName?: string // Optional for debugging if needed
}

export default function VerifyPage() {
  const [availableBadgesFromContract, setAvailableBadgesFromContract] = useState<BadgeInfo[]>([])
  const [isLoadingBadges, setIsLoadingBadges] = useState<boolean>(true)
  const [badgeFetchError, setBadgeFetchError] = useState<string | null>(null)

  const [selectedBadge, setSelectedBadge] = useState<string>("") // Stores the App ID of the selected badge
  const [proofDescription, setProofDescription] = useState<string>("")
  const [githubRepo, setGithubRepo] = useState<string>("")
  const [endorsementDetails, setEndorsementDetails] = useState<string>("")
  const [codeChallengeInfo, setCodeChallengeInfo] = useState<string>("")
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const fetchBadgesForDropdown = useCallback(async () => {
    setIsLoadingBadges(true)
    setBadgeFetchError(null)
    const localErrors: string[] = []

    try {
      const indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
      const abiTypeString = algosdk.ABIType.from("(string)")
      const abiTypeUint64 = algosdk.ABIType.from("(uint64)")

      const boxesResponse = await indexerClient.searchForApplicationBoxes(BADGE_MANAGER_APP_ID).do()

      if (!boxesResponse.boxes || boxesResponse.boxes.length === 0) {
        setBadgeFetchError("No badges found in the Badge Manager contract.")
        setAvailableBadgesFromContract([])
        setIsLoadingBadges(false)
        return
      }

      const fetchedBadges: BadgeInfo[] = []

      for (const box of boxesResponse.boxes) {
        if (!box.name) continue
        const rawBoxNameBase64 = Buffer.from(box.name).toString("base64")

        let badgeAppIdString: string
        try {
          const [appIdBigInt] = abiTypeUint64.decode(box.name) as [bigint]
          badgeAppIdString = appIdBigInt.toString()
        } catch (e) {
          localErrors.push(`Skipping box: Name ${rawBoxNameBase64} is not a valid uint64.`)
          continue
        }

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

          let badgeName: string
          try {
            const decodedValue = abiTypeString.decode(valueBytes) as [string]
            badgeName = decodedValue[0]
          } catch (abiError: any) {
            if (abiError.message && abiError.message.includes("string length bytes do not match")) {
              badgeName = Buffer.from(valueBytes).toString("utf-8")
            } else {
              throw abiError
            }
          }

          if (!badgeName || badgeName.trim() === "") {
            badgeName = `[Unnamed Badge - ID: ${badgeAppIdString}]`
            localErrors.push(`Empty name for box ${rawBoxNameBase64} (App ID: ${badgeAppIdString}).`)
          }

          fetchedBadges.push({
            id: badgeAppIdString,
            name: badgeName,
            rawBoxName: rawBoxNameBase64,
          })
        } catch (e: any) {
          localErrors.push(
            `Error processing value for box ${rawBoxNameBase64} (App ID: ${badgeAppIdString}): ${e.message}`,
          )
        }
      }

      setAvailableBadgesFromContract(fetchedBadges)
      if (fetchedBadges.length === 0 && localErrors.length > 0) {
        setBadgeFetchError("Processed boxes but found no valid badges. Errors: " + localErrors.join("; "))
      } else if (fetchedBadges.length === 0 && boxesResponse.boxes.length > 0) {
        setBadgeFetchError("Found boxes, but could not decode any valid badge data.")
      }
    } catch (e: any) {
      console.error("Failed to fetch badges for dropdown:", e)
      setBadgeFetchError(`Failed to fetch badges: ${e.message}`)
    } finally {
      setIsLoadingBadges(false)
    }
  }, [])

  useEffect(() => {
    fetchBadgesForDropdown()
  }, [fetchBadgesForDropdown])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmissionError(null)
    setIsSubmitting(true)

    if (!selectedBadge) {
      setSubmissionError("Please select a badge to apply for.")
      setIsSubmitting(false)
      return
    }
    if (!proofDescription && !githubRepo && !endorsementDetails && !codeChallengeInfo) {
      setSubmissionError("Please provide at least one form of proof.")
      setIsSubmitting(false)
      return
    }

    console.log("Badge Application Submitted:", {
      badgeAppId: selectedBadge, // This is the App ID
      badgeName: availableBadgesFromContract.find((b) => b.id === selectedBadge)?.name || "Selected Badge",
      description: proofDescription,
      github: githubRepo,
      endorsement: endorsementDetails,
      challenge: codeChallengeInfo,
    })

    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

    setIsSubmitted(true)
    setIsSubmitting(false)
  }

  const resetForm = () => {
    setIsSubmitted(false)
    setSelectedBadge("")
    setProofDescription("")
    setGithubRepo("")
    setEndorsementDetails("")
    setCodeChallengeInfo("")
    setSubmissionError(null)
  }

  if (isSubmitted) {
    const appliedBadgeName =
      availableBadgesFromContract.find((b) => b.id === selectedBadge)?.name || "the selected badge"
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center">
              <CheckCircle className="mr-2 h-7 w-7 text-green-500" />
              Application Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg">
              Thank you for submitting your proof of work for <span className="font-semibold">{appliedBadgeName}</span>.
            </p>
            <p className="text-muted-foreground">
              Your application is now pending review. An admin and an approver (e.g., HR or teacher) will need to verify
              your submission and sign the transaction to issue your badge.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be notified once a decision has been made. If approved, ensure you have opted-in to the relevant
              Asset ID in your Algorand wallet (Note: this example uses App IDs for badges, asset opt-in might relate to
              a different mechanism if ASAs are also involved).
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={resetForm}>
              Submit Another Application
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
            Apply for a Badge
          </CardTitle>
          <CardDescription>
            Submit your proof of work to earn a recognized digital badge. Your submission will be reviewed by authorized
            personnel.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badge-select">Badge You Are Applying For</Label>
              {isLoadingBadges && (
                <div className="flex items-center text-sm text-muted-foreground p-2 border rounded-md">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading available badges...
                </div>
              )}
              {badgeFetchError && !isLoadingBadges && (
                <div className="flex items-center text-sm text-red-600 p-2 border border-red-300 bg-red-50 rounded-md">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Error loading badges: {badgeFetchError}
                  <Button variant="link" size="sm" onClick={fetchBadgesForDropdown} className="ml-2 h-auto p-0">
                    Retry
                  </Button>
                </div>
              )}
              {!isLoadingBadges && !badgeFetchError && availableBadgesFromContract.length === 0 && (
                <div className="text-sm text-muted-foreground p-2 border rounded-md">
                  No badges available to apply for at the moment.
                </div>
              )}
              {!isLoadingBadges && !badgeFetchError && availableBadgesFromContract.length > 0 && (
                <Select value={selectedBadge} onValueChange={setSelectedBadge} disabled={isLoadingBadges}>
                  <SelectTrigger id="badge-select">
                    <SelectValue placeholder="Select a badge" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {" "}
                    {/* Ensure dropdown is above other elements */}
                    {availableBadgesFromContract.map((badge) => (
                      <SelectItem key={badge.id} value={badge.id}>
                        {badge.name} (ID: {badge.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof-description" className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                Proof of Work Description
              </Label>
              <Textarea
                id="proof-description"
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="Describe your project, contributions, or achievements related to this badge. (e.g., link to live project, detailed explanation of your role)"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-repo" className="flex items-center">
                <Github className="mr-2 h-4 w-4 text-muted-foreground" />
                GitHub Repository URL (Optional)
              </Label>
              <Input
                id="github-repo"
                type="url"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="https://github.com/yourusername/your-repo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endorsement-details" className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                Endorsement from Verified Entity (Optional)
              </Label>
              <Textarea
                id="endorsement-details"
                value={endorsementDetails}
                onChange={(e) => setEndorsementDetails(e.target.value)}
                placeholder="Provide details of any endorsements (e.g., LinkedIn recommendation URL, contact person from a verified company/institution, certificate reference)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code-challenge-info" className="flex items-center">
                <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                Code Challenges / Certifications (Optional)
              </Label>
              <Textarea
                id="code-challenge-info"
                value={codeChallengeInfo}
                onChange={(e) => setCodeChallengeInfo(e.target.value)}
                placeholder="List any relevant code challenges completed (e.g., HackerRank profile, LeetCode solutions, specific platform challenge links) or certifications obtained."
                rows={3}
              />
            </div>
            {submissionError && <p className="text-sm text-red-500">{submissionError}</p>}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isLoadingBadges || availableBadgesFromContract.length === 0}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
