import React from "react"
import { motion } from "framer-motion"

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
  animate?: boolean
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width = "100%",
  height = "1rem",
  rounded = false,
  animate = true
}) => {
  const shimmer = {
    hidden: { x: "-100%" },
    visible: {
      x: "100%",
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut" as const
      }
    }
  }

  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700 relative overflow-hidden
        ${rounded ? "rounded-full" : "rounded"}
        ${className}
      `}
      style={{ width, height }}
    >
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          variants={shimmer}
          initial="hidden"
          animate="visible"
        />
      )}
    </div>
  )
}

// Card skeleton for CV preview loading
export const CVPreviewSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
    {/* Header */}
    <div className="space-y-3">
      <Skeleton height="2rem" width="60%" />
      <div className="flex space-x-4">
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="1rem" width="25%" />
        <Skeleton height="1rem" width="35%" />
      </div>
    </div>

    {/* Summary */}
    <div className="space-y-2">
      <Skeleton height="1.25rem" width="40%" />
      <Skeleton height="1rem" width="100%" />
      <Skeleton height="1rem" width="85%" />
      <Skeleton height="1rem" width="70%" />
    </div>

    {/* Experience */}
    <div className="space-y-4">
      <Skeleton height="1.25rem" width="45%" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2 border-l-4 border-gray-200 pl-4">
          <Skeleton height="1.125rem" width="50%" />
          <Skeleton height="1rem" width="40%" />
          <div className="space-y-1">
            <Skeleton height="0.875rem" width="95%" />
            <Skeleton height="0.875rem" width="80%" />
          </div>
        </div>
      ))}
    </div>

    {/* Skills */}
    <div className="space-y-3">
      <Skeleton height="1.25rem" width="30%" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton height="1rem" width="60%" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} height="1.5rem" width="4rem" rounded />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Question skeleton for AI questions loading
export const QuestionSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
    <div className="space-y-2">
      <Skeleton height="1.25rem" width="80%" />
      <Skeleton height="1rem" width="95%" />
    </div>

    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton width="1rem" height="1rem" rounded />
          <Skeleton height="1rem" width="60%" />
        </div>
      ))}
    </div>
  </div>
)

// List skeleton for general lists
export const ListSkeleton: React.FC<{
  items?: number
  showHeader?: boolean
}> = ({ items = 3, showHeader = true }) => (
  <div className="space-y-4">
    {showHeader && <Skeleton height="1.5rem" width="40%" />}
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton width="2.5rem" height="2.5rem" rounded />
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="70%" />
            <Skeleton height="0.875rem" width="50%" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Button skeleton
export const ButtonSkeleton: React.FC<{ width?: string }> = ({
  width = "8rem"
}) => <Skeleton height="2.5rem" width={width} className="rounded-lg" />

// Text block skeleton
export const TextBlockSkeleton: React.FC<{ lines?: number }> = ({
  lines = 3
}) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? "60%" : "100%"}
      />
    ))}
  </div>
)

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height="1.25rem" width="80%" />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height="1rem" width="90%" />
        ))}
      </div>
    ))}
  </div>
)

// Score display skeleton
export const ScoreSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
    {/* Header */}
    <div className="text-center space-y-3">
      <Skeleton height="2rem" width="50%" className="mx-auto" />
      <Skeleton width="5rem" height="5rem" rounded className="mx-auto" />
      <Skeleton height="1rem" width="30%" className="mx-auto" />
    </div>

    {/* Breakdown */}
    <div className="space-y-4">
      <Skeleton height="1.25rem" width="40%" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton height="1rem" width="30%" />
          <div className="flex items-center space-x-2">
            <Skeleton height="0.5rem" width="8rem" className="rounded-full" />
            <Skeleton height="1rem" width="2rem" />
          </div>
        </div>
      ))}
    </div>

    {/* Suggestions */}
    <div className="space-y-3">
      <Skeleton height="1.25rem" width="35%" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start space-x-2">
            <Skeleton width="0.5rem" height="0.5rem" rounded className="mt-2" />
            <Skeleton height="1rem" width="85%" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Form field skeleton
export const FormFieldSkeleton: React.FC<{ label?: boolean }> = ({
  label = true
}) => (
  <div className="space-y-2">
    {label && <Skeleton height="1rem" width="30%" />}
    <Skeleton height="2.5rem" width="100%" className="rounded-md" />
  </div>
)

// Progress bar skeleton
export const ProgressSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Skeleton height="0.875rem" width="25%" />
      <Skeleton height="0.875rem" width="15%" />
    </div>
    <Skeleton height="0.5rem" width="100%" className="rounded-full" />
  </div>
)

export default Skeleton
