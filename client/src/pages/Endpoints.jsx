import React from 'react';
import { Shield } from 'lucide-react';

export default function Endpoints() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-gold-600" />
          Endpoint Security
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">OS and Antivirus tracking interface will be loaded here.</p>
      </div>
    </div>
  );
}
