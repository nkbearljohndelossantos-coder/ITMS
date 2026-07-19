import React from 'react';
import { Network } from 'lucide-react';

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="h-6 w-6 text-gold-600" />
          Network & IP Allocations
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Hardware switches, Wi-Fi points, and IP registry will be loaded here.</p>
      </div>
    </div>
  );
}
