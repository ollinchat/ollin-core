"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { generateUUID } from "@/lib/uuid";

/** Internal = Emil, employees (for task/checklist assignment). External clients are in Finance. */
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** Ollin 7-digit ID – when set, contact is an internal User for assignment */
  userId?: string;
  /** Role for internal users (e.g. Founder, Employee) */
  role?: string;
  /** Short bio for Digital Business Card */
  bio?: string;
  /** Task handshake: if false, tasks from this contact are hidden until toggled on in Contact Info */
  allowTasksFrom?: boolean;
  /** If true, contact is blocked (e.g. from Block/Report in chat). */
  blocked?: boolean;
  createdAt: number;
}

const STORAGE_KEY = "ollin_contacts";
const SEED_KEY = "ollin_contacts_seeded";

const DEMO_CONTACTS: Omit<Contact, "id" | "createdAt">[] = [
  { name: "Sarah Chen", email: "sarah@example.com", phone: "+972501234567" },
  { name: "David Levi", email: "david@example.com", phone: "+972502345678" },
  { name: "Maya Cohen", email: "maya@example.com", phone: "+972503456789" },
  { name: "Alex Kim", email: "alex@example.com", phone: "+972504567890" },
  { name: "Noa Shapira", email: "noa@example.com", phone: "+972505678901" },
  { name: "R&D Team", email: "rnd@company.com", phone: "" },
];

function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (_) {}
}

type ContactsContextType = {
  contacts: Contact[];
  addContact: (c: Omit<Contact, "id" | "createdAt">) => Contact;
  /** Add a contact with a specific id (e.g. conversation partner not yet in contacts). */
  addContactWithId: (id: string, data: { name?: string; email?: string; phone?: string; bio?: string }) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  removeContact: (id: string) => void;
};

const ContactsContext = createContext<ContactsContextType | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => {
    let list = loadContacts();
    if (list.length === 0 && typeof window !== "undefined" && !localStorage.getItem(SEED_KEY)) {
      const now = Date.now();
      const seeded = DEMO_CONTACTS.map((c, i) => ({
        ...c,
        id: `demo-${i + 1}`,
        createdAt: now - (DEMO_CONTACTS.length - i) * 60000,
      }));
      saveContacts(seeded);
      localStorage.setItem(SEED_KEY, "1");
      list = seeded;
    }
    setContacts(list);
  }, []);

  const addContact = useCallback((c: Omit<Contact, "id" | "createdAt">): Contact => {
    const contact: Contact = { ...c, id: generateUUID(), createdAt: Date.now() };
    setContacts((prev) => {
      const next = [contact, ...prev];
      saveContacts(next);
      return next;
    });
    return contact;
  }, []);

  const addContactWithId = useCallback((id: string, data: { name?: string; email?: string; phone?: string; bio?: string }) => {
    const contact: Contact = {
      id,
      name: data.name ?? id,
      email: data.email ?? "",
      phone: data.phone,
      bio: data.bio,
      createdAt: Date.now(),
    };
    setContacts((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      const next = [contact, ...prev];
      saveContacts(next);
      return next;
    });
    return contact;
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveContacts(next);
      return next;
    });
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveContacts(next);
      return next;
    });
  }, []);

  return (
    <ContactsContext.Provider value={{ contacts, addContact, addContactWithId, updateContact, removeContact }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
}
