import React from 'react'
import clsx from 'clsx'

interface SeparatorProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  const baseStyles = 'shrink-0 bg-gray-700'
  
  const orientationStyles = {
    horizontal: 'h-[1px] w-full',
    vertical: 'h-full w-[1px]'
  }

  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={clsx(
        baseStyles,
        orientationStyles[orientation],
        className
      )}
      {...props}
    />
  )
}

export default Separator 