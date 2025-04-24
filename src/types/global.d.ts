import React from 'react'

// Enable JSX without type errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

// Add type for ChangeEvents
declare module 'react' {
  interface ChangeEvent<T = Element> {
    target: EventTarget & T;
  }
  
  interface FormEvent<T = Element> {
    target: EventTarget & T;
  }
} 