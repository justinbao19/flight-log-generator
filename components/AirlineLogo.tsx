"use client";

import { useState } from "react";

interface AirlineLogoProps {
  airlineCode: string;
  airlineName: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
}

export default function AirlineLogo({
  airlineName,
  logoUrl,
  size = "md",
}: AirlineLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "h-6",
    md: "h-10",
    lg: "h-20",
  };

  if (!logoUrl || imgError) {
    return (
      <span className="text-sm font-bold text-gray-700">{airlineName}</span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={airlineName}
      className={`${sizeClasses[size]} object-contain`}
      onError={() => setImgError(true)}
    />
  );
}
