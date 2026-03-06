"use client";

import type { ProfileBlock, EcommerceBlockConfig } from "@/lib/profile-builder-types";

export function EcommerceBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as EcommerceBlockConfig;
  const products = config.ecommerce ? config.ecommerce.products : [];
  if (products.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map(function (p) {
          return (
            <div key={p.id} className="rounded-xl border border-gray-100 p-3">
              <p className="font-semibold text-gray-900">{p.title}</p>
              <p className="text-sm text-gray-600">{p.description}</p>
              <span className="font-bold text-teal-600">{p.price}</span>
              <a href={p.buyNowUrl} target="_blank" rel="noopener noreferrer" className="ml-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm">Buy Now</a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
