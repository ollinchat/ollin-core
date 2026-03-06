"use client";

import type { ProfileBlock } from "@/lib/profile-builder-types";
import { AddressBlock } from "./blocks/AddressBlock";
import { TeamBlock } from "./blocks/TeamBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { ContentBlock } from "./blocks/ContentBlock";
import { EcommerceBlock } from "./blocks/EcommerceBlock";
import { ContactFormBlock } from "./blocks/ContactFormBlock";
import { BannerBlock } from "./blocks/BannerBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { RichVideoBlock } from "./blocks/RichVideoBlock";

export function BlockRenderer(props: { block: ProfileBlock }) {
  const block = props.block;
  if (block.type === "address") return <AddressBlock block={block} />;
  if (block.type === "team") return <TeamBlock block={block} />;
  if (block.type === "gallery") return <GalleryBlock block={block} />;
  if (block.type === "content") return <ContentBlock block={block} />;
  if (block.type === "ecommerce") return <EcommerceBlock block={block} />;
  if (block.type === "contact_form") return <ContactFormBlock block={block} />;
  if (block.type === "banner") return <BannerBlock block={block} />;
  if (block.type === "video") return <VideoBlock block={block} />;
  if (block.type === "rich_video") return <RichVideoBlock block={block} />;
  return null;
}
