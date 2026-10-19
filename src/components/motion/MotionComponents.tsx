import React from "react";
import {
  motion,
  useScroll,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react";

/**
 * Global Motion Configuration & Tuning Center
 * Adjust animation distances, speeds, and timing curves in this single location.
 */
export const MOTION_CONFIG = {
  // Reveal timing
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1] as const, // Smooth cubic ease-out
  staggerChildren: 0.09,
  viewportAmount: 0.25,

  // Hero parallax
  heroParallaxDesktopY: -60,
  heroParallaxMobileY: -25,
  heroParallaxOpacityEnd: 0.35,

  // Decorative blobs parallax
  blobParallaxDesktopY: [-40, 50, -30] as const,
  blobParallaxMobileY: [-15, 20, -10] as const,

  // Mockup preview
  previewScaleStart: 0.94,
  previewTiltDeg: 7,

  // Interactive micro-lift
  hoverLiftY: -3,
  tapScale: 0.98,
};

/**
 * Top-of-page fixed reading/scroll progress indicator.
 */
export function ScrollProgressBar({ className = "" }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 z-[100] origin-left pointer-events-none shadow-[0_0_12px_rgba(99,102,241,0.5)] ${className}`}
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

export interface RevealProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
  className?: string;
}

/**
 * Reusable scroll-reveal wrapper that animates into view once visible.
 */
export function Reveal({
  children,
  delay = 0,
  yOffset = 24,
  className = "",
  ...props
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: yOffset }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: MOTION_CONFIG.viewportAmount }}
      transition={{
        duration: shouldReduceMotion ? 0.2 : MOTION_CONFIG.duration,
        delay,
        ease: MOTION_CONFIG.ease,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_CONFIG.staggerChildren,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_CONFIG.duration,
      ease: MOTION_CONFIG.ease,
    },
  },
};

/**
 * Stagger parent container for cards, steps, or grid items.
 */
export function StaggerGroup({
  children,
  className = "",
  viewportAmount = 0.2,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  viewportAmount?: number;
} & HTMLMotionProps<"div">) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual child item inside a StaggerGroup.
 */
export function StaggerItem({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLMotionProps<"div">) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}
