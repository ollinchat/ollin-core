export const BIO_MAX_LENGTH = 1000;
export const PORTFOLIO_MAX_ITEMS = 20;

export interface PortfolioItem {
  id: string;
  image: string; // data URL or URL
  description: string;
}

export interface ProjectPosition {
  id: string;
  title: string;
  date: string;
  images: string[];
  description: string;
}

export interface PressMediaLink {
  id: string;
  label: string;
  url: string;
}

export interface Profile {
  /** Unique 7-digit Ollin ID (e.g. 0123456), assigned on registration. */
  userId?: string;
  username: string;
  profileImage: string;
  companyLogo: string;
  /** Data URL for signature overlay on generated invoices/PDFs */
  signatureImage?: string;
  name: string;
  professionalTitle: string;
  bio: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  linkedin: string;
  instagram: string;
  behance: string;
  portfolio: PortfolioItem[];
  projects?: ProjectPosition[];
  pressMedia?: PressMediaLink[];
}

export const defaultProfile: Profile = {
  userId: undefined,
  username: "",
  profileImage: "",
  companyLogo: "",
  name: "",
  professionalTitle: "",
  bio: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  linkedin: "",
  instagram: "",
  behance: "",
  portfolio: [],
  signatureImage: undefined,
  projects: [],
  pressMedia: [],
};

export function slugFromUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}
