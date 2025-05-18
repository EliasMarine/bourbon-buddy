import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spiritSchema } from "@/lib/validations/spirit";
import { getServerSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// This is a stub route file created for development builds
// The original file has been temporarily backed up

// GET handler for fetching a single spirit by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Spirit ID is required" },
        { status: 400 }
      );
    }

    // Get the current user session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Fetch the spirit
    const { data, error } = await supabase
      .from("Spirit")
      .select("*")
      .eq("id", id)
      .eq("ownerId", session.user.id)
      .is("deletedAt", null)
      .single();

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch spirit" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Spirit not found" },
        { status: 404 }
      );
    }

    // Return the spirit
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in spirit GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH handler for updating a spirit
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Spirit ID is required" },
        { status: 400 }
      );
    }

    // Get the current user session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();

    // Prepare the update data
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Validate the data
    const validatedData = spiritSchema.partial().parse(updateData);

    // Initialize Supabase client
    const supabase = createClient();

    // Verify ownership
    const { data: existingSpirit, error: fetchError } = await supabase
      .from("Spirit")
      .select("ownerId")
      .eq("id", id)
      .is("deletedAt", null)
      .single();

    if (fetchError || !existingSpirit) {
      return NextResponse.json(
        { error: "Spirit not found" },
        { status: 404 }
      );
    }

    if (existingSpirit.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this spirit" },
        { status: 403 }
      );
    }

    // Update the spirit
    const { data, error } = await supabase
      .from("Spirit")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update spirit" },
        { status: 500 }
      );
    }

    // Revalidate the collection page
    revalidatePath("/collection");
    revalidatePath(`/collection/spirit/${id}`);

    // Return the updated spirit
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in spirit PATCH route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE handler for soft-deleting a spirit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Spirit ID is required" },
        { status: 400 }
      );
    }

    // Get the current user session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Verify ownership
    const { data: existingSpirit, error: fetchError } = await supabase
      .from("Spirit")
      .select("ownerId")
      .eq("id", id)
      .is("deletedAt", null)
      .single();

    if (fetchError || !existingSpirit) {
      return NextResponse.json(
        { error: "Spirit not found" },
        { status: 404 }
      );
    }

    if (existingSpirit.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this spirit" },
        { status: 403 }
      );
    }

    // Soft-delete the spirit by setting deletedAt
    const { error } = await supabase
      .from("Spirit")
      .update({ deletedAt: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete spirit" },
        { status: 500 }
      );
    }

    // Revalidate the collection page
    revalidatePath("/collection");
    revalidatePath(`/collection/spirit/${id}`);

    // Return success
    return NextResponse.json(
      { message: "Spirit deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in spirit DELETE route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
