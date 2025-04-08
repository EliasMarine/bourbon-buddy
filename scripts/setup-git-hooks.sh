#!/bin/bash

# Script to install git hooks for the project

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up git hooks for Bourbon Buddy...${NC}"

# Make sure we're in the project root
if [ ! -d ".git" ]; then
  echo -e "${RED}Error: This script must be run from the project root directory.${NC}"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy the pre-commit hook
cp scripts/hooks/pre-commit .git/hooks/pre-commit 2>/dev/null || {
  # If the hook doesn't exist in scripts/hooks, create a default one
  cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Pre-commit hook to prevent committing sensitive data

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "${YELLOW}Checking for sensitive data in staged files...${NC}"

# Check if any .env files are staged for commit
ENV_FILES=$(git diff --cached --name-only | grep -E '\.env.*$' || true)

if [ -n "$ENV_FILES" ]; then
  echo -e "${YELLOW}Warning: You have .env files staged for commit:${NC}"
  echo "$ENV_FILES"
  echo -e "${YELLOW}Environment files should generally not be committed to git.${NC}"
  
  # Check if file exists
  if [ -f "scripts/purge-credentials.sh" ]; then
    echo -e "${YELLOW}Running credential sanitization script...${NC}"
    bash scripts/purge-credentials.sh
    
    # Re-add the sanitized files
    for file in $ENV_FILES; do
      git add "$file"
    done
    
    echo -e "${GREEN}Sanitized env files have been re-staged for commit.${NC}"
  else
    echo -e "${RED}Warning: scripts/purge-credentials.sh not found.${NC}"
    echo -e "${YELLOW}Consider removing .env files from your commit or creating a sanitization script.${NC}"
  fi
fi

# Patterns to check for
PATTERNS=(
  # Environment variables
  "SUPABASE_SERVICE_ROLE_KEY=(?!your-supabase-service-role-key)[A-Za-z0-9\.\-_]+"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=(?!your-supabase-anon-key)[A-Za-z0-9\.\-_]+"
  "NEXTAUTH_SECRET=(?!your-nextauth-secret)[A-Za-z0-9\.\-_]+"
  "DATABASE_URL=(?!postgresql://username)[A-Za-z0-9\.\-_]+"
  "REDIS_URL=(?!redis://username)[A-Za-z0-9\.\-_]+"
  "MUX_TOKEN_SECRET=(?!your-mux-token-secret)[A-Za-z0-9\.\-_]+"
  "MUX_TOKEN_ID=(?!your-mux-token-id)[A-Za-z0-9\.\-_]+"
  
  # API keys and tokens generic patterns
  "api[_-]?key[=\"':= ]+[A-Za-z0-9\.\-_]+"
  "auth[_-]?token[=\"':= ]+[A-Za-z0-9\.\-_]+"
  "oauth[_-]?token[=\"':= ]+[A-Za-z0-9\.\-_]+"
  "access[_-]?token[=\"':= ]+[A-Za-z0-9\.\-_]+"
  "secret[_-]?key[=\"':= ]+[A-Za-z0-9\.\-_]+"
  "private[_-]?key[=\"':= ]+[A-Za-z0-9\.\-_]+"
  
  # AWS
  "AKIA[0-9A-Z]{16}"
  "aws_secret_access_key[=\"':= ]+[A-Za-z0-9/\+=]+"
  
  # Generic private keys
  "BEGIN( RSA)? PRIVATE KEY"
  
  # JWT tokens
  "eyJ[a-zA-Z0-9]{10,}\.eyJ[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,}"
  
  # Database connection strings
  "mongodb(\+srv)?://[A-Za-z0-9]+:[A-Za-z0-9]+@[A-Za-z0-9\.\-]+"
  "postgres(ql)?://[A-Za-z0-9]+:[A-Za-z0-9]+@[A-Za-z0-9\.\-]+"
  "mysql://[A-Za-z0-9]+:[A-Za-z0-9]+@[A-Za-z0-9\.\-]+"
  
  # OAuth Credentials
  "GOOGLE_CLIENT_SECRET=[A-Za-z0-9\.\-_]+"
  "GITHUB_CLIENT_SECRET=[A-Za-z0-9\.\-_]+"
  "APPLE_CLIENT_SECRET=[A-Za-z0-9\.\-_]+"
  
  # IP addresses (potential hardcoded server IPs)
  "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)"
)

# Functions to check files
check_file() {
  local file="$1"
  local found=0
  
  for pattern in "${PATTERNS[@]}"; do
    matches=$(grep -EH "$pattern" "$file" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      if [ "$found" -eq 0 ]; then
        echo -e "${RED}Potential sensitive data found in: ${file}${NC}"
        found=1
      fi
      echo "  - Matches pattern: $pattern"
    fi
  done
  
  return $found
}

# Get list of staged files
FILES=$(git diff --cached --name-only)
ERROR=0

for file in $FILES; do
  # Skip if file doesn't exist or is not a regular file
  [ ! -f "$file" ] && continue
  
  # Only check certain file types
  if [[ "$file" =~ \.(js|jsx|ts|tsx|json|md|txt|yml|yaml|env|sh|bash|zsh|fish|conf|config|ini|toml|html|css|scss|less|svg|xml)$ ]] || [[ "$file" =~ \.env ]]; then
    check_file "$file"
    if [ $? -eq 1 ]; then
      ERROR=1
    fi
  fi
done

if [ $ERROR -eq 1 ]; then
  echo -e "${RED}ERROR: Potential sensitive data detected in staged files.${NC}"
  echo -e "${YELLOW}Please remove the sensitive data before committing.${NC}"
  echo -e "You can use the sanitization script: ${GREEN}bash scripts/purge-credentials.sh${NC}"
  echo -e "To bypass this check (USE WITH CAUTION), use: ${GREEN}git commit --no-verify${NC}"
  exit 1
else
  echo -e "${GREEN}No sensitive data detected in staged files.${NC}"
fi

exit 0
EOF
}

# Make the hooks executable
chmod +x .git/hooks/pre-commit

# Ensure the purge-credentials script is executable
if [ -f "scripts/purge-credentials.sh" ]; then
  chmod +x scripts/purge-credentials.sh
else
  echo -e "${YELLOW}Warning: scripts/purge-credentials.sh not found.${NC}"
  echo -e "This script is used to sanitize environment files before committing."
  echo -e "You may want to create this script for better Git hygiene."
fi

# Create a directory for storing hooks that can be versioned
mkdir -p scripts/hooks

# Copy the current pre-commit hook to the scripts/hooks directory for versioning
cp .git/hooks/pre-commit scripts/hooks/pre-commit

echo -e "${GREEN}Git hooks set up successfully!${NC}"
echo -e "${YELLOW}Note: Git hooks are local and not tracked by git by default.${NC}"
echo -e "${YELLOW}The pre-commit hook has been copied to scripts/hooks for versioning.${NC}"
echo -e "${YELLOW}New team members should run scripts/setup-git-hooks.sh after cloning the repository.${NC}"

exit 0 