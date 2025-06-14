"use client" // This page now needs to be a client component

import type React from "react"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { AwardIcon, UploadCloudIcon, CheckCircle2Icon, AlertTriangleIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import PageTitleHeader from "@/components/page-title-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadImageToPinata, type UploadResult } from "./actions" // Import the server action

export default function CreateBadgePage() {
  const [badgeName, setBadgeName] = useState("")
  const [badgeDescription, setBadgeDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [ipfsHash, setIpfsHash] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file.")
        setSelectedFile(null)
        setPreviewUrl(null)
        event.target.value = "" // Reset file input
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadStatus(null) // Reset upload status on new file selection
      setIpfsHash(null)
    } else {
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      alert("Please select an image for the badge.")
      return
    }

    setIsLoading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append("badgeName", badgeName) // Optional: pass to Pinata metadata
    formData.append("badgeDescription", badgeDescription) // Optional
    formData.append("badgeImage", selectedFile)

    const result = await uploadImageToPinata(formData)
    setUploadStatus(result)
    setIsLoading(false)

    if (result.success && result.ipfsHash) {
      setIpfsHash(result.ipfsHash)
      console.log("Successfully uploaded to IPFS. Hash:", result.ipfsHash)
      // Here you would typically save the badgeName, badgeDescription, and result.ipfsHash
      // to your database along with other badge details.
      // For now, we'll just log it and display the hash.
    } else {
      console.error("Upload failed:", result.error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<AwardIcon />}
        title="Create a New Badge Type"
        subtitle="Define a new type of badge, including its visual representation."
      />
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Badge Type Details</CardTitle>
            <CardDescription>Fill in the information below and upload an image for the badge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badgeName">Badge Name</Label>
              <Input
                id="badgeName"
                name="badgeName"
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                placeholder="e.g., Top Contributor, Event Speaker"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeDescription">Description (Optional)</Label>
              <Textarea
                id="badgeDescription"
                name="badgeDescription"
                value={badgeDescription}
                onChange={(e) => setBadgeDescription(e.target.value)}
                rows={3}
                placeholder="A brief description of what this badge represents and its criteria."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeImage">Badge Image</Label>
              <Input
                id="badgeImage"
                name="badgeImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                required
              />
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Badge preview"
                    className="max-w-xs max-h-48 rounded-md border"
                  />
                </div>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Uploading to IPFS...
              </div>
            )}

            {uploadStatus && !isLoading && (
              <div
                className={`mt-4 p-3 rounded-md text-sm flex items-center ${
                  uploadStatus.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {uploadStatus.success ? (
                  <CheckCircle2Icon className="mr-2 h-5 w-5" />
                ) : (
                  <AlertTriangleIcon className="mr-2 h-5 w-5" />
                )}
                {uploadStatus.success
                  ? `Image "${uploadStatus.fileName}" uploaded! IPFS Hash: ${uploadStatus.ipfsHash}`
                  : `Upload failed: ${uploadStatus.error}`}
              </div>
            )}
            {ipfsHash && (
              <div className="mt-2 text-xs text-muted-foreground break-all">
                IPFS Link:{" "}
                <a
                  href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >{`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`}</a>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-6 border-t">
            <Button variant="outline" asChild type="button">
              <Link href="/badges">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading || (uploadStatus?.success ?? false)}>
              {isLoading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : uploadStatus?.success ? (
                <CheckCircle2Icon className="mr-2 h-4 w-4" />
              ) : (
                <UploadCloudIcon className="mr-2 h-4 w-4" />
              )}
              {isLoading ? "Uploading..." : uploadStatus?.success ? "Uploaded" : "Create & Upload Image"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
