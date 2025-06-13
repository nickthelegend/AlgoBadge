import PageTitleHeader from "@/components/page-title-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TagIcon, PlusCircleIcon, Edit3Icon, Trash2Icon } from "lucide-react"
import Link from "next/link"

// Dummy data for tags
const dummyTags = [
  { id: "1", name: "Mentor", description: "Recognizes mentorship contributions." },
  { id: "2", name: "Developer", description: "For software development achievements." },
  { id: "3", name: "Community", description: "Awarded for community involvement." },
  { id: "4", name: "Speaker", description: "For presenting at events or workshops." },
]

export default function TagsPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<TagIcon />}
        title="Manage Tags"
        subtitle="Create, organize, and manage skill categories that define your badges."
        actionButton={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/tags/new">
              <PlusCircleIcon className="mr-2 h-4 w-4" /> New Tag
            </Link>
          </Button>
        }
      />

      {dummyTags.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyTags.map((tag) => (
            <Card key={tag.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{tag.name}</CardTitle>
                {tag.description && <CardDescription className="text-sm">{tag.description}</CardDescription>}
              </CardHeader>
              <CardFooter className="mt-auto flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tags/edit/${encodeURIComponent(tag.name)}`}>
                    <Edit3Icon className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive"
                >
                  <Trash2Icon className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No Tags Yet</CardTitle>
            <CardDescription>Get started by creating your first tag.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tags/new">
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Create New Tag
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
