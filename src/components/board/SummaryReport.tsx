/**
 * OLLIN EXECUTIVE SUMMARY
 * Standardized English Version
 */
import React from 'react';

export const SummaryReport = ({ data: _data }: { data?: unknown }) => {
  return (
    <div className="border-l-4 border-[#06B6D4] bg-[#06B6D4]/10 p-6 my-4 rounded-r-lg font-sans text-left">
      <h2 className="text-xl font-bold text-[#06B6D4] mb-4 uppercase tracking-tighter">
        Executive Summary — Strategic Progress Report
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Market Insight</h3>
          <p className="text-slate-200">
            Detected supply chain gap in EU basalt fiber market. ROI potential: High.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Next Step</h3>
          <p className="text-slate-200">
            Secure non-China manufacturing sources to bypass future trade barriers.
          </p>
        </div>
      </div>
    </div>
  );
};