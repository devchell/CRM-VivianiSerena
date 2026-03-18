import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@viviani/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-rose-gold text-white',
        secondary: 'border-transparent bg-blush text-charcoal',
        outline: 'border-rose-gold text-rose-gold bg-transparent',
        success: 'border-transparent bg-sage text-white',
        warning: 'border-transparent bg-amber-400 text-white',
        destructive: 'border-transparent bg-red-500 text-white',
        new: 'border-transparent bg-blue-100 text-blue-700',
        contacted: 'border-transparent bg-yellow-100 text-yellow-700',
        qualified: 'border-transparent bg-purple-100 text-purple-700',
        converted: 'border-transparent bg-green-100 text-green-700',
        lost: 'border-transparent bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
