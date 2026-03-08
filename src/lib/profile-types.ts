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

/** Primary CTA for mini-site header: Chat (internal), WhatsApp, or Call */
export type PrimaryActionType = "Chat" | "WhatsApp" | "Call";

/** Modular profile block: LinkedIn-style + Trust Engine + Mini-Site 2.0 */
export type ProfileBlockType = "cv" | "portfolio" | "productService" | "socialBio" | "reviewsRatings" | "experience" | "banner" | "articles" | "gallery" | "testimonials" | "faq" | "lead_form" | "countdown";

export interface WorkExperienceItem {
  id: string;
  title: string;
  company: string;
  period: string;
  description?: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  period: string;
}

export interface ArticleLinkItem {
  id: string;
  title: string;
  url: string;
}

export interface ProductServiceItem {
  id: string;
  title: string;
  price: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface SocialBioLink {
  id: string;
  label: string;
  url: string;
}

export interface ReviewRatingItem {
  id: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: number;
}

/** Testimonials block: name, text, stars, avatar */
export interface TestimonialItem {
  id: string;
  name: string;
  text: string;
  stars: number;
  avatar: string;
}

/** FAQ block: accordion items */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProfileBlock {
  id: string;
  type: ProfileBlockType;
  order: number;
  visible: boolean;
  config: {
    cv?: { experience: WorkExperienceItem[]; education: EducationItem[]; skills: string[] };
    portfolio?: { items: PortfolioItem[] };
    productService?: { items: ProductServiceItem[] };
    socialBio?: { intro: string; links: SocialBioLink[] };
    reviewsRatings?: { items: ReviewRatingItem[] };
    experience?: { items: WorkExperienceItem[] };
    banner?: { headline: string; subline?: string; imageUrl?: string };
    articles?: { title: string; items: ArticleLinkItem[] };
    gallery?: { title: string; imageUrls: string[] };
    testimonials?: { items: TestimonialItem[] };
    faq?: { faqs: FAQItem[] };
    lead_form?: { title?: string; successMessage?: string };
    countdown?: { target_date: string; label?: string };
  };
}

export interface Profile {
  /** Unique 7-digit Ollin ID (e.g. 0123456), assigned on registration. */
  userId?: string;
  username: string;
  profileImage: string;
  /** Optional cover / banner image URL for profile header */
  coverImage?: string;
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
  /** Optional: company name for card/edit */
  company?: string;
  /** Optional: Telegram username */
  telegram?: string;
  /** Optional: Viber username or number */
  viber?: string;
  /** Optional: TikTok handle or URL */
  tiktok?: string;
  /** Optional: Messenger username or profile URL */
  messenger?: string;
  /** Optional: Facebook profile URL */
  facebook?: string;
  /** Optional: X (Twitter) username */
  x?: string;
  /** Optional: YouTube channel URL or handle */
  youtube?: string;
  /** Optional: Signal phone number */
  signal?: string;
  /** Optional: Discord username */
  discord?: string;
  /** Optional: Skype Live ID */
  skype?: string;
  /** Optional: WeChat ID */
  wechat?: string;
  /** Optional: Slack member ID */
  slack?: string;
  /** Optional: Line ID */
  line?: string;
  /** Optional: Threads username */
  threads?: string;
  /** Optional: Pinterest username */
  pinterest?: string;
  /** Optional: GitHub username */
  github?: string;
  portfolio: PortfolioItem[];
  projects?: ProjectPosition[];
  pressMedia?: PressMediaLink[];
  /** Modular blocks for personal landing page (add/remove/reorder) */
  blocks?: ProfileBlock[];
  /** Mini-site primary CTA: Chat (internal messaging), WhatsApp, or Call */
  primary_action_type?: PrimaryActionType;
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
  blocks: [],
  primary_action_type: undefined,
};

export function slugFromUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}
