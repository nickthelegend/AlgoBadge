// formerly app/tags/edit/[tagName]/page.tsx
"use client"

import PageTitleHeader from "@/components/page-title-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PencilIcon } from "lucide-react" // Added AwardIcon for consistency, PencilIcon still used for edit
import Link from "next/link"

export default function EditBadgePage({ params }: { params: { badgeName: string } }) {
  // Renamed param
  const badgeName = decodeURIComponent(params.badgeName) // Renamed param usage

  // In a real app, you'd fetch the badge data based on badgeName
  const currentDescription =
    "This is a placeholder description for the badge type being edited. Replace with actual data."

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<PencilIcon />} // Keeping Pencil for edit action, or could use AwardIcon
        title={`Edit Badge Type: ${badgeName}`} // Changed title
        subtitle={`Update the details for the '${badgeName}' badge type.`} // Changed subtitle
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Badge Type Details</CardTitle> {/* Changed title */}
          <CardDescription>Modify the information for the badge type below.</CardDescription>{" "}
          {/* Changed description */}
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badgeName">Badge Name</Label> {/* Changed label */}
              <Input id="badgeName" name="badgeName" defaultValue={badgeName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeDescription">Description (Optional)</Label> {/* Changed label */}
              <Textarea
                id="badgeDescription"
                name="badgeDescription"
                rows={4}
                defaultValue={currentDescription}
                placeholder="Update the badge type's description." // Changed placeholder
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href="/badges">Cancel</Link> {/* Updated link */}
          </Button>
          <Button type="submit">Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
