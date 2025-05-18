import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spiritFilterSchema, spiritSchema } from "@/lib/validations/spirit";
import type { SpiritFilter } from "@/lib/validations/spirit";
import { ZodError } from "zod";
import { getServerSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

// GET handler for fetching spirits with filtering, sorting, and pagination
export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    // Convert numeric parameters
    const numericParams = [
      "minPrice", "maxPrice", "minProof", "maxProof", 
      "minRating", "maxRating", "minYear", "maxYear",
      "page", "limit"
    ];
    
    const parsedParams: Record<string, any> = { ...searchParams };

    for (const param of numericParams) {
      if (param in searchParams && searchParams[param] !== "") {
        parsedParams[param] = Number(searchParams[param]);
      }
    }

    // Convert boolean parameters
    if ("favorite" in searchParams) {
      parsedParams.favorite = searchParams.favorite === "true";
    }

    // Validate parameters
    let validatedParams: SpiritFilter;
    try {
      validatedParams = spiritFilterSchema.parse(parsedParams);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Zod validation error in spirits GET route:", error.issues);
        return NextResponse.json(
          { error: "Invalid filter parameters", details: error.issues },
          { status: 400 }
        );
      }
      // Re-throw other errors to be caught by the outer try-catch
      throw error;
    }
    
    // Extract pagination
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const offset = (page - 1) * limit;

    // Initialize Supabase client
    const supabase = await createClient();

    // Start building query
    let query = supabase
      .from("Spirit")
      .select("*", { count: "exact" })
      .eq("ownerId", session.user.id)
      .is("deletedAt", null);

    // Apply filters
    if (validatedParams.name) {
      query = query.ilike("name", `%${validatedParams.name}%`);
    }
    
    if (validatedParams.brand) {
      query = query.ilike("brand", `%${validatedParams.brand}%`);
    }
    
    if (validatedParams.type && validatedParams.type !== '') {
      query = query.eq("type", validatedParams.type);
    }
    
    if (validatedParams.category) {
      query = query.eq("category", validatedParams.category);
    }
    
    if (validatedParams.country && validatedParams.country !== '') {
      query = query.eq("country", validatedParams.country);
    }
    
    if (validatedParams.region) {
      query = query.eq("region", validatedParams.region);
    }
    
    if (validatedParams.minPrice !== undefined) {
      query = query.gte("price", validatedParams.minPrice);
    }
    
    if (validatedParams.maxPrice !== undefined) {
      query = query.lte("price", validatedParams.maxPrice);
    }
    
    if (validatedParams.minProof !== undefined) {
      query = query.gte("proof", validatedParams.minProof);
    }
    
    if (validatedParams.maxProof !== undefined) {
      query = query.lte("proof", validatedParams.maxProof);
    }
    
    if (validatedParams.minRating !== undefined) {
      query = query.gte("rating", validatedParams.minRating);
    }
    
    if (validatedParams.maxRating !== undefined) {
      query = query.lte("rating", validatedParams.maxRating);
    }
    
    if (validatedParams.minYear !== undefined) {
      query = query.gte("releaseYear", validatedParams.minYear);
    }
    
    if (validatedParams.maxYear !== undefined) {
      query = query.lte("releaseYear", validatedParams.maxYear);
    }
    
    if (validatedParams.favorite !== undefined) {
      query = query.eq("isFavorite", validatedParams.favorite);
    }

    // Apply sorting
    if (validatedParams.sortBy) {
      const direction = validatedParams.sortDir || "asc";
      query = query.order(validatedParams.sortBy, { ascending: direction === "asc" });
    } else {
      // Default sorting: favorites first, then by creation date
      query = query.order("isFavorite", { ascending: false })
                  .order("createdAt", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch spirits" },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Return the response
    return NextResponse.json({
      data: data || [],
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Error in spirits GET route:", error);
    // Check if it's a ZodError that slipped through (shouldn't happen with above catch)
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler for creating a new spirit
export async function POST(request: NextRequest) {
  try {
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
    
    // Generate a UUID if not provided
    const spiritData = {
      ...body,
      id: body.id || uuidv4(),
      ownerId: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate the data
    const validatedData = spiritSchema.parse(spiritData);

    // Initialize Supabase client (using service role for RLS bypass if needed)
    const supabase = await createClient();

    // Insert the new spirit
    const { data, error } = await supabase
      .from("Spirit")
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create spirit" },
        { status: 500 }
      );
    }

    // Revalidate the collection page
    revalidatePath("/collection");

    // Return the created spirit
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in spirits POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 