import NextAuth from 'next-auth';
import "next-auth"

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      coverPhoto?: string | null;
      username?: string | null;
      location?: string | null;
      occupation?: string | null;
      education?: string | null;
      bio?: string | null;
      publicProfile?: boolean | null;
    }
    accessToken?: string
    refreshToken?: string
    provider?: string
    expires: string
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    coverPhoto?: string | null;
    username?: string | null;
    location?: string | null;
    occupation?: string | null;
    education?: string | null;
    bio?: string | null;
    publicProfile?: boolean | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    accessToken?: string
    refreshToken?: string
    provider?: string
  }
}

export {} 