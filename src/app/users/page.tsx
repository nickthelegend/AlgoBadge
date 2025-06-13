import PageTitleHeader from "@/components/page-title-header"
import { UsersIcon } from "lucide-react"

export default function UsersPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageTitleHeader
        icon={<UsersIcon />}
        title="Users"
        subtitle="Manage users and their roles within the platform."
      />
      <div className="text-center py-10">
        <p className="text-muted-foreground">User listing and management tools will be displayed here.</p>
      </div>
    </div>
  )
}
