"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Send, FileText, Github, Users, ShieldCheck, ListChecks } from "lucide-react"

// These would ideally come from a shared source or API
const AVAILABLE_BADGES = [
  { id: "java_prof", name: "Java Proficiency Badge" },
  { id: "html_css_fun", name: "HTML & CSS Fundamentals Badge" },
  { id: "python_prog", name: "Python Programming Badge" },
  { id: "algo_dev", name: "Algorand Developer Badge" },
  { id: "js_essentials", name: "JavaScript Essentials Badge" },
  { id: "custom_project", name: "Custom Project Completion Badge" },
]

export default function VerifyPage() {
  const [selectedBadge, setSelectedBadge] = useState<string>("")
  const [proofDescription, setProofDescription] = useState<string>("")
  const [githubRepo, setGithubRepo] = useState<string>("")
  const [endorsementDetails, setEndorsementDetails] = useState<string>("")
  const [codeChallengeInfo, setCodeChallengeInfo] = useState<string>("")
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmissionError(null)

    if (!selectedBadge) {
      setSubmissionError("Please select a badge to apply for.")
      return
    }
    if (!proofDescription && !githubRepo && !endorsementDetails && !codeChallengeInfo) {
      setSubmissionError("Please provide at least one form of proof.")
      return
    }

    // In a real application, you would send this data to a backend API
    console.log("Badge Application Submitted:", {
      badge: selectedBadge,
      description: proofDescription,
      github: githubRepo,
      endorsement: endorsementDetails,
      challenge: codeChallengeInfo,
    })

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitted(true)
  }

  if (isSubmitted) {
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
              Thank you for submitting your proof of work for the{" "}
              <span className="font-semibold">
                {AVAILABLE_BADGES.find((b) => b.id === selectedBadge)?.name || "Selected Badge"}
              </span>
              .
            </p>
            <p className="text-muted-foreground">
              Your application is now pending review. An admin and an approver (e.g., HR or teacher) will need to verify
              your submission and sign the transaction to issue your badge.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be notified once a decision has been made. If approved, ensure you have opted-in to the relevant
              Asset ID in your Algorand wallet.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => {
                setIsSubmitted(false)
                setSelectedBadge("")
                setProofDescription("")
                setGithubRepo("")
                setEndorsementDetails("")
                setCodeChallengeInfo("")
              }}
            >
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
              <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                <SelectTrigger id="badge-select">
                  <SelectValue placeholder="Select a badge" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_BADGES.map((badge) => (
                    <SelectItem key={badge.id} value={badge.id}>
                      {badge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" className="w-full">
              <Send className="mr-2 h-4 w-4" /> Submit Application
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
