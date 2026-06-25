"use client";

import { useState } from "react";

interface AirlineLogoProps {
  airlineCode: string;
  airlineName: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AirlineLogo({
  airlineName,
  logoUrl,
  size = "md",
  className = "",
}: AirlineLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "h-6 w-24",
    md: "h-10 w-40",
    lg: "h-20 w-96",
  };

  if (!logoUrl || imgError) {
    return (
      <span
        className={`${sizeClasses[size]} ${className} inline-flex items-center justify-center text-center text-sm font-bold text-gray-700`}
      >
        {airlineName}
      </span>
    );
  }

  return (
    <span className={`${sizeClasses[size]} ${className} inline-flex items-center justify-center`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={airlineName}
        className="h-full w-full object-contain"
        onError={() => setImgError(true)}
      />
    </span>
  );
}
