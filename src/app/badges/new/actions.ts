"use server"

import PinataClient from "@pinata/sdk"
import { Readable } from "stream"

const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_API_SECRET

if (!pinataApiKey || !pinataApiSecret) {
  throw new Error("Pinata API Key or Secret is not configured in environment variables.")
}

const pinata = new PinataClient(pinataApiKey, pinataApiSecret)

export interface UploadResult {
  success: boolean
  ipfsHash?: string
  error?: string
  fileName?: string
}

export async function uploadImageToPinata(formData: FormData): Promise<UploadResult> {
  const file = formData.get("badgeImage") as File | null

  if (!file) {
    return { success: false, error: "No image file provided." }
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Invalid file type. Please upload an image." }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const stream = Readable.from(buffer)

    // Pinata SDK's pinFileToIPFS expects the stream to have a 'path' property for naming on Pinata.
    // If not provided, it might use a generic name or the hash itself.
    // @ts-ignore - Adding path property to stream for Pinata SDK
    stream.path = file.name 

    const options = {
      pinataMetadata: {
        name: file.name,
        // You can add more keyvalues here if needed
        // keyvalues: {
        //   badgeType: formData.get('badgeName') || 'unknown'
        // }
      },
      pinataOptions: {
        cidVersion: 1, // Use CID version 1 for better compatibility
      },
    }

    const result = await pinata.pinFileToIPFS(stream, options)

    if (result.IpfsHash) {
      return { success: true, ipfsHash: result.IpfsHash, fileName: file.name }
    } else {
      return { success: false, error: "Failed to pin file to IPFS. No IPFS Hash returned." }
    }
  } catch (error: any) {
    console.error("Error uploading to Pinata:", error)
    return { success: false, error: error.message || "An unknown error occurred during IPFS upload." }
  }
}