"use client";

type UserAvatarProps = {
  name?: string;
  email?: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
};

function initials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const local = email.split("@")[0] || "";
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return local.slice(0, 1).toUpperCase() || "?";
  }
  return "?";
}

export function UserAvatar({ name, email, imageUrl, size = "sm", className = "" }: UserAvatarProps) {
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  const init = initials(name, email);

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-sm bg-[#008080]/20 text-[#006666] font-semibold overflow-hidden ${sizeClass} ${className}`}
      title={name || email || undefined}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        init
      )}
    </span>
  );
}
