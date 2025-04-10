# Apple Sign In Secret Generator

This script generates a client secret for Apple Sign In using JWT (JSON Web Token).

## Prerequisites

- Node.js installed
- Apple Developer Account
- Apple Team ID
- Apple Services ID (Client ID)
- Private Key ID
- Private Key file (.p8) or Private Key content

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `scripts` directory with the following variables:

```env
APPLE_TEAM_ID=your_team_id
APPLE_CLIENT_ID=your_client_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY=your_private_key_or_path_to_p8_file
```

Note: For `APPLE_PRIVATE_KEY`, you can either:
- Provide the path to your .p8 file (e.g., `./AuthKey_XXXXXXXX.p8`)
- Paste the private key content directly (replace newlines with \n)

## Usage

Run the script:
```bash
npm run generate
```

The script will:
1. Validate environment variables
2. Generate a client secret valid for 180 days
3. Output the generated secret and its expiration notice

## Error Handling

The script will throw descriptive errors if:
- Required environment variables are missing
- Private key file cannot be read
- Private key format is invalid

## Security Notes

- Keep your private key secure and never commit it to version control
- Store the .env file securely and never commit it to version control
- Rotate your client secret before it expires (180 days) 