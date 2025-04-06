import NextAuth from 'next-auth';

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

export {} 