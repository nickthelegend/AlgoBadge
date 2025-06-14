"use client" // This page now needs to be a client component

import type React from "react"
import { useState, type FormEvent } from "react"
import Link from "next/link"
import { AwardIcon, UploadCloudIcon, CheckCircle2Icon, AlertTriangleIcon, Loader2Icon, CircleDollarSignIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import PageTitleHeader from "@/components/page-title-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-toastify" // Assuming you have react-toastify from providers.tsx
import { useWallet } from "@txnlab/use-wallet-react"
import { AlgorandClient } from "@algorandfoundation/algokit-utils/types/algorand-client"

// --- Contract Imports ---
// Ensure these paths and names match your generated client files
import { BadgeManagerClient } from "@/contracts/BadgeManagerClient"
import { BadgeContractFactory, BadgeContractClient } from "@/contracts/BadgeContractClient" // Assuming factory is part of BadgeContractClient file or separate

import { uploadImageToPinata, type UploadResult } from "./actions"
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount"
import { OnApplicationComplete } from "algosdk"

// --- CONFIGURATION ---
// !!! REPLACE WITH YOUR ACTUAL DEPLOYED BADGE MANAGER APP ID !!!
const BADGE_MANAGER_APP_ID = BigInt(741171409) 
// It's better to use an env var for this: NEXT_PUBLIC_BADGE_MANAGER_APP_ID

export default function CreateBadgePage() {
  const { activeAccount, transactionSigner, activeAddress } = useWallet()

  const [badgeName, setBadgeName] = useState("")
  const [badgeDescription, setBadgeDescription] = useState("")
  const [badgeCategory, setBadgeCategory] = useState("General") // New field
  const [maxSupply, setMaxSupply] = useState("100") // New field, as string for input
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const [isUploadingIpfs, setIsUploadingIpfs] = useState(false)
  const [ipfsUploadStatus, setIpfsUploadStatus] = useState<UploadResult | null>(null)
  const [ipfsHash, setIpfsHash] = useState<string | null>(null)

  const [isCreatingOnChain, setIsCreatingOnChain] = useState(false)
  const [onChainStatus, setOnChainStatus] = useState<string | null>(null)
  const [finalBadgeAppId, setFinalBadgeAppId] = useState<bigint | null>(null)


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.")
        setSelectedFile(null)
        setPreviewUrl(null)
        event.target.value = "" 
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setIpfsUploadStatus(null) 
      setIpfsHash(null)
      setOnChainStatus(null)
      setFinalBadgeAppId(null)
    } else {
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeAccount || !activeAddress || !transactionSigner) {
      toast.error("Please connect your wallet first.")
      return
    }
    if (!selectedFile) {
      toast.error("Please select an image for the badge.")
      return
    }
    if (BADGE_MANAGER_APP_ID === BigInt(0)) {
      toast.error("Badge Manager App ID is not configured. Please set NEXT_PUBLIC_BADGE_MANAGER_APP_ID.")
      return
    }

    setIsUploadingIpfs(true)
    setIpfsUploadStatus(null)
    setOnChainStatus(null)
    setFinalBadgeAppId(null)
    toast.info("Uploading image to IPFS...", { autoClose: false, toastId: "ipfsUpload" })

    const ipfsFormData = new FormData()
    ipfsFormData.append("badgeImage", selectedFile)
    const ipfsResult = await uploadImageToPinata(ipfsFormData)
    setIpfsUploadStatus(ipfsResult)
    setIsUploadingIpfs(false)

    if (!ipfsResult.success || !ipfsResult.ipfsHash) {
      toast.dismiss("ipfsUpload")
      toast.error(`IPFS Upload failed: ${ipfsResult.error || "Unknown error"}`)
      return
    }
    
    toast.update("ipfsUpload", { render: "Image uploaded to IPFS!", type: "success", autoClose: 2000 })
    setIpfsHash(ipfsResult.ipfsHash)
    const imageIpfsUrl = `ipfs://${ipfsResult.ipfsHash}`

    // --- Start Blockchain Interaction ---
    setIsCreatingOnChain(true)
    toast.info("Preparing blockchain transaction...", { autoClose: false, toastId: "onChain" })

    try {
      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
        indexerConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
      })
      // await algorand.ensureFunded(
      //   {
      //     accountToFund: activeAddress,
      //     minSpendingBalance: AlgoAmount.Algos(1), // Ensure enough for transactions
      //     minFundingIncrement: AlgoAmount.Algos(1),
      //   },
      //   {
      //     // Fund with a temporary dispenser if on localnet/devnet and no other funder is available
      //     // This is a placeholder; for TestNet/MainNet, users must be funded.
      //     // fundWith: algokit.algos(10).microAlgos,
      //   }
      // );


      toast.update("onChain", { render: "Creating badge contract on blockchain..." })

      // 1. Create new BadgeContract application instance
      const badgeContractFactory = new BadgeContractFactory({
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
        algorand,
      })
      
      // Adjust arguments for your BadgeContractFactory's createApplication method
      // These are assumptions based on typical patterns.
      const { result, appClient }  = await badgeContractFactory.send.create.createApplication({
        sender: activeAddress,
        signer: transactionSigner,
        onComplete: OnApplicationComplete.NoOpOC,
        args: [
          activeAddress,
          badgeName,
          BigInt(maxSupply),
        ],
      })
      
      const newBadgeAppId = await appClient.appId
      const appAddress = await appClient.appAddress.toString()
      setFinalBadgeAppId(newBadgeAppId)
      toast.update("onChain", { render: `Badge contract created! App ID: ${newBadgeAppId}`, autoClose: 3000 })


      toast.info("Registering badge with manager and minting...", { autoClose: false, toastId: "finalizing" })
      
      // 2. Initialize clients for BadgeManager and the new BadgeContract
      const badgeManager = algorand.client.getTypedAppClientById(BadgeManagerClient, {
        appId: BADGE_MANAGER_APP_ID,
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
      })
      const newBadgeContract = algorand.client.getTypedAppClientById(BadgeContractClient, {
        appId: newBadgeAppId,
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
      })
      const ipfsURL = `ipfs://${ipfsHash}`

      console.log("New Badge App ID:", newBadgeAppId);
      console.log("New Badge App Address:", appAddress);
      // 3. Grouped transaction
      // if (!ipfsHash) {
      //   toast.error("IPFS hash is missing. Cannot continue.");
      //   return;
      // }
      await algorand.newGroup()
        .addAppCallMethodCall(
          await badgeManager.params.createBadge({


            args: {
              appId: newBadgeAppId,
              badgeName: badgeName
            }
          }) // Example: increase fee for inner txns
        )
        .addPayment({
          sender: activeAddress,
          receiver: appAddress,
          amount: AlgoAmount.MicroAlgos(300_000), // 0.3 ALGO for MBR + initial state
          signer: transactionSigner,
        })
        .addAppCallMethodCall(
          await newBadgeContract.params.createBadge({
            args:{
              assetUrl: ipfsURL,
              totalTickets: BigInt(maxSupply),
            }
          })
        ).send({ populateAppCallResources: true })

      toast.dismiss("finalizing")
      toast.success("Badge created and registered successfully on the blockchain!")
      setOnChainStatus(`Badge App ID: ${newBadgeAppId} successfully created.`)

    } catch (error: any) {
      console.error("Blockchain transaction error:", error)
      toast.dismiss("onChain")
      toast.dismiss("finalizing")
      toast.error(`Blockchain error: ${error.message || "Unknown error"}`)
      setOnChainStatus(`Error: ${error.message || "Unknown error"}`)
    } finally {
      setIsCreatingOnChain(false)
    }
  }
  
  const isLoading = isUploadingIpfs || isCreatingOnChain;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<AwardIcon />}
        title="Create a New Badge Type"
        subtitle="Define a new type of badge, including its visual representation and on-chain properties."
      />
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Badge Type Details</CardTitle>
            <CardDescription>
              Fill in the information, upload an image, and set on-chain parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badgeName">Badge Name</Label>
              <Input id="badgeName" name="badgeName" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} placeholder="e.g., AlgoChallenger Season 1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeDescription">Description (Optional)</Label>
              <Textarea id="badgeDescription" name="badgeDescription" value={badgeDescription} onChange={(e) => setBadgeDescription(e.target.value)} rows={3} placeholder="A brief description of this badge and its achievement." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badgeCategory">Category</Label>
                <Input id="badgeCategory" name="badgeCategory" value={badgeCategory} onChange={(e) => setBadgeCategory(e.target.value)} placeholder="e.g., Hackathon, Community" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSupply">Max Supply</Label>
                <Input id="maxSupply" name="maxSupply" type="number" value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} placeholder="e.g., 1000" required min="1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeImage">Badge Image</Label>
              <Input id="badgeImage" name="badgeImage" type="file" accept="image/*" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" required />
              {previewUrl && (
                <div className="mt-4">
                  <img src={previewUrl || "/placeholder.svg"} alt="Badge preview" className="max-w-xs max-h-48 rounded-md border" />
                </div>
              )}
            </div>

            {isUploadingIpfs && !ipfsUploadStatus && (
              <div className="flex items-center text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Uploading image to IPFS...
              </div>
            )}
            {ipfsUploadStatus && !isUploadingIpfs && (
              <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${ipfsUploadStatus.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {ipfsUploadStatus.success ? <CheckCircle2Icon className="mr-2 h-5 w-5" /> : <AlertTriangleIcon className="mr-2 h-5 w-5" />}
                {ipfsUploadStatus.success ? `Image "${ipfsUploadStatus.fileName}" uploaded! IPFS Hash: ${ipfsUploadStatus.ipfsHash}` : `IPFS Upload failed: ${ipfsUploadStatus.error}`}
              </div>
            )}
            
            {isCreatingOnChain && (
              <div className="flex items-center text-muted-foreground mt-2">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Processing blockchain transaction...
              </div>
            )}
            {onChainStatus && !isCreatingOnChain && (
               <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${finalBadgeAppId ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {finalBadgeAppId ? <CheckCircle2Icon className="mr-2 h-5 w-5" /> : <AlertTriangleIcon className="mr-2 h-5 w-5" />}
                {onChainStatus}
              </div>
            )}
            {finalBadgeAppId && (
              <div className="mt-2 text-xs text-muted-foreground break-all">
                View Badge Contract on Explorer (e.g., Allo): App ID {finalBadgeAppId.toString()}
              </div>
            )}

          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-6 border-t">
            <Button variant="outline" asChild type="button" disabled={isLoading}>
              <Link href="/badges">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile || !!finalBadgeAppId}>
              {isLoading ? (<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />) 
               : finalBadgeAppId ? (<CheckCircle2Icon className="mr-2 h-4 w-4" />) 
               : (<CircleDollarSignIcon className="mr-2 h-4 w-4" />)}
              {isUploadingIpfs ? "Uploading Image..." 
               : isCreatingOnChain ? "Creating on Chain..." 
               : finalBadgeAppId ? "Badge Created!" 
               : "Create Badge on Algorand"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
