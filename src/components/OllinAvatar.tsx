"use client";

import React from "react";

interface AvatarProps {
  seed: string;
  evolutionLevel: number;
}

const OllinAvatar: React.FC<AvatarProps> = ({ seed, evolutionLevel }) => {
  // Generate unique visual based on user-specific seed
  const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=000000&primaryColor=008080`;

  return (
    <div className="relative flex items-center justify-center">
      {/* Dynamic Halo - intensity scales with evolutionLevel */}
      <div
        className="absolute -top-4 w-12 h-2 bg-[#008080] rounded-full blur-md animate-pulse"
        style={{ opacity: Math.min(evolutionLevel * 0.2, 1) }}
      />

      {/* Avatar Container */}
      <div className="w-20 h-20 border border-[#008080] rounded-full overflow-hidden shadow-lg">
        <img src={avatarUrl} alt="Ollin Core" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default OllinAvatar;
