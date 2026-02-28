import React from "react";

interface CabinClassIconProps {
  className?: string;
}

export function CabinClassIcon({ className }: CabinClassIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="120 80 780 860"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M682.666667 170.666667h-85.333334c-46.933333 0-85.333333 38.4-85.333333 85.333333v213.333333c0 46.933333 38.4 85.333333 85.333333 85.333334h85.333334c46.933333 0 85.333333-38.4 85.333333-85.333334V256c0-46.933333-38.4-85.333333-85.333333-85.333333zM405.333333 682.666667H768v85.333333H404.906667c-37.546667 0-70.826667-24.746667-81.92-61.013333L213.333333 341.333333V170.666667h85.333334v170.666666l106.666666 341.333334zM341.333333 810.666667h426.666667v85.333333H341.333333v-85.333333z" />
    </svg>
  );
}
