// Type declarations for VideoComments component
declare module '@/components/video-comments' {
  export interface User {
    name: string | null;
    image: string | null;
  }

  export interface Comment {
    id: string;
    content: string;
    userId: string;
    videoId: string;
    createdAt: Date;
    user: User;
  }

  export interface VideoCommentsProps {
    videoId: string;
    initialComments: Comment[];
  }

  export default function VideoComments(props: VideoCommentsProps): JSX.Element;
} 