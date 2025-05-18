import { Metadata } from "next";
import CollectionView from "@/components/collection/CollectionView";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Bottle Collection | Bourbon Buddy",
  description: "View and manage your spirits collection",
};

export default async function CollectionPage() {
  const session = await getServerSession();
  
  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login?callbackUrl=/collection");
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Collection</h1>
      <CollectionView />
    </div>
  );
} 