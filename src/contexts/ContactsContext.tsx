"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** Ollin 7-digit ID (e.g. 0123456) for search. */
  userId?: string;
  createdAt: number;
}

const STORAGE_KEY = "ollin_contacts";

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
  updateContact: (id: string, updates: Partial<Contact>) => void;
  removeContact: (id: string) => void;
};

const ContactsContext = createContext<ContactsContextType | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => setContacts(loadContacts()), []);

  const addContact = useCallback((c: Omit<Contact, "id" | "createdAt">): Contact => {
    const contact: Contact = { ...c, id: crypto.randomUUID(), createdAt: Date.now() };
    setContacts((prev) => {
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
    <ContactsContext.Provider value={{ contacts, addContact, updateContact, removeContact }}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
}
