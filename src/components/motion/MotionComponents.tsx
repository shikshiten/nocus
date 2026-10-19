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
 * Refined for 120fps butter-smooth responsiveness across mobile & desktop.
 */
export const MOTION_CONFIG = {
  // Reveal timing
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const, // Apple/Vercel standard fluid cubic bezier
  staggerChildren: 0.07,
  viewportAmount: 0.12, // Triggers earlier to avoid feeling delayed or pop-in
  defaultYOffset: 18,

  // Spring physics for smooth scroll interpolation
  springPhysics: {
    stiffness: 100,
    damping: 24,
    mass: 0.15,
    restDelta: 0.001,
  },

  // Hero parallax
  heroParallaxDesktopY: -45,
  heroParallaxMobileY: -18,
  heroParallaxOpacityEnd: 0.45,

  // Decorative blobs parallax
  blobParallaxDesktopY: [-25, 35, -20] as const,
  blobParallaxMobileY: [-10, 15, -8] as const,

  // Mockup preview
  previewScaleStart: 0.96,
  previewTiltDeg: 4,

  // Interactive micro-lift
  hoverLiftY: -3,
  tapScale: 0.98,
};

/**
 * Top-of-page fixed reading/scroll progress indicator with silky spring damping.
 */
export function ScrollProgressBar({ className = "" }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 300,
    damping: 35,
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
 * Reusable scroll-reveal wrapper that animates smoothly into view.
 */
export function Reveal({
  children,
  delay = 0,
  yOffset = MOTION_CONFIG.defaultYOffset,
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
      delayChildren: 0.02,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
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
  viewportAmount = MOTION_CONFIG.viewportAmount,
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
