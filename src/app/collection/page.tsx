import { Metadata } from "next";
import CollectionView from "@/components/collection/CollectionView";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Bottle Collection | Bourbon Buddy",
  description: "View and manage your spirits collection",
};

export default async function CollectionPage() {
  // Get the user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Debug logging for server-side auth state
  console.log('[Server] Collection Page Accessed');
  console.log('[Server] User authenticated:', !!user);
  if (user) {
    console.log('[Server] User ID:', user.id);
  } else {
    console.log('[Server] No user found, should redirect');
  }

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