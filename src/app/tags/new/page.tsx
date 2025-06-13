import { Button } from "@/components/ui/button"
import PageTitleHeader from "@/components/page-title-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TagIcon as CreateTagIcon } from "lucide-react"
import Link from "next/link"

export default function CreateTagPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<CreateTagIcon />}
        title="Create a New Tag"
        subtitle="Define a new category to organize your badges and credentials."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Tag Details</CardTitle>
          <CardDescription>Fill in the information below to create a new tag.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                name="tagName"
                placeholder="e.g., Blockchain Developer, Community Moderator"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagDescription">Description (Optional)</Label>
              <Textarea
                id="tagDescription"
                name="tagDescription"
                rows={4}
                placeholder="A brief description of what this tag represents and when it should be used."
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href="/tags">Cancel</Link>
          </Button>
          <Button type="submit">Create Tag</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
