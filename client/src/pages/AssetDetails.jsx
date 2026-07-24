import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Laptop, Calendar, Wrench, ShieldAlert, ArrowLeft, Plus, 
  Upload, FileText, Trash2, Printer, Download, UserCheck, 
  ArrowRightLeft, RotateCcw, AlertTriangle, ShieldCheck, X
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function AssetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, showToast } = useAuth();

  const [asset, setAsset] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Metadata dropdown options
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modal Control
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [stickerModalOpen, setStickerModalOpen] = useState(false);

  // File Upload
  const [uploadFiles, setUploadFiles] = useState([]);

  const loadAssetDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assets/${id}`);
      if (res.data.success) {
        setAsset(res.data.data.asset);
        setDocuments(res.data.data.documents);
        setHistory(res.data.data.history);
        setAssignments(res.data.data.assignments);
      }
      
      // Load employees and depts for assignments dropdowns
      const empRes = await api.get('/employees', { params: { limit: 100 } });
      if (empRes.data.success) setEmployees(empRes.data.data.employees);

      const deptRes = await api.get('/employees/departments');
      if (deptRes.data.success) setDepartments(deptRes.data.data);

    } catch (err) {
      showToast('Error', 'Failed to retrieve asset details profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetDetails();
  }, [id]);

  const activeAssignment = assignments.find(a => a.status === 'Active');

  // ==========================================
  // TRANSACTION SUBMISSIONS
  // ==========================================

  // 1. Assign Asset
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const payload = {
      assetId: id,
      employeeId: data.get('employeeId') || null,
      departmentId: data.get('departmentId') || null,
      dateAssigned: data.get('dateAssigned'),
      expectedReturnDate: data.get('expectedReturnDate') || null,
      releaseCondition: data.get('releaseCondition'),
      remarks: data.get('remarks')
    };

    if (!payload.employeeId && !payload.departmentId) {
      alert('Please select either an Employee or a Department.');
      return;
    }

    try {
      const res = await api.post('/assignments', payload);
      if (res.data.success) {
        showToast('Assigned', 'Asset assignment completed.', 'success');
        setAssignModalOpen(false);
        loadAssetDetails();
      }
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to assign.', 'error');
    }
  };

  // 2. Return Asset
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const payload = {
      actualReturnDate: data.get('actualReturnDate'),
      returnCondition: data.get('returnCondition'),
      assetStatus: data.get('assetStatus'), // Available, Under Repair, Damaged, etc.
      remarks: data.get('remarks')
    };

    try {
      const res = await api.post(`/assignments/${activeAssignment.id}/return`, payload);
      if (res.data.success) {
        showToast('Returned', 'Asset has been returned to storage.', 'success');
        setReturnModalOpen(false);
        loadAssetDetails();
      }
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to complete return.', 'error');
    }
  };

  // 3. Transfer Asset
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const payload = {
      employeeId: data.get('employeeId') || null,
      departmentId: data.get('departmentId') || null,
      dateTransferred: data.get('dateTransferred'),
      releaseCondition: data.get('releaseCondition'),
      remarks: data.get('remarks')
    };

    if (!payload.employeeId && !payload.departmentId) {
      alert('Please select either an Employee or a Department.');
      return;
    }

    try {
      const res = await api.post(`/assignments/${activeAssignment.id}/transfer`, payload);
      if (res.data.success) {
        showToast('Transferred', 'Asset transfer logged successfully.', 'success');
        setTransferModalOpen(false);
        loadAssetDetails();
      }
    } catch (err) {
      showToast('Error', err.response?.data?.message || 'Failed to transfer asset.', 'error');
    }
  };

  // 4. Upload Documents
  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < uploadFiles.length; i++) {
      formData.append('files', uploadFiles[i]);
    }

    try {
      const res = await api.post(`/assets/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Uploaded', 'Documents uploaded successfully.', 'success');
        setUploadModalOpen(false);
        setUploadFiles([]);
        loadAssetDetails();
      }
    } catch (err) {
      showToast('Error', 'Failed to upload document files.', 'error');
    }
  };

  // 5. Hard/Soft delete asset profile
  const handleDeleteAsset = async () => {
    if (!window.confirm('Are you sure you want to retire or delete this asset profile?')) return;
    try {
      const res = await api.delete(`/assets/${id}`);
      if (res.data.success) {
        showToast('Retired', res.data.message, 'success');
        navigate('/assets');
      }
    } catch (err) {
      showToast('Error', 'Failed to retire asset.', 'error');
    }
  };

  const getAssetModelText = () => {
    if (!asset) return '';
    return [asset.brand, asset.model].filter(Boolean).join(' ');
  };

  const getAssetSpecsText = () => {
    if (!asset) return '';
    const specs = [
      asset.specs_cpu && `CPU: ${asset.specs_cpu}`,
      asset.specs_ram && `RAM: ${asset.specs_ram}`,
      asset.specs_storage && `Storage: ${asset.specs_storage}`,
      (asset.specs_os || asset.specs_win_edition) && `OS: ${asset.specs_os || ''} ${asset.specs_win_edition || ''}`.trim()
    ].filter(Boolean);

    if (specs.length > 0) {
      return specs.join(' | ');
    }
    return asset.description || asset.remarks || '';
  };

  const handlePrintSticker = () => {
    if (!asset) return;
    const printWindow = window.open('', '_blank');
    const logoUrl = `${window.location.origin}/nkb-logo.png`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(asset.asset_code)}`;
    const modelText = getAssetModelText();
    const specsText = getAssetSpecsText();
    const locationText = asset.current_location || 'Nkb Manufacturing Sampaguita Village 2, Mambog 2, B4 L5, Twig St, Bacoor, 4102 Cavite';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Sticker - ${asset.asset_code}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 15px;
              background: #ffffff;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sticker-card {
              width: 560px;
              border: 2px solid #000000;
              padding: 14px;
              box-sizing: border-box;
              background: #ffffff;
              margin: 0 auto;
            }
            .top-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 15px;
            }
            .left-section {
              flex: 1;
              min-width: 0;
            }
            .logo-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
            }
            .logo-img {
              height: 46px;
              max-width: 190px;
              object-fit: contain;
            }
            .field-label {
              font-size: 11px;
              font-weight: 700;
              font-style: italic;
              color: #000000;
              margin-bottom: 2px;
            }
            .field-val-lg {
              font-size: 17px;
              font-weight: 900;
              font-style: italic;
              color: #000000;
              line-height: 1.15;
              text-transform: uppercase;
              margin-bottom: 6px;
              word-break: break-word;
            }
            .field-val-specs {
              font-size: 10px;
              font-weight: 700;
              font-style: italic;
              color: #222222;
              background: #f4f4f5;
              border-left: 3px solid #000000;
              padding: 4px 6px;
              margin-bottom: 6px;
              line-height: 1.35;
            }
            .right-section {
              width: 150px;
              flex-shrink: 0;
              text-align: right;
            }
            .qr-code-img {
              width: 145px;
              height: 145px;
              object-fit: contain;
            }
            .divider-line {
              border-top: 1.5px solid #000000;
              margin: 8px 0;
            }
            .location-container {
              font-size: 10px;
              margin-bottom: 8px;
            }
            .location-title {
              font-weight: 800;
              font-size: 9px;
              letter-spacing: 0.5px;
              display: block;
              margin-bottom: 2px;
            }
            .location-address {
              font-weight: 600;
              font-size: 9.5px;
              line-height: 1.25;
            }
            .footer-container {
              border-top: 1.5px solid #000000;
              padding-top: 6px;
              text-align: center;
            }
            .footer-headline {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
            }
            .footer-details {
              font-size: 8.5px;
              font-weight: 800;
              letter-spacing: 0.4px;
              margin-top: 3px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="top-grid">
              <div class="left-section">
                <div class="logo-header">
                  <img src="${logoUrl}" alt="NKB Logo" class="logo-img" />
                </div>
                
                <div>
                  <div class="field-label">Name :</div>
                  <div class="field-val-lg">${asset.name || modelText}</div>
                </div>

                ${(modelText || specsText) ? `
                <div>
                  <div class="field-label">Model & Specs :</div>
                  <div class="field-val-specs">
                    ${modelText ? `<div><strong>Model:</strong> ${modelText}</div>` : ''}
                    ${specsText ? `<div><strong>Specs:</strong> ${specsText}</div>` : ''}
                  </div>
                </div>
                ` : ''}

                <div>
                  <div class="field-label">Cat :</div>
                  <div class="field-val-lg">${(asset.category_name || 'EQUIPMENT').toUpperCase()}</div>
                </div>

                <div>
                  <div class="field-label">Serial Number</div>
                  <div class="field-val-lg">${asset.serial_number || 'N/A'}</div>
                </div>
              </div>

              <div class="right-section">
                <img src="${qrCodeUrl}" alt="QR Code" class="qr-code-img" />
              </div>
            </div>

            <div class="divider-line"></div>

            <div class="location-container">
              <span class="location-title">LOCATION:</span>
              <span class="location-address">${locationText}</span>
            </div>

            <div class="footer-container">
              <div class="footer-headline">PROPERTY OF NKB MANUFACTURING</div>
              <div class="footer-details">DO NOT REMOVE &nbsp;|&nbsp; SCAN FOR DETAILS &nbsp;|&nbsp; ID: ${asset.asset_code}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  if (!asset) {
    return <div className="p-8 text-center text-slate-500">Asset not found.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex justify-between items-center select-none">
        <button 
          onClick={() => navigate('/assets')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Register</span>
        </button>

        <div className="flex items-center gap-2">
          {hasPermission('assets.delete') && (
            <button 
              onClick={handleDeleteAsset}
              className="px-3 py-1.5 border border-rose-500/20 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Retire Asset
            </button>
          )}
          <button 
            onClick={() => setStickerModalOpen(true)}
            className="px-3 py-1.5 border border-slate-350 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Sticker</span>
          </button>
        </div>
      </div>

      {/* Grid: Details Left, Allocation Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side details cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            
            {/* Header info */}
            <div className="flex gap-4 items-start border-b border-slate-100 pb-4">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center border text-slate-400">
                {asset.image_path ? (
                  <img src={asset.image_path} alt={asset.name} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <Laptop className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gold-600 uppercase">{asset.category_name}</span>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{asset.name}</h2>
                <p className="text-xs text-slate-500">
                  Asset Code: <span className="font-semibold">{asset.asset_code}</span> | S/N: <span className="font-semibold text-slate-800">{asset.serial_number}</span>
                </p>
              </div>
            </div>

            {/* Spec block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs leading-normal">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Brand / Model</p>
                <p className="font-bold text-slate-800 mt-0.5">{asset.brand} / {asset.model}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Physical Condition</p>
                <p className={`font-bold mt-0.5 ${
                  asset.condition === 'New' || asset.condition === 'Good' ? 'text-emerald-600' : 'text-amber-600'
                }`}>{asset.condition}</p>
              </div>
              
              {/* Specs */}
              {asset.specs_cpu && (
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-3 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="block text-slate-400 font-bold uppercase text-[9px]">CPU</span>
                    <span className="font-semibold text-slate-800">{asset.specs_cpu}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase text-[9px]">RAM</span>
                    <span className="font-semibold text-slate-800">{asset.specs_ram}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase text-[9px]">Storage</span>
                    <span className="font-semibold text-slate-800">{asset.specs_storage}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold uppercase text-[9px]">OS</span>
                    <span className="font-semibold text-slate-800">{asset.specs_os} {asset.specs_win_edition}</span>
                  </div>
                </div>
              )}

              {/* Net */}
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Hostname</p>
                <p className="font-semibold text-slate-800 mt-0.5">{asset.hostname || 'None'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">MAC / IP Address</p>
                <p className="font-semibold text-slate-800 mt-0.5">{asset.mac_address || 'N/A'} / {asset.ip_address || 'DHCP'}</p>
              </div>

              {/* Acq */}
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Purchase Date / Cost</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {asset.purchase_date || 'N/A'} (₱ {asset.purchase_price.toLocaleString()})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Warranty End Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">{asset.warranty_end_date || 'N/A'}</p>
              </div>

            </div>

            {asset.remarks && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Remarks</span>
                <p className="text-slate-600 mt-1">{asset.remarks}</p>
              </div>
            )}

          </div>

          {/* Asset supporting files list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supporting Documents</h3>
              {hasPermission('assets.update') && (
                <button 
                  onClick={() => setUploadModalOpen(true)}
                  className="text-xs font-bold text-gold-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Upload Files</span>
                </button>
              )}
            </div>

            {documents && documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 truncate">{doc.name}</span>
                    </div>
                    <a 
                      href={doc.file_path} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1 hover:bg-slate-200 text-slate-500 rounded"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No warranty cards, manuals, or invoices uploaded.</p>
            )}
          </div>

          {/* Asset movement logs history */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Asset History & Logs</h3>
            <div className="space-y-4">
              {history && history.length > 0 ? (
                history.map(item => (
                  <div key={item.id} className="flex gap-3 text-xs leading-normal">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-800">
                        <span className="font-bold text-slate-900">{item.action}</span> - {item.notes}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                        Performed by {item.performed_by_username || 'system'} on {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No historical records available.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right side allocation/custody cards */}
        <div className="space-y-6">
          
          {/* Active Custody state card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Custody Status</h3>
            
            <div className="text-center py-4 space-y-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                asset.status === 'Available' ? 'bg-emerald-500 text-white' :
                asset.status === 'Assigned' ? 'bg-slate-900 text-gold-500 border border-slate-700' :
                asset.status === 'Under Repair' ? 'bg-amber-500 text-white' :
                'bg-rose-600 text-white'
              }`}>
                {asset.status}
              </span>

              {asset.status === 'Assigned' && activeAssignment ? (
                <div className="pt-4 text-xs space-y-2 text-left">
                  <div className="bg-slate-50 border rounded-lg p-3 text-[11px] leading-relaxed">
                    {activeAssignment.employee_name ? (
                      <div>
                        <p className="text-slate-400 uppercase font-bold text-[9px]">Issued Employee</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{activeAssignment.employee_name}</p>
                        <p className="font-semibold text-slate-500">ID: {activeAssignment.employee_number}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-400 uppercase font-bold text-[9px]">Issued Department</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{activeAssignment.department_name}</p>
                      </div>
                    )}
                    <p className="font-semibold text-slate-500 mt-2">Date Assigned: {activeAssignment.date_assigned}</p>
                    {activeAssignment.expected_return_date && (
                      <p className="font-semibold text-slate-500">Expected Return: {activeAssignment.expected_return_date}</p>
                    )}
                    <p className="italic text-slate-450 text-[10px] mt-2">"{activeAssignment.remarks || 'No allocation remarks'}"</p>
                  </div>
                  
                  {/* Actions for Assigned asset */}
                  <div className="space-y-2 pt-2 select-none">
                    {hasPermission('assets.return') && (
                      <button 
                        onClick={() => setReturnModalOpen(true)}
                        className="w-full py-2 bg-slate-950 hover:bg-gold-600 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Return Asset</span>
                      </button>
                    )}
                    {hasPermission('assets.transfer') && (
                      <button 
                        onClick={() => setTransferModalOpen(true)}
                        className="w-full py-2 border border-slate-350 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Transfer Asset</span>
                      </button>
                    )}
                    {/* Download PDF Receipt */}
                    <a 
                      href={`/api/assignments/${activeAssignment.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 border border-slate-355 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Receipt (PDF)</span>
                    </a>
                  </div>
                </div>
              ) : asset.status === 'Available' ? (
                <div className="pt-4 space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    This asset is currently in storage and is available for deployment assignment.
                  </p>
                  {hasPermission('assets.assign') && (
                    <button 
                      onClick={() => setAssignModalOpen(true)}
                      className="w-full py-2.5 bg-slate-950 hover:bg-gold-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow transition-colors"
                    >
                      <UserCheck className="h-4.5 w-4.5" />
                      <span>Assign Asset</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-4 text-xs text-slate-500 leading-normal">
                  No active custody modifications can be logged on retired, damaged, or uninspected assets.
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* ==========================================
          MODAL 1: ASSIGN ASSET
          ========================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 animate-fade-in" onClick={() => setAssignModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Assign Asset Custody</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              <div className="bg-slate-50 border p-3 rounded text-[11px] leading-relaxed">
                Assigning asset: <span className="font-bold text-slate-900">{asset.name}</span> ({asset.asset_code})
              </div>

              {/* Assignee Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Issue to Employee</label>
                  <select name="employeeId" className="w-full p-2 border border-slate-350 rounded bg-white">
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.employee_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Issue to Department</label>
                  <select name="departmentId" className="w-full p-2 border border-slate-350 rounded bg-white">
                    <option value="">-- Choose Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Date Assigned *</label>
                  <input type="date" name="dateAssigned" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Expected Return Date</label>
                  <input type="date" name="expectedReturnDate" className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                </div>
              </div>

              {/* Conditions */}
              <div>
                <label className="block text-slate-500 mb-1">Condition on Release *</label>
                <input type="text" name="releaseCondition" defaultValue="Good" required placeholder="Brand New, Good, Fair..." className="w-full p-2 border border-slate-350 rounded" />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Custody Notes / Remarks</label>
                <textarea name="remarks" className="w-full p-2 border border-slate-350 rounded text-slate-900 h-20 resize-none" placeholder="Add specific allocation notes..."></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="px-4 py-2 border border-slate-350 rounded font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-gold-650 cursor-pointer">Release Custody</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: RETURN ASSET
          ========================================== */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 animate-fade-in" onClick={() => setReturnModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Register Asset Return</h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Date Returned *</label>
                  <input type="date" name="actualReturnDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-355 rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Next Asset Status *</label>
                  <select name="assetStatus" required className="w-full p-2 border border-slate-355 rounded bg-white">
                    <option value="Available">Available (In Storage)</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="For Inspection">For Inspection</option>
                    <option value="Damaged">Damaged / Defective</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Condition on Return *</label>
                <input type="text" name="returnCondition" required defaultValue="Good" placeholder="Good, Scratched, Damaged..." className="w-full p-2 border border-slate-355 rounded" />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Remarks</label>
                <textarea name="remarks" className="w-full p-2 border border-slate-355 rounded h-20 resize-none" placeholder="Describe returned status..."></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setReturnModalOpen(false)} className="px-4 py-2 border border-slate-350 rounded font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-gold-650 cursor-pointer">Close Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: TRANSFER ASSET
          ========================================== */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 animate-fade-in" onClick={() => setTransferModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Transfer Custody Mappings</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              <div className="bg-slate-50 border p-3 rounded text-[11px]">
                Initiates a transfer closing assignment <span className="font-bold text-slate-900">{activeAssignment?.assignment_number}</span> and creating a new active custody file.
              </div>

              {/* Assignee Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Transfer to Employee</label>
                  <select name="employeeId" className="w-full p-2 border border-slate-350 rounded bg-white">
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.employee_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Transfer to Department</label>
                  <select name="departmentId" className="w-full p-2 border border-slate-350 rounded bg-white">
                    <option value="">-- Choose Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Transfer Date *</label>
                  <input type="date" name="dateTransferred" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-350 rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Release Condition *</label>
                  <input type="text" name="releaseCondition" defaultValue="Good" required className="w-full p-2 border border-slate-350 rounded" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Remarks / Reason</label>
                <textarea name="remarks" className="w-full p-2 border border-slate-350 rounded h-20 resize-none" placeholder="Add specific transfer explanations..."></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 border border-slate-350 rounded font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-gold-650 cursor-pointer">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: UPLOAD DOCUMENTS
          ========================================== */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 p-4 animate-fade-in" onClick={() => setUploadModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Upload Asset Documentation</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleDocUpload} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-2">Choose Files (.pdf, .docx, .xlsx, .jpg, .png)</label>
                <input 
                  type="file" 
                  multiple 
                  onChange={e => setUploadFiles(e.target.files)} 
                  className="w-full p-2 border border-slate-350 rounded bg-slate-55"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setUploadModalOpen(false)} className="px-4 py-2 border border-slate-350 rounded font-bold hover:bg-slate-55 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-gold-650 cursor-pointer">Start Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 5: PRINT STICKER PREVIEW
          ========================================== */}
      {stickerModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={() => setStickerModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-gold-500" />
                <h3 className="font-bold text-sm">Asset Sticker Print Preview</h3>
              </div>
              <button onClick={() => setStickerModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-slate-100 flex flex-col items-center select-none">
              {/* Sticker Card Preview matching exact image sample */}
              <div className="bg-white border-2 border-black p-4 rounded-sm shadow-md w-full max-w-[560px] text-black font-sans">
                <div className="flex justify-between items-start gap-4">
                  
                  {/* Left Column */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <img src="/nkb-logo.png" alt="NKB Logo" className="h-12 object-contain" />
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold italic">Name :</span>
                      <span className="block text-base font-black italic uppercase leading-tight">{asset.name}</span>
                    </div>

                    {(getAssetModelText() || getAssetSpecsText()) && (
                      <div className="bg-slate-50 border-l-2 border-black p-1.5 text-[10px] font-bold italic leading-tight space-y-0.5">
                        {getAssetModelText() && <div>Model: {getAssetModelText()}</div>}
                        {getAssetSpecsText() && <div className="text-slate-700">Specs: {getAssetSpecsText()}</div>}
                      </div>
                    )}

                    <div>
                      <span className="block text-[11px] font-bold italic">Cat :</span>
                      <span className="block text-base font-black italic uppercase leading-tight">{asset.category_name || 'EQUIPMENT'}</span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold italic">Serial Number</span>
                      <span className="block text-base font-black italic uppercase leading-tight">{asset.serial_number || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Right Column QR Code */}
                  <div className="w-36 flex-shrink-0 text-right">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(asset.asset_code)}`} 
                      alt="QR Code" 
                      className="w-36 h-36 object-contain ml-auto border p-1"
                    />
                  </div>

                </div>

                <div className="border-t border-black my-2.5" />

                {/* Location */}
                <div className="text-[10px] space-y-0.5">
                  <span className="font-extrabold block text-[9px]">LOCATION:</span>
                  <p className="font-semibold text-slate-800 leading-tight">
                    {asset.current_location || 'Nkb Manufacturing Sampaguita Village 2, Mambog 2, B4 L5, Twig St, Bacoor, 4102 Cavite'}
                  </p>
                </div>

                <div className="border-t border-black pt-1.5 mt-2 text-center">
                  <h5 className="font-black text-xs uppercase tracking-wider">PROPERTY OF NKB MANUFACTURING</h5>
                  <p className="font-bold text-[8.5px] uppercase text-slate-700 mt-0.5">
                    DO NOT REMOVE &nbsp;|&nbsp; SCAN FOR DETAILS &nbsp;|&nbsp; ID: {asset.asset_code}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setStickerModalOpen(false)} 
                className="px-4 py-2 border border-slate-350 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={handlePrintSticker} 
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-gold-650 flex items-center gap-1.5 cursor-pointer shadow transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print Sticker Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
