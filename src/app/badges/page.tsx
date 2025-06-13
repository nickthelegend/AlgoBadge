// formerly app/tags/page.tsx
import PageTitleHeader from "@/components/page-title-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AwardIcon, PlusCircleIcon, Edit3Icon, Trash2Icon } from "lucide-react" // Changed TagIcon to AwardIcon
import Link from "next/link"

// Dummy data for badges
const dummyBadges = [
  { id: "1", name: "Algorand Pioneer", description: "Recognizes early adoption and contributions to Algorand." },
  { id: "2", name: "Community Helper", description: "For active and helpful community members." },
  { id: "3", name: "Dev Challenge Winner", description: "Awarded for winning a developer challenge." },
  { id: "4", name: "Workshop Speaker", description: "For presenting at official Algorand workshops." },
]

export default function BadgesPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageTitleHeader
        icon={<AwardIcon />} // Changed icon
        title="Manage Badges" // Changed title
        subtitle="Create, organize, and manage the types of badges you can issue or earn." // Changed subtitle
        actionButton={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/badges/new">
              {" "}
              {/* Updated link */}
              <PlusCircleIcon className="mr-2 h-4 w-4" /> New Badge Type
            </Link>
          </Button>
        }
      />

      {dummyBadges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyBadges.map((badge) => (
            <Card key={badge.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{badge.name}</CardTitle>
                {badge.description && <CardDescription className="text-sm">{badge.description}</CardDescription>}
              </CardHeader>
              <CardFooter className="mt-auto flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/badges/edit/${encodeURIComponent(badge.name)}`}>
                    {" "}
                    {/* Updated link */}
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
            <CardTitle>No Badge Types Yet</CardTitle> {/* Changed text */}
            <CardDescription>Get started by creating your first badge type.</CardDescription> {/* Changed text */}
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/badges/new">
                {" "}
                {/* Updated link */}
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Create New Badge Type
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
