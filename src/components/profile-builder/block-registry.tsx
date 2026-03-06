"use client";

import {
  MapPin,
  Users,
  Image as ImageIcon,
  FileText,
  ShoppingBag,
  MessageSquare,
  ImagePlus,
  Video,
  Film,
  type LucideIcon,
} from "lucide-react";
import type { ProfileBlockType } from "@/lib/profile-builder-types";

export interface BlockMeta {
  type: ProfileBlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BLOCK_LIBRARY: BlockMeta[] = [
  { type: "address", label: "Address", description: "Map icon + text", icon: MapPin },
  { type: "team", label: "Team / Partners", description: "Photo, name, title", icon: Users },
  { type: "gallery", label: "Gallery", description: "Grid of images with lightbox", icon: ImageIcon },
  { type: "content", label: "Content", description: "Image + text side by side or stacked", icon: FileText },
  { type: "ecommerce", label: "E-commerce", description: "Product cards with Buy Now", icon: ShoppingBag },
  { type: "contact_form", label: "Contact Form", description: "Name, email, message", icon: MessageSquare },
  { type: "banner", label: "Banner", description: "Large call-to-action image", icon: ImagePlus },
  { type: "video", label: "Video", description: "YouTube / Vimeo embed", icon: Video },
  { type: "rich_video", label: "Rich Video", description: "Video + text description", icon: Film },
];

export function getBlockMeta(type: ProfileBlockType): BlockMeta | undefined {
  return BLOCK_LIBRARY.find((b) => b.type === type);
}
