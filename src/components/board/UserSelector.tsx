"use client";

import React, { useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Contact } from "@/contexts/ContactsContext";
import { ChevronDown } from "lucide-react";

export type InternalUser = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
};

type UserSelectorProps = {
  /** Current user (Emil) + internal contacts (with userId) */
  users: InternalUser[];
  /** Single assignee (userId) */
  value?: string;
  /** Multiple assignees (userIds) for GIVEN tasks */
  multiple?: boolean;
  multipleValue?: string[];
  onChange: (userId: string) => void;
  onMultipleChange?: (userIds: string[]) => void;
  placeholder?: string;
  locale: "en" | "he";
  /** Only creator can assign; hide when false */
  disabled?: boolean;
};

export function UserSelector({
  users,
  value,
  multiple,
  multipleValue = [],
  onChange,
  onMultipleChange,
  placeholder,
  locale,
  disabled,
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = value ? users.find((u) => u.userId === value) : null;
  const selectedUsers = multiple ? users.filter((u) => multipleValue.includes(u.userId)) : [];

  const toggleMulti = (userId: string) => {
    if (!onMultipleChange) return;
    const set = new Set(multipleValue);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    onMultipleChange(Array.from(set));
  };

  if (disabled) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {selectedUser && (
          <UserAvatar name={selectedUser.name} email={selectedUser.email} imageUrl={selectedUser.avatar} size="sm" />
        )}
        {multiple && selectedUsers.length > 0 && (
          selectedUsers.map((u) => (
            <UserAvatar key={u.userId} name={u.name} email={u.email} imageUrl={u.avatar} size="sm" />
          ))
        )}
        {!selectedUser && (!multiple || selectedUsers.length === 0) && (
          <span className="text-xs text-gray-400">{placeholder ?? (locale === "he" ? "לא הוקצה" : "Unassigned")}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 flex-wrap min-h-8 px-2 py-1 rounded-sm border border-gray-200 bg-white text-left hover:bg-gray-50"
      >
        {multiple && selectedUsers.length > 0 ? (
          <span className="flex items-center gap-1 flex-wrap">
            {selectedUsers.map((u) => (
              <UserAvatar key={u.userId} name={u.name} email={u.email} imageUrl={u.avatar} size="sm" />
            ))}
          </span>
        ) : selectedUser ? (
          <>
            <UserAvatar name={selectedUser.name} email={selectedUser.email} imageUrl={selectedUser.avatar} size="sm" />
            <span className="text-sm text-gray-700 truncate max-w-[120px]">{selectedUser.name}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500">{placeholder ?? (locale === "he" ? "בחר משתמש" : "Select user")}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] rounded-sm border border-gray-200 bg-white shadow-lg py-1 max-h-60 overflow-auto">
            {users.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">{locale === "he" ? "הוסף אנשי קשר עם מזהה Ollin" : "Add contacts with Ollin ID"}</p>
            ) : (
              users.map((u) => {
                const selected = multiple ? multipleValue.includes(u.userId) : value === u.userId;
                return (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => {
                      if (multiple && onMultipleChange) toggleMulti(u.userId);
                      else {
                        onChange(u.userId);
                        setOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-none border-0 border-b border-gray-100 last:border-b-0 hover:bg-[#008080]/10 ${
                      selected ? "bg-[#008080]/10 text-[#006666]" : "text-gray-900"
                    }`}
                  >
                    <UserAvatar name={u.name} email={u.email} imageUrl={u.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.role && <p className="text-[10px] text-gray-500">{u.role}</p>}
                    </div>
                    {multiple && selected && <span className="text-[#008080] text-xs">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Build internal users list: current profile + contacts that have userId */
export function buildInternalUsers(
  profile: { userId?: string; name?: string; email?: string; profileImage?: string } | null,
  contacts: Contact[]
): InternalUser[] {
  const list: InternalUser[] = [];
  if (profile?.userId) {
    const p = profile as { profileImage?: string };
    list.push({
      id: profile.userId,
      userId: profile.userId,
      name: profile.name || "Me",
      email: profile.email,
      avatar: p.profileImage,
      role: "Me",
    });
  }
  contacts
    .filter((c) => c.userId && c.userId !== profile?.userId)
    .forEach((c) => {
      list.push({
        id: c.id,
        userId: c.userId!,
        name: c.name,
        email: c.email,
        avatar: c.avatar,
        role: c.role,
      });
    });
  return list;
}
