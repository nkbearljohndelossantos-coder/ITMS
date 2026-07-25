import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Database, Plus, Search, Filter, ShieldCheck, ShieldAlert, 
  Clock, CheckCircle2, XCircle, AlertCircle, Edit, Trash2, X, RefreshCw
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function Backups() {
  const { hasPermission, showToast } = useAuth();

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBackup, setEditingBackup] = useState(null);
  const [saving, setSaving] = useState(false);

  // Verification modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedBackupForVerify, setSelectedBackupForVerify] = useState(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerVerify, handleSubmit: handleSubmitVerify, reset: resetVerify } = useForm();

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/backups', {
        params: { page, search, status: statusFilter }
      });
      if (res.data.backups) {
        setBackups(res.data.backups);
        setPagination(res.data.pagination || { total: res.data.backups.length, pages: 1, limit: 10 });
      }
    } catch (err) {
      showToast('Error', 'Failed to retrieve data backup records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, [page, search, statusFilter]);

  const openAddModal = () => {
    setEditingBackup(null);
    reset({
      name: '',
      backup_location: '',
      backup_type: 'Full',
      status: 'Success',
      backup_size_gb: 10,
      backup_date: new Date().toISOString().split('T')[0],
      next_due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      remarks: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (b, e) => {
    if (e) e.stopPropagation();
    setEditingBackup(b);
    reset({
      name: b.name || '',
      backup_location: b.backup_location || '',
      backup_type: b.backup_type || 'Full',
      status: b.status || 'Success',
      backup_size_gb: b.backup_size_gb || 0,
      backup_date: b.backup_date ? b.backup_date.split('T')[0] : '',
      next_due_date: b.next_due_date ? b.next_due_date.split('T')[0] : '',
      remarks: b.remarks || ''
    });
    setModalOpen(true);
  };

  const handleSaveBackup = async (data) => {
    setSaving(true);
    const payload = {
      name: data.name,
      backup_location: data.backup_location,
      backup_type: data.backup_type,
      status: data.status,
      backup_size_gb: parseFloat(data.backup_size_gb) || 0,
      backup_date: data.backup_date,
      next_due_date: data.next_due_date,
      remarks: data.remarks || null
    };

    try {
      if (editingBackup) {
        await api.put(`/backups/${editingBackup.id}`, payload);
        showToast('Updated', 'Data backup log updated.', 'success');
      } else {
        await api.post('/backups', payload);
        showToast('Created', 'New backup log created.', 'success');
      }
      setModalOpen(false);
      reset();
      loadBackups();
    } catch (err) {
      showToast('Error', 'Failed to save backup log.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openVerifyModal = (b, e) => {
    if (e) e.stopPropagation();
    setSelectedBackupForVerify(b);
    resetVerify({
      verificationStatus: 'Verified',
      restoreTestResult: 'Restored sample tables successfully with zero checksum errors.'
    });
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = async (data) => {
    try {
      await api.post(`/backups/${selectedBackupForVerify.id}/verify`, {
        verificationStatus: data.verificationStatus,
        restoreTestResult: data.restoreTestResult
      });
      showToast('Verified', 'Backup restore test verification saved.', 'success');
      setVerifyModalOpen(false);
      loadBackups();
    } catch (err) {
      showToast('Error', 'Failed to submit verification.', 'error');
    }
  };

  const handleDeleteBackup = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete backup log '${name}'?`)) return;
    try {
      await api.delete(`/backups/${id}`);
      showToast('Removed', 'Backup log deleted.', 'success');
      loadBackups();
    } catch (err) {
      showToast('Error', 'Failed to delete backup log.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-gold-600" />
            <span>Data Backups & Verification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Monitor database dumps, mirror backups, retention, and restore test verifications.</p>
        </div>

        {hasPermission('backups.create') && (
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-gold-650 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Log Backup Job</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative lg:col-span-3">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search backup name, NAS location..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-350 rounded-lg text-xs text-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="p-2 border border-slate-350 rounded-lg text-xs text-slate-900 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Backup Logs Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden select-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 font-extrabold">Backup Name</th>
                  <th className="p-3.5 font-extrabold">Storage Location</th>
                  <th className="p-3.5 font-extrabold">Type & Size</th>
                  <th className="p-3.5 font-extrabold">Execution Date</th>
                  <th className="p-3.5 font-extrabold">Status</th>
                  <th className="p-3.5 font-extrabold">Restore Verification</th>
                  <th className="p-3.5 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {backups && backups.length > 0 ? (
                  backups.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-extrabold text-slate-900">
                        {b.name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {b.backup_location}
                      </td>
                      <td className="p-3.5 text-slate-800">
                        <span className="font-bold">{b.backup_type}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{b.backup_size_gb} GB</span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <span className="font-semibold">{b.backup_date ? b.backup_date.split('T')[0] : 'N/A'}</span>
                        <span className="block text-[10px] text-slate-400">Next: {b.next_due_date ? b.next_due_date.split('T')[0] : 'N/A'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          b.status === 'Success' ? 'bg-emerald-100 text-emerald-700' :
                          b.status === 'Failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 w-fit ${
                          b.verification_status === 'Verified' ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <ShieldCheck className="h-3 w-3" />
                          <span>{b.verification_status || 'Unverified'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        {hasPermission('backups.verify') && (
                          <button onClick={(e) => openVerifyModal(b, e)} className="px-2 py-1 bg-slate-900 text-white hover:bg-gold-650 rounded text-[10px] font-bold cursor-pointer">
                            Verify Test
                          </button>
                        )}
                        {hasPermission('backups.create') && (
                          <button onClick={(e) => openEditModal(b, e)} className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {hasPermission('backups.create') && (
                          <button onClick={(e) => handleDeleteBackup(b.id, b.name, e)} className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No data backup records registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl select-none">
          <span className="text-xs text-slate-500 font-medium">
            Page {pagination.page} of {pagination.pages} ({pagination.total} records)
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

      {/* MODAL: ADD / EDIT BACKUP */}
      {modalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 overflow-y-auto animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-up my-8" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">{editingBackup ? 'Edit Backup Log' : 'Register New Backup Job'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleSaveBackup)} className="p-6 space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-slate-500 mb-1">Backup Job Name *</label>
                <input type="text" {...register('name', { required: true })} placeholder="e.g. Daily SQL Database Dump" className="w-full p-2 border border-slate-350 rounded text-slate-900" />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Storage Location *</label>
                <input type="text" {...register('backup_location', { required: true })} placeholder="e.g. \\NAS-SERVER-01\backups\db" className="w-full p-2 border border-slate-350 rounded text-slate-900 font-mono" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Type *</label>
                  <select {...register('backup_type')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900">
                    <option value="Full">Full</option>
                    <option value="Incremental">Incremental</option>
                    <option value="Differential">Differential</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Status *</label>
                  <select {...register('status')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900">
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Size (GB)</label>
                  <input type="number" step="0.01" {...register('backup_size_gb')} className="w-full p-2 border border-slate-350 rounded text-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Execution Date *</label>
                  <input type="date" {...register('backup_date', { required: true })} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Next Due Date *</label>
                  <input type="date" {...register('next_due_date', { required: true })} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Remarks</label>
                <textarea {...register('remarks')} rows={2} placeholder="Optional notes..." className="w-full p-2 border border-slate-350 rounded resize-none"></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-350 text-slate-700 bg-white rounded font-bold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 hover:bg-gold-650 text-white rounded font-bold cursor-pointer">
                  {saving ? 'Saving...' : editingBackup ? 'Save Changes' : 'Log Backup'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY RESTORE TEST */}
      {verifyModalOpen && selectedBackupForVerify && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 animate-fade-in" onClick={() => setVerifyModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Verify Restore Test: {selectedBackupForVerify.name}</h3>
              <button onClick={() => setVerifyModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitVerify(handleVerifySubmit)} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Restore Verification Status *</label>
                <select {...registerVerify('verificationStatus')} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900">
                  <option value="Verified">Verified (Restore Test Passed)</option>
                  <option value="Failed">Failed (Restore Corrupted / Error)</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Restore Test Findings / Notes</label>
                <textarea {...registerVerify('restoreTestResult')} rows={4} className="w-full p-2 border border-slate-350 rounded resize-none" placeholder="Describe sample data restoration test..."></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button type="button" onClick={() => setVerifyModalOpen(false)} className="px-4 py-2 border border-slate-350 text-slate-700 bg-white rounded font-bold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-gold-650 text-white rounded font-bold cursor-pointer">
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
