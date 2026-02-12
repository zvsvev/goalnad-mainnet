"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface MotionWrapperProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
    viewportAmount?: number;
}

export const MotionWrapper = ({
    children,
    delay = 0,
    className,
    viewportAmount = 0.2,
}: MotionWrapperProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: viewportAmount }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
};
