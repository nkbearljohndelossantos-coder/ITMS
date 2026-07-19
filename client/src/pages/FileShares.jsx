import React from 'react';
import { Folder } from 'lucide-react';

export default function FileShares() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Folder className="h-6 w-6 text-gold-600" />
          Network File Shares
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Directory path configurations and RBAC mappings will be loaded here.</p>
      </div>
    </div>
  );
}
