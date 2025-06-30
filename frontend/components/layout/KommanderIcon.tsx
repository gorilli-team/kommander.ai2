
import React from 'react';

const KommanderIcon = ({ size = "default" }: { size?: "default" | "large" }) => (
  <span
    className={`${size === "large" ? "text-4xl" : "text-3xl"} text-primary font-bold`}
    aria-label="Kommander.ai Logo"
    style={{ lineHeight: 1 }}
  >
    ⌘
  </span>
);

export default KommanderIcon;
