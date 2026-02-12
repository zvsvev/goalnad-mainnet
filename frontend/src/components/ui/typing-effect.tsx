"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function TypingEffect({ text, className = "" }: { text: string; className?: string }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.p
            ref={ref}
            className={`inline-block ${className}`}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
                visible: { transition: { staggerChildren: 0.03 } },
                hidden: {},
            }}
            aria-label={text}
        >
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    variants={{
                        hidden: { opacity: 0, display: "none" },
                        visible: { opacity: 1, display: "inline" },
                    }}
                    transition={{ duration: 0 }}
                >
                    {char}
                </motion.span>
            ))}
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    times: [0, 0.5, 0.51, 1],
                    ease: "linear",
                    repeatDelay: 0.1
                }}
                className="inline-block w-2.5 h-[1.2em] ml-0.5 align-text-bottom bg-primary"
            />
        </motion.p>
    );
}
