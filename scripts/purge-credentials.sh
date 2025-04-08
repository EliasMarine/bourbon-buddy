#!/bin/bash

# Script to clean environment variables for safe git operations
# This script replaces real values with placeholders in .env files

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Purging sensitive credentials from environment files...${NC}"

# Define environment files to clean
ENV_FILES=(
  ".env"
  ".env.local"
  ".env.development"
  ".env.production"
)

# Create backups directory if it doesn't exist
mkdir -p .env-backups

# Get timestamp for backup naming
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to clean a specific .env file
clean_env_file() {
  local file=$1
  
  # Check if file exists
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}File $file not found, skipping.${NC}"
    return
  fi
  
  # Create a backup
  cp "$file" ".env-backups/${file}_${TIMESTAMP}.bak"
  echo -e "${GREEN}Created backup: .env-backups/${file}_${TIMESTAMP}.bak${NC}"
  
  # Replace sensitive values with placeholders
  # Supabase
  sed -i.tmp -E 's/(NEXT_PUBLIC_SUPABASE_URL=)(.+)/\1"your-supabase-url"/g' "$file"
  sed -i.tmp -E 's/(NEXT_PUBLIC_SUPABASE_ANON_KEY=)(.+)/\1"your-supabase-anon-key"/g' "$file"
  sed -i.tmp -E 's/(SUPABASE_SERVICE_ROLE_KEY=|SUPABASE_SERVICE_KEY=)(.+)/\1"your-supabase-service-role-key"/g' "$file"
  
  # Database
  sed -i.tmp -E 's/(DATABASE_URL=)(.+)/\1"postgresql:\/\/username:password@localhost:5432\/database"/g' "$file"
  sed -i.tmp -E 's/(DIRECT_DATABASE_URL=)(.+)/\1"postgresql:\/\/username:password@localhost:5432\/database"/g' "$file"
  sed -i.tmp -E 's/(SHADOW_DATABASE_URL=)(.+)/\1"postgresql:\/\/username:password@localhost:5432\/database"/g' "$file"

  # NextAuth
  sed -i.tmp -E 's/(NEXTAUTH_SECRET=)(.+)/\1"your-nextauth-secret"/g' "$file"
  sed -i.tmp -E 's/(NEXTAUTH_URL=)(.+)/\1"http:\/\/localhost:3000"/g' "$file"
  
  # Redis
  sed -i.tmp -E 's/(REDIS_URL=)(.+)/\1"redis:\/\/localhost:6379"/g' "$file"
  
  # OAuth providers
  sed -i.tmp -E 's/(GOOGLE_CLIENT_ID=)(.+)/\1"your-google-client-id"/g' "$file"
  sed -i.tmp -E 's/(GOOGLE_CLIENT_SECRET=)(.+)/\1"your-google-client-secret"/g' "$file"
  sed -i.tmp -E 's/(GITHUB_CLIENT_ID=)(.+)/\1"your-github-client-id"/g' "$file"
  sed -i.tmp -E 's/(GITHUB_CLIENT_SECRET=)(.+)/\1"your-github-client-secret"/g' "$file"
  sed -i.tmp -E 's/(APPLE_CLIENT_ID=)(.+)/\1"your-apple-client-id"/g' "$file"
  sed -i.tmp -E 's/(APPLE_CLIENT_SECRET=)(.+)/\1"your-apple-client-secret"/g' "$file"

  # MUX variables
  sed -i.tmp -E 's/(MUX_TOKEN_ID=)(.+)/\1"your-mux-token-id"/g' "$file"
  sed -i.tmp -E 's/(MUX_TOKEN_SECRET=)(.+)/\1"your-mux-token-secret"/g' "$file"
  
  # Any API keys
  sed -i.tmp -E 's/(API_KEY=)(.+)/\1"your-api-key"/g' "$file"
  
  # Remove temporary files created by sed
  rm -f "$file.tmp"
  
  echo -e "${GREEN}Cleaned $file${NC}"
}

# Process each file
for file in "${ENV_FILES[@]}"; do
  clean_env_file "$file"
done

echo -e "${GREEN}All environment files have been cleaned. Original files are backed up in .env-backups directory.${NC}"
echo -e "${YELLOW}Important: These changes are only in your working directory. Don't forget to restore your actual credentials for development.${NC}"

# Instructions for restoration
echo -e "\nTo restore your credentials, you can:"
echo -e "1. Copy from backups: ${GREEN}cp .env-backups/your-backup-file .env${NC}"
echo -e "2. Use git to discard changes: ${GREEN}git checkout -- .env${NC}"

exit 0 