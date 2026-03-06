/**
 * Modular Profile Builder (Mini-Site) – types for fixed header + dynamic blocks.
 */

/** Fixed header – same for everyone */
export interface ProfileBuilderHeader {
  coverImage: string;
  profileImage: string;
  fullName: string;
  title: string;
  bio: string;
  /** Quick contact – clickable links */
  whatsapp?: string;
  mobile?: string;
  email?: string;
  /** Social links – URLs */
  socialLinks?: {
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    [key: string]: string | undefined;
  };
}

/** Block type identifiers */
export type ProfileBlockType =
  | "address"
  | "team"
  | "gallery"
  | "content"
  | "ecommerce"
  | "contact_form"
  | "banner"
  | "video"
  | "rich_video";

/** Per-block configs (type-specific) */
export interface AddressBlockConfig {
  address: {
    label?: string;
    text: string;
    mapUrl?: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  photo: string;
  link?: string;
}

export interface TeamBlockConfig {
  team: {
    title?: string;
    members: TeamMember[];
  };
}

export interface GalleryBlockConfig {
  gallery: {
    title?: string;
    images: { id: string; url: string; caption?: string }[];
  };
}

export interface ContentBlockConfig {
  content: {
    layout: "side" | "stacked";
    image: string;
    text: string;
    title?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
}

export interface ProductItem {
  id: string;
  image: string;
  title: string;
  description: string;
  price: string;
  buyNowUrl: string;
}

export interface EcommerceBlockConfig {
  ecommerce: {
    title?: string;
    products: ProductItem[];
  };
}

export interface ContactFormBlockConfig {
  contact_form: {
    title?: string;
    submitLabel?: string;
    successMessage?: string;
  };
}

export interface BannerBlockConfig {
  banner: {
    image: string;
    headline?: string;
    subline?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
}

export interface VideoBlockConfig {
  video: {
    type: "youtube" | "vimeo" | "upload";
    url: string;
    /** For upload: data URL or blob URL */
    uploadUrl?: string;
  };
}

export interface RichVideoBlockConfig {
  rich_video: {
    type: "youtube" | "vimeo" | "upload";
    url: string;
    uploadUrl?: string;
    title?: string;
    description?: string;
  };
}

export type ProfileBlockConfig =
  | AddressBlockConfig
  | TeamBlockConfig
  | GalleryBlockConfig
  | ContentBlockConfig
  | EcommerceBlockConfig
  | ContactFormBlockConfig
  | BannerBlockConfig
  | VideoBlockConfig
  | RichVideoBlockConfig;

export interface ProfileBlock {
  id: string;
  type: ProfileBlockType;
  order: number;
  config: ProfileBlockConfig;
}

export interface ProfileBuilderData {
  header: ProfileBuilderHeader;
  blocks: ProfileBlock[];
}

const defaultHeader: ProfileBuilderHeader = {
  coverImage: "",
  profileImage: "",
  fullName: "",
  title: "",
  bio: "",
  whatsapp: "",
  mobile: "",
  email: "",
  socialLinks: {},
};

export const defaultProfileBuilderData: ProfileBuilderData = {
  header: defaultHeader,
  blocks: [],
};

/** Default config per block type (for new blocks) */
export function getDefaultBlockConfig(type: ProfileBlockType): ProfileBlockConfig {
  switch (type) {
    case "address":
      return { address: { text: "", label: "Address", mapUrl: "" } };
    case "team":
      return { team: { title: "Our Team", members: [] } };
    case "gallery":
      return { gallery: { title: "Gallery", images: [] } };
    case "content":
      return { content: { layout: "side", image: "", text: "", title: "" } };
    case "ecommerce":
      return { ecommerce: { title: "Products", products: [] } };
    case "contact_form":
      return { contact_form: { title: "Get in touch", submitLabel: "Send", successMessage: "Thanks! We'll be in touch." } };
    case "banner":
      return { banner: { image: "", headline: "", subline: "", ctaLabel: "", ctaUrl: "" } };
    case "video":
      return { video: { type: "youtube", url: "" } };
    case "rich_video":
      return { rich_video: { type: "youtube", url: "", title: "", description: "" } };
    default:
      return {} as ProfileBlockConfig;
  }
}
