import React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

// Add type for form event
declare module 'react' {
  interface FormEvent<T = Element> {
    target: EventTarget & T
  }
}

export {} 