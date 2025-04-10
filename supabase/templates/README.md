# Bourbon Buddy Email Templates

This directory contains custom HTML email templates for Supabase authentication. These templates have been designed to match the Bourbon Buddy branding and provide a better user experience.

## Available Templates

1. **confirmation.html** - Email verification template
2. **recovery.html** - Password recovery template
3. **magic_link.html** - Magic link sign-in template

## Configuring Email Templates in Supabase Dashboard

To use these custom email templates in your Supabase project:

1. **Log in** to your Supabase dashboard
2. Navigate to **Authentication > Email Templates**
3. For each template type:
   - Click on the template you want to customize
   - In the **Message** field, paste the entire HTML content from the corresponding template file
   - Update the **Subject** field with the appropriate subject from the `config.toml` file
   - Click **Save**

## Local Development

For local development, these templates are configured through the `config.toml` file. When running the Supabase local development environment, these templates will be used automatically.

## Template Variables

Each template uses specific template variables provided by Supabase:

- `{{ .ConfirmationURL }}` - Used in confirmation emails
- `{{ .RecoveryURL }}` - Used in password recovery emails
- `{{ .MagicLink }}` - Used in magic link sign-in emails

Do not remove these variables as they're required for the authentication links to work properly.

## Branding Elements

These templates use:

- **Colors**: The primary color scheme is based on Bourbon Buddy's amber/gold palette
- **Logo**: The Bourbon Buddy logo is included in the header
- **Bourbon Glass Emoji**: A decorative element to enhance the bourbon theme

## Responsive Design

All templates are designed to be responsive and look good on both desktop and mobile devices. 