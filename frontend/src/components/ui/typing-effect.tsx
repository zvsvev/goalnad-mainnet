"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function TypingEffect({ text, className = "" }: { text: string; className?: string }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.p
            ref={ref}
            className={className}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
                visible: { transition: { staggerChildren: 0.015 } },
                hidden: {},
            }}
            aria-label={text}
        >
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                    }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.p>
    );
}
