import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Filter, Laptop, AlertCircle, Eye, 
  Wrench, CheckCircle, HelpCircle, ShieldAlert, X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const assetSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  category_id: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  serial_number: z.string().min(1, 'Serial number is required'),
  description: z.string().optional(),
  
  // Specs
  specs_cpu: z.string().optional(),
  specs_ram: z.string().optional(),
  specs_storage: z.string().optional(),
  specs_os: z.string().optional(),
  specs_win_edition: z.string().optional(),
  
  // Net
  hostname: z.string().optional(),
  mac_address: z.string().optional(),
  ip_address: z.string().optional(),
  
  // Acq
  purchase_date: z.string().optional(),
  purchase_price: z.coerce.number().nonnegative().optional().default(0),
  supplier: z.string().optional(),
  invoice_number: z.string().optional(),
  warranty_start_date: z.string().optional(),
  warranty_end_date: z.string().optional(),
  condition: z.string().default('Good'),
  remarks: z.string().optional()
});

export default function Assets() {
  const { hasPermission, showToast } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState('false');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Add Asset modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadImage, setUploadImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(assetSchema)
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets', {
        params: {
          page,
          search,
          categoryId: catFilter,
          status: statusFilter,
          condition: conditionFilter,
          warrantyExpiring: warrantyFilter
        }
      });
      if (response.data.success) {
        setAssets(response.data.data.assets);
        setPagination(response.data.data.pagination);
      }

      const catsRes = await api.get('/settings/asset-categories');
      if (catsRes.data.success) {
        setCategories(catsRes.data.data);
      }
    } catch (err) {
      showToast('Error', 'Failed to retrieve asset registry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, catFilter, statusFilter, conditionFilter, warrantyFilter]);

  const handleAddAsset = async (data) => {
    setSaving(true);
    const formData = new FormData();
    // Append fields
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, val);
    });

    if (uploadImage) {
      formData.append('image', uploadImage);
    }

    try {
      const res = await api.post('/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Created', 'Asset registered successfully.', 'success');
        setModalOpen(false);
        reset();
        setUploadImage(null);
        loadData();
      }
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to create asset.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">IT Assets Register</h1>
          <p className="text-xs text-slate-500 mt-1">Manage company workstations, servers, network hardware, and peripherals.</p>
        </div>
        
        {hasPermission('assets.create') && (
          <button 
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-gold-650 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>

      {/* ==========================================
          SEARCH AND FILTERS BAR
          ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search by code, brand, serial..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-350 rounded-lg text-xs text-slate-900"
          />
        </div>

        {/* Category Filter */}
        <select
          value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          className="p-2 border border-slate-350 rounded-lg text-xs text-slate-900 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="p-2 border border-slate-350 rounded-lg text-xs text-slate-900 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Assigned">Assigned</option>
          <option value="Under Repair">Under Repair</option>
          <option value="Damaged">Damaged</option>
          <option value="Retired">Retired</option>
        </select>

        {/* Expiring Warranty toggle */}
        <select
          value={warrantyFilter}
          onChange={e => { setWarrantyFilter(e.target.value); setPage(1); }}
          className="p-2 border border-slate-350 rounded-lg text-xs text-slate-900 bg-white"
        >
          <option value="false">All Warranties</option>
          <option value="true">Expiring in 30 Days</option>
        </select>

      </div>

      {/* ==========================================
          ASSET CARDS GRID
          ========================================== */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-650"></div>
        </div>
      ) : assets && assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map(asset => (
            <div 
              key={asset.id}
              onClick={() => navigate(`/assets/${asset.id}`)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-gold-500 transition-all duration-200 cursor-pointer flex flex-col group"
            >
              {/* Card top banner with photo/placeholder */}
              <div className="h-32 bg-slate-950/5 relative flex items-center justify-center border-b border-slate-100">
                {asset.image_path ? (
                  <img 
                    src={asset.image_path} 
                    alt={asset.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                  />
                ) : (
                  <Laptop className="h-12 w-12 text-slate-300" />
                )}
                {/* Status sticker */}
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  asset.status === 'Available' ? 'bg-emerald-500 text-white shadow' :
                  asset.status === 'Assigned' ? 'bg-slate-900 text-gold-500 border border-slate-700' :
                  asset.status === 'Under Repair' ? 'bg-amber-500 text-white' :
                  'bg-rose-600 text-white'
                }`}>
                  {asset.status}
                </span>
              </div>

              {/* Card info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gold-600 uppercase">{asset.category_name}</span>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-gold-700 transition-colors leading-tight line-clamp-1">
                    {asset.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-none">
                    Code: <span className="font-bold">{asset.asset_code}</span> | Serial: <span className="font-bold text-slate-800">{asset.serial_number}</span>
                  </p>
                  
                  {/* Current location or assignee */}
                  <div className="pt-2 text-[10px] text-slate-650 flex items-center gap-1 leading-normal">
                    {asset.status === 'Assigned' ? (
                      <span className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-semibold text-slate-800 truncate block w-full">
                        🧑 {asset.employee_name || asset.department_name || 'Department Assigned'}
                      </span>
                    ) : (
                      <span className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-semibold text-slate-500">
                        📍 {asset.current_location || 'IT Storage'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex justify-between items-center text-[10px]">
                  <span className={`font-bold ${
                    asset.condition === 'New' || asset.condition === 'Good' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    Condition: {asset.condition}
                  </span>
                  
                  <span className="text-slate-400 font-semibold group-hover:text-gold-700 flex items-center gap-0.5">
                    <span>View Profile</span>
                    <Eye className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 bg-white border border-slate-200 rounded-xl text-center text-slate-400 space-y-2">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-350" />
          <h4 className="font-bold text-sm text-slate-850">No assets registered</h4>
          <p className="text-xs">Adjust your filters or add a new asset to get started.</p>
        </div>
      )}

      {/* Pagination control */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">
            Page {pagination.page} of {pagination.pages} ({pagination.total} assets total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-slate-350 text-xs text-slate-700 bg-white hover:bg-slate-50 rounded cursor-pointer disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page === pagination.pages}
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              className="px-3 py-1.5 border border-slate-355 text-xs text-slate-700 bg-white hover:bg-slate-50 rounded cursor-pointer disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD ASSET MODAL DIALOG
          ========================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 overflow-y-auto animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-slide-up my-8" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Register IT Asset</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleAddAsset)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs font-semibold">
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">1. Base Asset Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Asset Name *</label>
                    <input type="text" {...register('name')} placeholder="e.g. Finance Desktop Unit 5" className="w-full p-2 border border-slate-350 rounded" />
                    {errors.name && <p className="text-rose-600 text-[10px] mt-0.5 font-bold">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Category *</label>
                    <select {...register('category_id')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900">
                      <option value="">Choose category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <p className="text-rose-600 text-[10px] mt-0.5 font-bold">{errors.category_id.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Brand *</label>
                    <input type="text" {...register('brand')} placeholder="Lenovo, Dell, Cisco..." className="w-full p-2 border border-slate-350 rounded" />
                    {errors.brand && <p className="text-rose-600 text-[10px] mt-0.5 font-bold">{errors.brand.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Model *</label>
                    <input type="text" {...register('model')} placeholder="ThinkCentre M70q, Latitude 5445..." className="w-full p-2 border border-slate-350 rounded" />
                    {errors.model && <p className="text-rose-600 text-[10px] mt-0.5 font-bold">{errors.model.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Serial Number *</label>
                    <input type="text" {...register('serial_number')} placeholder="Hardware unique serial" className="w-full p-2 border border-slate-350 rounded" />
                    {errors.serial_number && <p className="text-rose-600 text-[10px] mt-0.5 font-bold">{errors.serial_number.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Starting Condition</label>
                    <select {...register('condition')} className="w-full p-2 border border-slate-350 rounded bg-white">
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">2. Hardware Specifications (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">CPU Details</label>
                    <input type="text" {...register('specs_cpu')} placeholder="i5-12400, M2..." className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">RAM Capacity</label>
                    <input type="text" {...register('specs_ram')} placeholder="8GB, 16GB..." className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Storage Size</label>
                    <input type="text" {...register('specs_storage')} placeholder="256GB SSD, 1TB HDD..." className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Operating System</label>
                    <input type="text" {...register('specs_os')} placeholder="Windows 11, macOS, Linux..." className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Windows Edition</label>
                    <input type="text" {...register('specs_win_edition')} placeholder="Pro, Home, Enterprise..." className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">3. Network Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Hostname</label>
                    <input type="text" {...register('hostname')} placeholder="NKB-DEPT-DESK01" className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">MAC Address</label>
                    <input type="text" {...register('mac_address')} placeholder="00:1A:2B:3C:4D:5E" className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">IP Address</label>
                    <input type="text" {...register('ip_address')} placeholder="192.168.1.100" className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">4. Purchase & Warranty Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Purchase Price (PHP)</label>
                    <input type="number" step="0.01" {...register('purchase_price')} className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Purchase Date</label>
                    <input type="date" {...register('purchase_date')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Invoice Number</label>
                    <input type="text" {...register('invoice_number')} className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Warranty Start Date</label>
                    <input type="date" {...register('warranty_start_date')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Warranty End Date</label>
                    <input type="date" {...register('warranty_end_date')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Supplier / Vendor</label>
                    <input type="text" {...register('supplier')} className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">5. Physical Attributes & Uploads</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Upload Asset Photo</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setUploadImage(e.target.files[0])}
                      className="w-full p-1.5 border border-slate-350 rounded bg-slate-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Remarks / Location Details</label>
                    <input type="text" {...register('remarks')} placeholder="Storage locker shelf details" className="w-full p-2 border border-slate-350 rounded" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-350 text-slate-700 bg-white rounded font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-900 hover:bg-gold-650 text-white rounded font-bold transition-colors cursor-pointer"
                >
                  {saving ? 'Creating profile...' : 'Register Asset'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
