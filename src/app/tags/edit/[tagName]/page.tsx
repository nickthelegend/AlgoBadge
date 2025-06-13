"use client"

import PageTitleHeader from "@/components/page-title-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PencilIcon } from "lucide-react"
import Link from "next/link"

export default function EditTagPage({ params }: { params: { tagName: string } }) {
  const tagName = decodeURIComponent(params.tagName)

  // In a real app, you'd fetch the tag data based on tagName
  const currentDescription = "This is a placeholder description for the tag being edited. Replace with actual data."

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<PencilIcon />}
        title={`Edit Tag: ${tagName}`}
        subtitle={`Update the details for the '${tagName}' tag.`}
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Tag Details</CardTitle>
          <CardDescription>Modify the information for the tag below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input id="tagName" name="tagName" defaultValue={tagName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagDescription">Description (Optional)</Label>
              <Textarea
                id="tagDescription"
                name="tagDescription"
                rows={4}
                defaultValue={currentDescription} // Placeholder
                placeholder="Update the tag's description."
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href="/tags">Cancel</Link>
          </Button>
          <Button type="submit">Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
