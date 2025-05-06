import { ReactNode } from 'react';

declare module '@/components/ui/button' {
  export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
  }

  export default function Button(props: ButtonProps): JSX.Element;
} 