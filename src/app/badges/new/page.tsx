// formerly app/tags/new/page.tsx
import { Button } from "@/components/ui/button"
import PageTitleHeader from "@/components/page-title-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BadgeIcon as CreateBadgeIcon } from "lucide-react" // Changed icon alias
import Link from "next/link"

export default function CreateBadgePage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<CreateBadgeIcon />} // Changed icon
        title="Create a New Badge Type" // Changed title
        subtitle="Define a new type of badge that can be awarded or earned." // Changed subtitle
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Badge Type Details</CardTitle> {/* Changed title */}
          <CardDescription>Fill in the information below to create a new badge type.</CardDescription>{" "}
          {/* Changed description */}
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badgeName">Badge Name</Label> {/* Changed label */}
              <Input
                id="badgeName"
                name="badgeName"
                placeholder="e.g., Top Contributor, Event Speaker" // Changed placeholder
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeDescription">Description (Optional)</Label> {/* Changed label */}
              <Textarea
                id="badgeDescription"
                name="badgeDescription"
                rows={4}
                placeholder="A brief description of what this badge represents and its criteria." // Changed placeholder
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href="/badges">Cancel</Link> {/* Updated link */}
          </Button>
          <Button type="submit">Create Badge Type</Button> {/* Changed button text */}
        </CardFooter>
      </Card>
    </div>
  )
}
