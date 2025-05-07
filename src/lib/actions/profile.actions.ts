"use server"

import { z } from "zod"
// Correct path for the server client creation function
import { createServerSupabaseClient } from "@/lib/supabase-server"
// Correct path for the safe action client and error class
import { action, ProfileActionError } from "../safe-action"
import { revalidatePath } from "next/cache"

// --- Zod Schema for Profile Updates ---
// Define which fields are updatable and their validation rules
// Note: email/username changes often require separate verification flows, omitted for now.
const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")), // Allow empty string to clear
  coverPhoto: z.string().url("Invalid cover photo URL").optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  education: z.string().optional().or(z.literal("")),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().or(z.literal("")),
  publicProfile: z.boolean().optional(),
  websiteUrl: z.string().url("Invalid website URL").optional().or(z.literal("")),
  twitterHandle: z
    .string()
    .regex(/^[a-zA-Z0-9_]{1,15}$/, "Invalid Twitter handle")
    .optional()
    .or(z.literal("")), // Basic regex
  githubHandle: z
    .string()
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      "Invalid GitHub handle"
    )
    .optional()
    .or(z.literal("")), // Basic regex
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  // preferences: z.any().optional() // Keep preferences simple for now, could be a nested object schema later
})

// Infer the TypeScript type from the Zod schema
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>

// Define the expected shape of the context provided by the (now removed) middleware
// We will fetch this manually inside actions that need it.
interface ActionContext {
  userId?: string;
}

// --- Server Action: Get User Profile ---
export const getUserProfile = action.schema(z.object({})).action(async ({}) => {
  // Fetch user session within the action
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ProfileActionError("User not authenticated");
  }
  const userId = user.id;

  const { data, error: queryError } = await supabase
    .from("User") // Ensure table name casing matches schema (User)
    .select(
      `
      id,
      name,
      username,
      email,
      image,
      coverPhoto,
      location,
      occupation,
      education,
      bio,
      publicProfile,
      websiteUrl,
      twitterHandle,
      githubHandle,
      linkedinUrl,
      instagramHandle,
      preferences
    `
    )
    .eq("id", userId)
    .single();

  if (queryError) {
    console.error("Error fetching user profile:", queryError);
    // Throw the specific error class for handleServerError
    throw new ProfileActionError("Failed to fetch profile");
  }

  if (!data) {
    throw new ProfileActionError("Profile not found");
  }

  // Explicitly type the return data to match the expected UserProfile interface
  return data as UserProfile;
});

// --- Server Action: Update User Profile ---
export const updateUserProfile = action
  .schema(profileUpdateSchema)
  .action(async ({ parsedInput }) => {
    // Fetch user session within the action
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error in updateUserProfile:", authError);
      throw new ProfileActionError("User not authenticated");
    }
    const userId = user.id;
    console.log("Updating profile for user:", userId, "with data:", parsedInput);

    // Prepare the data for update, removing undefined fields
    const updateData: Partial<ProfileUpdateData> = {};
    // Ensure correct typing for iteration
    Object.keys(parsedInput).forEach((key) => {
      const typedKey = key as keyof ProfileUpdateData;
      if (parsedInput[typedKey] !== undefined) {
        // Assign valid properties
        (updateData as any)[typedKey] = parsedInput[typedKey];
      }
    });

    // Create the final object for Supabase, including updatedAt
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString(), // Add timestamp here
    };
    console.log("Final data to update:", dataToUpdate);

    const { data, error: updateError } = await supabase
      .from("User") // Ensure table name casing matches schema (User)
      .update(dataToUpdate) // Use the object with updatedAt
      .eq("id", userId)
      .select("id") // Select something to confirm the update worked
      .single();

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      // Add more specific error handling (e.g., unique constraint violations)
      throw new ProfileActionError("Failed to update profile");
    }

    if (!data) {
      // This shouldn't happen if the user exists, but good to check
      console.error("No data returned after profile update, user may not exist");
      throw new ProfileActionError("Failed to confirm profile update");
    }

    console.log("Profile updated successfully in database:", data.id);

    // Also update auth metadata to ensure it stays in sync
    try {
      await supabase.auth.updateUser({
        data: {
          ...updateData
        }
      });
      console.log("Auth metadata updated successfully");
    } catch (metadataError) {
      console.warn("Failed to update auth metadata:", metadataError);
      // Continue without failing - the database update worked
    }

    // Revalidate relevant paths after successful update
    revalidatePath("/profile"); // Revalidate the main profile page
    // revalidatePath("/settings/profile");

    return { success: true, message: "Profile updated successfully" };
  });

// --- TypeScript Type for Full Profile Data (returned by getUserProfile) ---
// This might need adjustment based on the actual select query result
export interface UserProfile {
  id: string
  name: string | null
  username: string | null
  email: string // Assuming email is always present for logged-in user
  image: string | null
  coverPhoto: string | null
  location: string | null
  occupation: string | null
  education: string | null
  bio: string | null
  publicProfile: boolean
  websiteUrl: string | null
  twitterHandle: string | null
  githubHandle: string | null
  linkedinUrl: string | null
  instagramHandle: string | null // Added for Instagram handle support in profile form
  preferences: unknown | null // Keep as unknown for now, refine if needed
}

// --- Server Action: Create Signed URL for Avatar Upload ---
const createUrlSchema = z.object({
  fileName: z.string(),
  contentType: z.string().startsWith("image/"),
});
export const createAvatarUploadUrl = action
  .schema(createUrlSchema)
  .action(async ({ parsedInput: { fileName, contentType } }) => {
    const supabase = createServerSupabaseClient(); // Use server client function
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ProfileActionError("User not authenticated");
    }

    // Create a unique path for the user's avatar
    const fileExtension = fileName.split('.').pop() || 'png';
    const uniquePath = `${user.id}/${Date.now()}.${fileExtension}`;

    // Generate signed URL for upload
    const { data, error: urlError } = await supabase.storage
      .from('avatars') // Ensure 'avatars' bucket exists
      .createSignedUploadUrl(uniquePath);

    if (urlError) {
      console.error("Error creating signed upload URL:", urlError);
      throw new ProfileActionError("Could not create upload URL");
    }

    return { signedUrl: data.signedUrl, path: data.path };
  });

// --- Server Action: Update Avatar Reference in User Profile ---
const updateRefSchema = z.object({ newPath: z.string() });
export const updateAvatarReference = action
  .schema(updateRefSchema)
  .action(async ({ parsedInput: { newPath } }) => {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ProfileActionError("User not authenticated");
    }
    const userId = user.id;

    // 1. Get the current avatar path to delete the old one
    const { data: userData, error: fetchError } = await supabase
      .from('User')
      .select('image')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error("Error fetching user data for avatar update:", fetchError);
      // Don't block update if fetch fails, just log it
    }

    const oldPath = userData?.image;

    // 2. Update the User table with the new path
    const { error: updateError } = await supabase
      .from('User')
      .update({ image: newPath, updatedAt: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error("Error updating user avatar reference:", updateError);
      throw new ProfileActionError("Failed to update profile avatar reference");
    }

    // 3. Delete the old avatar file *after* successful DB update
    if (oldPath && oldPath !== newPath) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([oldPath]);
      if (deleteError) {
        // Log error but don't fail the whole action if deletion fails
        console.error("Error deleting old avatar:", oldPath, deleteError);
      }
    }

    // Revalidate profile paths
    revalidatePath("/profile");
    // Potentially revalidate other paths where avatar is shown

    return { success: true, message: "Avatar updated successfully" };
  }); 