import type { WorkExperienceItem } from "./profile-types";

export interface MiniSitePortfolioItem {
  id: string;
  image: string;
  title: string;
  link?: string;
}

export interface MiniSiteData {
  displayName: string;
  headline: string;
  location: string;
  profileImage: string;
  coverImage: string;
  cvItems: WorkExperienceItem[];
  portfolioItems: MiniSitePortfolioItem[];
  skills: string[];
}

export const defaultMiniSiteData: MiniSiteData = {
  displayName: "",
  headline: "",
  location: "",
  profileImage: "",
  coverImage: "",
  cvItems: [],
  portfolioItems: [],
  skills: [],
};

/** Sample data so the profile renders with content (used when empty for demo). */
export const sampleMiniSiteData: MiniSiteData = {
  displayName: "Alex Chen",
  headline: "Senior Developer",
  location: "Tel Aviv, Israel",
  profileImage: "",
  coverImage: "",
  cvItems: [
    { id: "e1", title: "Senior Developer", company: "TechCo", period: "2021 – Present", description: "Full-stack development and team lead." },
    { id: "e2", title: "Software Engineer", company: "StartupXYZ", period: "2018 – 2021", description: "Built scalable web applications." },
  ],
  portfolioItems: [
    { id: "p1", image: "", title: "E-Commerce Platform", link: "https://example.com/project1" },
    { id: "p2", image: "", title: "Mobile Dashboard", link: "https://example.com/project2" },
    { id: "p3", image: "", title: "API Gateway", link: "https://example.com/project3" },
  ],
  skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Agile"],
};
