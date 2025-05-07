"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, ControllerRenderProps, FieldValues } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner" // Assuming sonner for toasts

import Button from "@/components/ui/Button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingDots } from "@/components/ui/LoadingDots"

// Import the new uploader component
import { AvatarUploader } from "@/components/profile/avatar-uploader"

// Import the schema and actions from task 4.1
// Note: Adjust the import path if the profile.actions.ts file is elsewhere
import {
  updateUserProfile,
  ProfileUpdateData,
  UserProfile,
} from "@/lib/actions/profile.actions" // Assuming profile actions exist here
import { useSession } from "@/hooks/use-supabase-session"

// Define the Zod schema directly here or import if defined separately and exported
// This should match the schema used in the updateUserProfile action
const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  coverPhoto: z.string().url("Invalid cover photo URL").optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  education: z.string().optional().or(z.literal("")),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().or(z.literal("")),
  publicProfile: z.boolean().optional(),
  websiteUrl: z.string().url("Invalid website URL").optional().or(z.literal("")),
  twitterHandle: z.string().regex(/^[a-zA-Z0-9_]{1,15}$/, "Invalid Twitter handle").optional().or(z.literal("")),
  instagramHandle: z.string().regex(/^[a-zA-Z0-9_.]{1,30}$/, "Invalid Instagram handle").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().or(z.literal(""))
})

// Define the expected form values from schema
type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  // Pass initial user profile data to pre-fill the form
  initialData: UserProfile | null
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  // Local state for loading indicator
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { update: updateSession, refreshAvatar } = useSession();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      image: initialData?.image ?? "",
      coverPhoto: initialData?.coverPhoto ?? "",
      location: initialData?.location ?? "",
      occupation: initialData?.occupation ?? "",
      education: initialData?.education ?? "",
      bio: initialData?.bio ?? "",
      publicProfile: initialData?.publicProfile ?? true,
      websiteUrl: initialData?.websiteUrl ?? "",
      twitterHandle: initialData?.twitterHandle ?? "",
      instagramHandle: initialData?.instagramHandle ?? "",
      linkedinUrl: initialData?.linkedinUrl ?? ""
    },
  })

  // Function to handle form submission
  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    toast("Updating profile...");

    const result = await updateUserProfile(data);

    if (!result) {
      toast.error("An unexpected error occurred. Action did not return a result.");
    } else if (result.serverError) {
      toast.error(`Update failed: ${result.serverError}`);
    } else if (result.validationErrors) {
      // Handle validation errors if necessary (though react-hook-form should catch most)
      console.error("Validation Errors:", result.validationErrors);
      toast.error("Update failed due to validation errors.");
    } else if (result.data?.success) {
      // Update session to match new profile data
      await updateSession({
        user: {
          name: data.name,
          image: data.image,
        }
      });

      // Sync avatar between auth and database
      await refreshAvatar();
      
      toast.success(result.data.message || "Profile updated successfully!");
      // Optionally reset form to new values or trigger re-fetch if needed
      // form.reset(data); // Example: reset form with submitted data
    } else {
      // Fallback error
      toast.error("An unexpected error occurred during the update.");
    }

    setIsSubmitting(false);
  }

  // Type helper for the render prop field
  type FieldRenderProps = ControllerRenderProps<ProfileFormValues, keyof ProfileFormValues>;

  return (
    <Form {...form}>
      {/* Use the standard onSubmit handler */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* --- Avatar Uploader --- */}
        <FormItem>
          <FormLabel>Profile Picture</FormLabel>
          <FormControl>
             <AvatarUploader
               // Watch the 'image' field to get the current URL
               currentImageUrl={form.watch('image')}
               // Pass user ID (ensure initialData is available)
               userId={initialData?.id ?? ''}
               // Update the form state when upload is complete
               onUploadComplete={(newPath) => {
                 form.setValue('image', newPath, {
                   shouldValidate: true, // Trigger validation for the image field
                   shouldDirty: true,    // Mark the form as dirty
                 });
                 // Sync avatar between auth and database
                 refreshAvatar().then(() => {
                   toast.info("Avatar ready. Save changes to confirm.");
                 }).catch(error => {
                   console.error("Error refreshing avatar:", error);
                 });
               }}
             />
          </FormControl>
          <FormDescription>
            Upload or change your avatar.
          </FormDescription>
          {/* Add FormMessage here if direct errors related to the uploader are needed */}
           <FormMessage /> {/* Hook up potential errors from the image field validation */}
        </FormItem>

        {/* --- Name Field --- */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Bio Field --- */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a little bit about yourself"
                  className="resize-none"
                  {...field}
                  value={typeof field.value === 'boolean' ? '' : field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                You can use markdown. Max 500 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Location Field --- */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="City, Country" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Occupation Field --- */}
        <FormField
          control={form.control}
          name="occupation"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Occupation</FormLabel>
              <FormControl>
                <Input placeholder="Your job title" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Education Field --- */}
        <FormField
          control={form.control}
          name="education"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Education</FormLabel>
              <FormControl>
                <Input placeholder="University or School" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Website URL Field --- */}
        <FormField
          control={form.control}
          name="websiteUrl"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input placeholder="https://your-website.com" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Twitter Handle Field --- */}
        <FormField
          control={form.control}
          name="twitterHandle"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Twitter Handle</FormLabel>
              <FormControl>
                <Input placeholder="yourhandle (without @)" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Instagram Handle Field --- */}
        <FormField
          control={form.control}
          name="instagramHandle"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Instagram Handle</FormLabel>
              <FormControl>
                <Input placeholder="yourhandle (without @)" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- LinkedIn URL Field --- */}
        <FormField
          control={form.control}
          name="linkedinUrl"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/in/yourprofile" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* --- Cover Photo URL Field --- */}
         <FormField
          control={form.control}
          name="coverPhoto"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem>
              <FormLabel>Cover Photo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://your-image-host.com/cover.png" {...field} value={typeof field.value === 'boolean' ? '' : field.value ?? ''} />
              </FormControl>
              <FormDescription>
                URL for your cover photo. Leave blank to remove.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Public Profile Switch --- */}
        <FormField
          control={form.control}
          name="publicProfile"
          render={({ field }: { field: FieldRenderProps }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Profile</FormLabel>
                <FormDescription>
                  Make your profile visible to others.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={typeof field.value === 'boolean' ? field.value : false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* --- Submit Button --- */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  )
} 