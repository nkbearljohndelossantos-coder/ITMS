import React, { useState, useMemo } from 'react';
import { 
  Calculator, Video, Monitor, Laptop, Printer, HardDrive, 
  Zap, Battery, DollarSign, FileText, Download, RotateCcw, 
  HelpCircle, CheckCircle2, TrendingUp, ShieldAlert, Cpu, 
  Clock, Server, Info, Layers, ArrowRight, Copy, Check
} from 'lucide-react';

export default function EquipmentCalculator() {
  const [activeTab, setActiveTab] = useState('cctv');
  const [copied, setCopied] = useState(false);

  // Currency formatting helper (Philippine Peso)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatNumber = (val, decimals = 1) => {
    return Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // =========================================================================
  // 1. CCTV CALCULATOR STATE & LOGIC
  // =========================================================================
  const [cctvParams, setCctvParams] = useState({
    cameras: 16,
    resolution: '1080p', // 720p, 1080p, 3mp, 4mp, 5mp, 4k
    codec: 'h265', // h264, h264plus, h265, h265plus, ai_smart
    fps: 20,
    activity: 'medium', // low, medium, high
    hoursPerDay: 24,
    retentionDays: 30,
    includeAudio: false,
    raidType: 'raid5', // none, raid1, raid5, raid6
    hddCostPerTb: 1850 // PHP per TB for surveillance drives
  });

  const cctvPresets = [
    { name: 'Small Retail Store', cameras: 8, resolution: '1080p', codec: 'h265', fps: 15, activity: 'medium', hoursPerDay: 16, retentionDays: 30, raidType: 'none' },
    { name: 'Manufacturing Plant', cameras: 32, resolution: '4mp', codec: 'h265plus', fps: 20, activity: 'high', hoursPerDay: 24, retentionDays: 60, raidType: 'raid5' },
    { name: 'Corporate HQ / Perimeter', cameras: 64, resolution: '4k', codec: 'ai_smart', fps: 25, activity: 'medium', hoursPerDay: 24, retentionDays: 90, raidType: 'raid6' }
  ];

  const cctvResults = useMemo(() => {
    // Base bitrate in Mbps at 25 fps, H.264 baseline
    const baseBitrates = {
      '720p': 2.0,
      '1080p': 4.0,
      '3mp': 5.2,
      '4mp': 6.8,
      '5mp': 8.5,
      '4k': 14.5
    };

    // Codec compression efficiency multiplier
    const codecMultipliers = {
      'h264': 1.0,
      'h264plus': 0.75,
      'h265': 0.50,
      'h265plus': 0.35,
      'ai_smart': 0.25
    };

    // Scene activity factor
    const activityMultipliers = {
      'low': 0.65,
      'medium': 1.0,
      'high': 1.35
    };

    const base = baseBitrates[cctvParams.resolution] || 4.0;
    const codecM = codecMultipliers[cctvParams.codec] || 0.5;
    const actM = activityMultipliers[cctvParams.activity] || 1.0;
    const fpsM = cctvParams.fps / 25;
    const audioStream = cctvParams.includeAudio ? 0.064 : 0; // 64 kbps

    // Bitrate per camera in Mbps
    const bitratePerCam = Math.max(0.2, (base * codecM * fpsM * actM) + audioStream);
    const totalBandwidthMbps = bitratePerCam * cctvParams.cameras;

    // Daily storage per camera in GB: (Mbps * 3600 * hours) / (8 * 1024)
    const dailyStoragePerCamGb = (bitratePerCam * 3600 * cctvParams.hoursPerDay) / (8 * 1024);
    const totalDailyGb = dailyStoragePerCamGb * cctvParams.cameras;

    // Total required raw storage in GB & TB
    const totalStorageGb = totalDailyGb * cctvParams.retentionDays;
    const totalStorageTb = totalStorageGb / 1024;

    // RAID overhead
    const raidMultipliers = {
      'none': 1.0,
      'raid1': 2.0,   // 100% mirroring
      'raid5': 1.25,  // +25% spare/parity
      'raid6': 1.35   // +35% dual parity
    };
    const raidOverhead = raidMultipliers[cctvParams.raidType] || 1.0;
    const usableStorageTb = totalStorageTb;
    const grossStorageNeededTb = totalStorageTb * raidOverhead;

    // Recommended drive configuration (standard surveillance drives: 4TB, 8TB, 12TB, 16TB)
    let driveSize = 4;
    if (grossStorageNeededTb > 40) driveSize = 16;
    else if (grossStorageNeededTb > 20) driveSize = 10;
    else if (grossStorageNeededTb > 10) driveSize = 8;
    else driveSize = 4;

    const recommendedDrivesCount = Math.max(1, Math.ceil(grossStorageNeededTb / driveSize));
    const totalPurchasedTb = recommendedDrivesCount * driveSize;
    const estimatedHddCost = totalPurchasedTb * cctvParams.hddCostPerTb;

    // Sizing recommendations
    let nvrChannels = 4;
    if (cctvParams.cameras > 64) nvrChannels = 128;
    else if (cctvParams.cameras > 32) nvrChannels = 64;
    else if (cctvParams.cameras > 16) nvrChannels = 32;
    else if (cctvParams.cameras > 8) nvrChannels = 16;
    else if (cctvParams.cameras > 4) nvrChannels = 8;

    return {
      bitratePerCam,
      totalBandwidthMbps,
      dailyStoragePerCamGb,
      totalDailyGb,
      totalStorageGb,
      totalStorageTb,
      usableStorageTb,
      grossStorageNeededTb,
      driveSize,
      recommendedDrivesCount,
      totalPurchasedTb,
      estimatedHddCost,
      nvrChannels,
      switchSpeed: totalBandwidthMbps > 75 ? '1 Gbps (Gigabit PoE)' : '100 Mbps (Fast Ethernet PoE)'
    };
  }, [cctvParams]);

  // =========================================================================
  // 2. PC & WORKSTATION CALCULATOR STATE & LOGIC
  // =========================================================================
  const [pcParams, setPcParams] = useState({
    preset: 'office',
    unitDrawWatts: 90,
    monitors: 1,
    monitorWatts: 25,
    peripheralsWatts: 15,
    quantity: 15,
    hoursPerDay: 9,
    workdaysPerMonth: 22,
    electricityRate: 12.00, // PHP per kWh
    unitCost: 38000,
    usefulLifeYears: 4,
    salvageValue: 4000,
    desiredUpsRuntimeMins: 15
  });

  const pcPresets = [
    { name: 'Standard Office PC', preset: 'office', unitDrawWatts: 90, monitors: 1, monitorWatts: 25, unitCost: 35000 },
    { name: 'Engineering / CAD', preset: 'cad', unitDrawWatts: 260, monitors: 2, monitorWatts: 30, unitCost: 75000 },
    { name: 'Graphic / 3D Render', preset: 'render', unitDrawWatts: 480, monitors: 2, monitorWatts: 35, unitCost: 135000 },
    { name: 'Mini PC / Thin Client', preset: 'mini', unitDrawWatts: 35, monitors: 1, monitorWatts: 22, unitCost: 24000 }
  ];

  const pcResults = useMemo(() => {
    const totalWattsPerUnit = pcParams.unitDrawWatts + (pcParams.monitors * pcParams.monitorWatts) + pcParams.peripheralsWatts;
    const fleetActiveKw = (totalWattsPerUnit * pcParams.quantity) / 1000;

    // Daily kWh
    const dailyActiveKwhPerUnit = (totalWattsPerUnit * pcParams.hoursPerDay) / 1000;
    const standbyHours = Math.max(0, 24 - pcParams.hoursPerDay);
    const dailyStandbyKwhPerUnit = (5 * standbyHours) / 1000; // ~5W standby
    const monthlyKwhPerUnit = (dailyActiveKwhPerUnit * pcParams.workdaysPerMonth) + (dailyStandbyKwhPerUnit * 30);
    const monthlyCostPerUnit = monthlyKwhPerUnit * pcParams.electricityRate;
    const annualCostPerUnit = monthlyCostPerUnit * 12;

    const fleetMonthlyKwh = monthlyKwhPerUnit * pcParams.quantity;
    const fleetMonthlyCost = fleetMonthlyKwh * pcParams.electricityRate;
    const fleetAnnualCost = fleetMonthlyCost * 12;

    // UPS Sizing: Power factor 0.6, 25% headroom
    const upsMinWatts = Math.round(totalWattsPerUnit * 1.25);
    const upsMinVa = Math.round(upsMinWatts / 0.6);

    let recommendedUpsRating = '650VA / 360W';
    if (upsMinVa > 2000) recommendedUpsRating = '3000VA / 2700W Online UPS';
    else if (upsMinVa > 1400) recommendedUpsRating = '2000VA / 1200W Line-Interactive';
    else if (upsMinVa > 900) recommendedUpsRating = '1500VA / 900W Line-Interactive';
    else if (upsMinVa > 600) recommendedUpsRating = '1000VA / 600W Line-Interactive';

    // Straight-line Depreciation
    const monthlyDepreciationPerUnit = (pcParams.unitCost - pcParams.salvageValue) / (pcParams.usefulLifeYears * 12);
    const totalFleetMonthlyTco = (monthlyDepreciationPerUnit * pcParams.quantity) + fleetMonthlyCost;

    return {
      totalWattsPerUnit,
      fleetActiveKw,
      monthlyKwhPerUnit,
      monthlyCostPerUnit,
      annualCostPerUnit,
      fleetMonthlyKwh,
      fleetMonthlyCost,
      fleetAnnualCost,
      upsMinWatts,
      upsMinVa,
      recommendedUpsRating,
      monthlyDepreciationPerUnit,
      fleetMonthlyDepreciation: monthlyDepreciationPerUnit * pcParams.quantity,
      totalFleetMonthlyTco
    };
  }, [pcParams]);

  // =========================================================================
  // 3. LAPTOP CALCULATOR STATE & LOGIC
  // =========================================================================
  const [laptopParams, setLaptopParams] = useState({
    tier: 'corporate',
    avgWatts: 28,
    chargerWatts: 65,
    batteryWh: 56,
    quantity: 20,
    hoursPlugged: 8,
    hoursOnBattery: 2,
    workdaysPerMonth: 22,
    electricityRate: 12.00,
    unitCost: 45000,
    usefulLifeYears: 3.5,
    cyclesPerWeek: 4
  });

  const laptopPresets = [
    { name: 'Corporate Standard (14")', tier: 'corporate', avgWatts: 28, chargerWatts: 65, batteryWh: 56, unitCost: 45000 },
    { name: 'Ultrabook / Executive', tier: 'ultrabook', avgWatts: 18, chargerWatts: 45, batteryWh: 52, unitCost: 65000 },
    { name: 'Mobile Workstation (16")', tier: 'workstation', avgWatts: 60, chargerWatts: 135, batteryWh: 80, unitCost: 98000 }
  ];

  const laptopResults = useMemo(() => {
    // Energy calculations
    const dailyKwh = (laptopParams.avgWatts * laptopParams.hoursPlugged) / 1000;
    const monthlyKwhPerUnit = dailyKwh * laptopParams.workdaysPerMonth;
    const monthlyCostPerUnit = monthlyKwhPerUnit * laptopParams.electricityRate;

    const fleetMonthlyKwh = monthlyKwhPerUnit * laptopParams.quantity;
    const fleetMonthlyCost = fleetMonthlyKwh * laptopParams.electricityRate;
    const fleetAnnualCost = fleetMonthlyCost * 12;

    // Desktop comparison: average office desktop is ~130W total
    const desktopEqKwhPerUnit = (130 * laptopParams.hoursPlugged * laptopParams.workdaysPerMonth) / 1000;
    const desktopMonthlyCost = desktopEqKwhPerUnit * laptopParams.electricityRate;
    const monthlySavingsPerLaptop = Math.max(0, desktopMonthlyCost - monthlyCostPerUnit);
    const fleetAnnualSavings = monthlySavingsPerLaptop * laptopParams.quantity * 12;

    // Battery lifespan projection: 500 equivalent cycles to 80% capacity
    const cyclesPerYear = laptopParams.cyclesPerWeek * 52;
    const monthsTo80Percent = cyclesPerYear > 0 ? Math.round((500 / cyclesPerYear) * 12) : 36;

    // Monthly Depreciation
    const monthlyDepreciationPerUnit = (laptopParams.unitCost * 0.9) / (laptopParams.usefulLifeYears * 12);
    const fleetMonthlyDepreciation = monthlyDepreciationPerUnit * laptopParams.quantity;
    const totalFleetMonthlyTco = fleetMonthlyDepreciation + fleetMonthlyCost;

    return {
      monthlyKwhPerUnit,
      monthlyCostPerUnit,
      fleetMonthlyKwh,
      fleetMonthlyCost,
      fleetAnnualCost,
      monthlySavingsPerLaptop,
      fleetAnnualSavings,
      cyclesPerYear,
      monthsTo80Percent,
      monthlyDepreciationPerUnit,
      fleetMonthlyDepreciation,
      totalFleetMonthlyTco
    };
  }, [laptopParams]);

  // =========================================================================
  // 4. PRINTER CALCULATOR STATE & LOGIC
  // =========================================================================
  const [printerParams, setPrinterParams] = useState({
    category: 'mono_laser',
    printerPrice: 18500,
    lifespanMonths: 48,
    monthlyMonoPages: 2500,
    monthlyColorPages: 400,
    blackConsumableCost: 3200, // Black Toner or Ink
    blackYieldPages: 3000,
    colorConsumablesCost: 8500, // CMY Set
    colorYieldPages: 2200,
    drumCost: 3500,
    drumLifespanPages: 18000,
    paperReamCost: 240, // 500 sheets
    monthlyPowerMaint: 250
  });

  const printerPresets = [
    { 
      name: 'Office Monochrome Laser', 
      category: 'mono_laser', 
      printerPrice: 16500, 
      monthlyMonoPages: 3000, 
      monthlyColorPages: 0,
      blackConsumableCost: 2900, 
      blackYieldPages: 3000, 
      colorConsumablesCost: 0, 
      colorYieldPages: 1,
      drumCost: 3200, 
      drumLifespanPages: 20000 
    },
    { 
      name: 'Department Color Laser MFP', 
      category: 'color_laser', 
      printerPrice: 42000, 
      monthlyMonoPages: 2500, 
      monthlyColorPages: 800,
      blackConsumableCost: 3800, 
      blackYieldPages: 3500, 
      colorConsumablesCost: 11500, 
      colorYieldPages: 2500,
      drumCost: 6500, 
      drumLifespanPages: 25000 
    },
    { 
      name: 'High-Yield Ink Tank System (EcoTank)', 
      category: 'ink_tank', 
      printerPrice: 14500, 
      monthlyMonoPages: 2000, 
      monthlyColorPages: 600,
      blackConsumableCost: 450, 
      blackYieldPages: 7500, 
      colorConsumablesCost: 1350, 
      colorYieldPages: 6000,
      drumCost: 850, 
      drumLifespanPages: 30000 
    }
  ];

  const printerResults = useMemo(() => {
    // 1. Cost per page components
    const blackInkCpp = printerParams.blackYieldPages > 0 ? (printerParams.blackConsumableCost / printerParams.blackYieldPages) : 0;
    const colorInkOnlyCpp = (printerParams.colorYieldPages > 0 && printerParams.category !== 'mono_laser') 
      ? (printerParams.colorConsumablesCost / printerParams.colorYieldPages) 
      : 0;
    const colorInkTotalCpp = blackInkCpp + colorInkOnlyCpp;

    const drumCpp = printerParams.drumLifespanPages > 0 ? (printerParams.drumCost / printerParams.drumLifespanPages) : 0;
    const paperCpp = printerParams.paperReamCost / 500;

    // Total CPP
    const totalMonoCpp = blackInkCpp + drumCpp + paperCpp;
    const totalColorCpp = colorInkTotalCpp + drumCpp + paperCpp;

    // Monthly totals
    const totalPages = printerParams.monthlyMonoPages + printerParams.monthlyColorPages;
    const monthlyBlackInkCost = printerParams.monthlyMonoPages * blackInkCpp;
    const monthlyColorInkCost = printerParams.monthlyColorPages * colorInkTotalCpp;
    const monthlyConsumablesCost = monthlyBlackInkCost + monthlyColorInkCost;
    const monthlyDrumCost = totalPages * drumCpp;
    const monthlyPaperCost = totalPages * paperCpp;
    const monthlyTotalOpex = monthlyConsumablesCost + monthlyDrumCost + monthlyPaperCost + printerParams.monthlyPowerMaint;

    // Amortization & TCO
    const monthlyDepreciation = printerParams.lifespanMonths > 0 ? (printerParams.printerPrice / printerParams.lifespanMonths) : 0;
    const monthlyTotalTco = monthlyTotalOpex + monthlyDepreciation;
    const threeYearTco = (printerParams.printerPrice) + (monthlyTotalOpex * 36);
    const fiveYearTco = (printerParams.printerPrice) + (monthlyTotalOpex * 60);

    return {
      blackInkCpp,
      colorInkTotalCpp,
      drumCpp,
      paperCpp,
      totalMonoCpp,
      totalColorCpp,
      totalPages,
      monthlyConsumablesCost,
      monthlyPaperCost,
      monthlyTotalOpex,
      monthlyDepreciation,
      monthlyTotalTco,
      threeYearTco,
      fiveYearTco
    };
  }, [printerParams]);

  // Copy summary to clipboard
  const handleCopySummary = () => {
    let summary = '';
    if (activeTab === 'cctv') {
      summary = `[NKB ITMS - CCTV Sizing Summary]
Cameras: ${cctvParams.cameras} units (${cctvParams.resolution}, ${cctvParams.codec.toUpperCase()}, ${cctvParams.fps} FPS)
Retention: ${cctvParams.retentionDays} Days (${cctvParams.hoursPerDay} hrs/day)
Total Storage Required: ${formatNumber(cctvResults.usableStorageTb, 2)} TB (Usable) / ${formatNumber(cctvResults.grossStorageNeededTb, 2)} TB (Gross ${cctvParams.raidType.toUpperCase()})
Recommended Hardware: ${cctvResults.recommendedDrivesCount}x ${cctvResults.driveSize}TB Surveillance HDDs
NVR Recommendation: ${cctvResults.nvrChannels}-Channel NVR
Inbound Network Bandwidth: ${formatNumber(cctvResults.totalBandwidthMbps, 1)} Mbps (${cctvResults.switchSpeed})
Estimated HDD Storage Budget: ${formatCurrency(cctvResults.estimatedHddCost)}`;
    } else if (activeTab === 'pc') {
      summary = `[NKB ITMS - PC Power & Sizing Summary]
Fleet: ${pcParams.quantity}x Desktop Workstations (${pcParams.unitDrawWatts}W PC + ${pcParams.monitors} Monitors)
Total Fleet Active Power: ${formatNumber(pcResults.fleetActiveKw, 2)} kW
Monthly Power Usage: ${formatNumber(pcResults.fleetMonthlyKwh, 1)} kWh (${formatCurrency(pcResults.fleetMonthlyCost)}/mo @ ₱${pcParams.electricityRate}/kWh)
Annual Electricity Cost: ${formatCurrency(pcResults.fleetAnnualCost)}
Recommended UPS Rating: ${pcResults.recommendedUpsRating} (Min ${pcResults.upsMinVa} VA / ${pcResults.upsMinWatts} W)
Monthly Depreciation: ${formatCurrency(pcResults.fleetMonthlyDepreciation)}
Total Monthly TCO: ${formatCurrency(pcResults.totalFleetMonthlyTco)}`;
    } else if (activeTab === 'laptop') {
      summary = `[NKB ITMS - Laptop Power & TCO Summary]
Fleet: ${laptopParams.quantity}x Laptops (${laptopParams.chargerWatts}W Adapter, ~${laptopParams.avgWatts}W draw)
Monthly Power Usage: ${formatNumber(laptopResults.fleetMonthlyKwh, 1)} kWh (${formatCurrency(laptopResults.fleetMonthlyCost)}/mo)
Annual Green Savings vs Desktop: ${formatCurrency(laptopResults.fleetAnnualSavings)}
Projected Battery Lifespan: ~${laptopResults.monthsTo80Percent} months to 80% capacity (${laptopResults.cyclesPerYear} cycles/yr)
Monthly Fleet Depreciation: ${formatCurrency(laptopResults.fleetMonthlyDepreciation)}
Total Monthly TCO: ${formatCurrency(laptopResults.totalFleetMonthlyTco)}`;
    } else if (activeTab === 'printer') {
      summary = `[NKB ITMS - Printer Cost-Per-Page Summary]
Monthly Volume: ${printerResults.totalPages} pages (${printerParams.monthlyMonoPages} B&W, ${printerParams.monthlyColorPages} Color)
B&W Cost-Per-Page (CPP): ${formatCurrency(printerResults.totalMonoCpp)} (Toner: ${formatCurrency(printerResults.blackInkCpp)} + Paper: ${formatCurrency(printerResults.paperCpp)})
Color Cost-Per-Page (CPP): ${formatCurrency(printerResults.totalColorCpp)}
Monthly Operating Cost: ${formatCurrency(printerResults.monthlyTotalOpex)}
3-Year TCO: ${formatCurrency(printerResults.threeYearTco)} | 5-Year TCO: ${formatCurrency(printerResults.fiveYearTco)}`;
    }

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gold-500/20 text-gold-400 rounded-xl border border-gold-500/30">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">IT Equipment Static Calculator</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Accurate capacity sizing, power consumption, network bandwidth, storage, and Cost-Per-Page (CPP) calculations for IT assets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleCopySummary}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-gold-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-200/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/60 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('cctv')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'cctv'
              ? 'bg-white dark:bg-slate-900 text-gold-600 dark:text-gold-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>CCTV Surveillance</span>
        </button>

        <button
          onClick={() => setActiveTab('pc')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pc'
              ? 'bg-white dark:bg-slate-900 text-gold-600 dark:text-gold-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Desktop PC & Workstation</span>
        </button>

        <button
          onClick={() => setActiveTab('laptop')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'laptop'
              ? 'bg-white dark:bg-slate-900 text-gold-600 dark:text-gold-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Laptop & Battery</span>
        </button>

        <button
          onClick={() => setActiveTab('printer')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'printer'
              ? 'bg-white dark:bg-slate-900 text-gold-600 dark:text-gold-400 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printer Cost-Per-Page</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: CCTV CALCULATOR
          ===================================================================== */}
      {activeTab === 'cctv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-gold-500" />
                <h2 className="font-bold text-slate-800 dark:text-white text-base">CCTV Sizing & Storage Parameters</h2>
              </div>
              <button
                type="button"
                onClick={() => setCctvParams({
                  cameras: 16, resolution: '1080p', codec: 'h265', fps: 20, activity: 'medium',
                  hoursPerDay: 24, retentionDays: 30, includeAudio: false, raidType: 'raid5', hddCostPerTb: 1850
                })}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Deployment Templates:</label>
              <div className="flex flex-wrap gap-2">
                {cctvPresets.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCctvParams(prev => ({ ...prev, ...preset }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Number of Cameras */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Camera Count: <span className="font-bold text-gold-600 dark:text-gold-400">{cctvParams.cameras} Channels</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="128"
                  value={cctvParams.cameras}
                  onChange={e => setCctvParams({ ...cctvParams, cameras: parseInt(e.target.value) || 1 })}
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1 CH</span>
                  <span>32 CH</span>
                  <span>64 CH</span>
                  <span>128 CH</span>
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolution:</label>
                <select
                  value={cctvParams.resolution}
                  onChange={e => setCctvParams({ ...cctvParams, resolution: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-gold-500"
                >
                  <option value="720p">720p HD (1.0 Megapixel)</option>
                  <option value="1080p">1080p Full HD (2.0 Megapixel)</option>
                  <option value="3mp">3.0 Megapixel (2048x1536)</option>
                  <option value="4mp">4.0 Megapixel / 2K QHD (2560x1440)</option>
                  <option value="5mp">5.0 Megapixel Super HD</option>
                  <option value="4k">4K Ultra HD (8.0 Megapixel / 3840x2160)</option>
                </select>
              </div>

              {/* Video Compression Codec */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Compression Codec:</label>
                <select
                  value={cctvParams.codec}
                  onChange={e => setCctvParams({ ...cctvParams, codec: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-gold-500"
                >
                  <option value="h264">H.264 (AVC Baseline - Standard)</option>
                  <option value="h264plus">H.264+ (Smart H.264 / 25% Savings)</option>
                  <option value="h265">H.265 (HEVC - Recommended / 50% Savings)</option>
                  <option value="h265plus">H.265+ (Smart H.265 / 65% Savings)</option>
                  <option value="ai_smart">AI Smart Codec (Hikvision/Dahua / 75% Savings)</option>
                </select>
              </div>

              {/* Frame Rate (FPS) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Frame Rate (FPS): <span className="font-bold text-slate-900 dark:text-white">{cctvParams.fps} fps</span>
                </label>
                <select
                  value={cctvParams.fps}
                  onChange={e => setCctvParams({ ...cctvParams, fps: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="10">10 fps (Low motion / Warehouse racks)</option>
                  <option value="15">15 fps (Standard surveillance)</option>
                  <option value="20">20 fps (Smooth / Recommended default)</option>
                  <option value="25">25 fps (Full real-time PAL)</option>
                  <option value="30">30 fps (High-speed / Cashier / Casino)</option>
                </select>
              </div>

              {/* Scene Activity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scene Complexity / Motion:</label>
                <select
                  value={cctvParams.activity}
                  onChange={e => setCctvParams({ ...cctvParams, activity: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="low">Low Motion (Corridors, after-hours storage)</option>
                  <option value="medium">Medium Motion (Office corridors, parking slots)</option>
                  <option value="high">High Motion (Busy production floor, street entrance)</option>
                </select>
              </div>

              {/* Retention Days */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Retention Period: <span className="font-bold text-gold-600 dark:text-gold-400">{cctvParams.retentionDays} Days</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={cctvParams.retentionDays}
                  onChange={e => setCctvParams({ ...cctvParams, retentionDays: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Recording Hours / Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recording Hours / Day:</label>
                <select
                  value={cctvParams.hoursPerDay}
                  onChange={e => setCctvParams({ ...cctvParams, hoursPerDay: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="24">24 Hours (Continuous 24/7)</option>
                  <option value="16">16 Hours (Extended store / shift)</option>
                  <option value="12">12 Hours (Office business hours)</option>
                  <option value="8">8 Hours (Scheduled workday only)</option>
                  <option value="6">~6 Hours (Motion-triggered equivalent)</option>
                </select>
              </div>

              {/* RAID Configuration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Storage Redundancy (RAID):</label>
                <select
                  value={cctvParams.raidType}
                  onChange={e => setCctvParams({ ...cctvParams, raidType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="none">No RAID (Single JBOD drive / Standalone)</option>
                  <option value="raid1">RAID 1 Mirroring (100% capacity reserve)</option>
                  <option value="raid5">RAID 5 (Recommended / 1 Drive Fault Tolerance)</option>
                  <option value="raid6">RAID 6 (Dual Parity / 2 Drive Fault Tolerance)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={cctvParams.includeAudio}
                  onChange={e => setCctvParams({ ...cctvParams, includeAudio: e.target.checked })}
                  className="rounded text-gold-600 focus:ring-gold-500 h-4 w-4"
                />
                <span>Include Audio stream (64 kbps per camera)</span>
              </label>
            </div>
          </div>

          {/* Right Calculation Results Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Calculated Storage & Hardware</span>
                <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {cctvParams.cameras} Channels
                </span>
              </div>

              {/* Big Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Usable Storage Needed</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {formatNumber(cctvResults.usableStorageTb, 2)} <span className="text-xs font-bold text-gold-400">TB</span>
                  </div>
                  <span className="text-[10px] text-slate-400">({formatNumber(cctvResults.totalStorageGb, 0)} GB)</span>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Gross Storage ({cctvParams.raidType.toUpperCase()})</span>
                  <div className="text-2xl font-black text-gold-400 mt-1">
                    {formatNumber(cctvResults.grossStorageNeededTb, 2)} <span className="text-xs font-bold text-white">TB</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Including RAID reserve</span>
                </div>
              </div>

              {/* Hardware Recommendation Pill */}
              <div className="bg-gold-950/40 border border-gold-600/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wide">
                  <HardDrive className="w-4 h-4" />
                  <span>Recommended Storage Setup</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {cctvResults.recommendedDrivesCount}x {cctvResults.driveSize}TB Surveillance Hard Drives
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Total Raw Capacity:</span>
                  <span className="font-semibold text-white">{cctvResults.totalPurchasedTb} TB</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Est. HDD Budget:</span>
                  <span className="font-bold text-gold-400">{formatCurrency(cctvResults.estimatedHddCost)}</span>
                </div>
              </div>

              {/* Network Bandwidth Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Stream Bitrate / Camera:</span>
                  <span className="font-semibold text-white font-mono">{formatNumber(cctvResults.bitratePerCam, 2)} Mbps</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Inbound Network Bandwidth:</span>
                  <span className="font-bold text-gold-400 font-mono">{formatNumber(cctvResults.totalBandwidthMbps, 1)} Mbps</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Daily Ingestion Rate:</span>
                  <span className="font-semibold text-white font-mono">{formatNumber(cctvResults.totalDailyGb, 1)} GB / day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Switch Port Requirement:</span>
                  <span className="font-semibold text-emerald-400">{cctvResults.switchSpeed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">NVR Appliance Sizing:</span>
                  <span className="font-semibold text-white">{cctvResults.nvrChannels}-Channel NVR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: DESKTOP PC & WORKSTATION CALCULATOR
          ===================================================================== */}
      {activeTab === 'pc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-gold-500" />
                <h2 className="font-bold text-slate-800 dark:text-white text-base">Desktop Workstation Configuration</h2>
              </div>
              <button
                type="button"
                onClick={() => setPcParams({
                  preset: 'office', unitDrawWatts: 90, monitors: 1, monitorWatts: 25, peripheralsWatts: 15,
                  quantity: 15, hoursPerDay: 9, workdaysPerMonth: 22, electricityRate: 12.00,
                  unitCost: 38000, usefulLifeYears: 4, salvageValue: 4000, desiredUpsRuntimeMins: 15
                })}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Workstation Tiers:</label>
              <div className="flex flex-wrap gap-2">
                {pcPresets.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setPcParams(prev => ({ ...prev, ...preset }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unit Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fleet Quantity: <span className="font-bold text-gold-600 dark:text-gold-400">{pcParams.quantity} PCs</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={pcParams.quantity}
                  onChange={e => setPcParams({ ...pcParams, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* PC Active Draw */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PC Tower Average Load: <span className="font-bold text-slate-900 dark:text-white">{pcParams.unitDrawWatts} W</span>
                </label>
                <input
                  type="number"
                  min="20"
                  max="1500"
                  value={pcParams.unitDrawWatts}
                  onChange={e => setPcParams({ ...pcParams, unitDrawWatts: parseInt(e.target.value) || 50 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Monitors count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Monitors per Desk:</label>
                <select
                  value={pcParams.monitors}
                  onChange={e => setPcParams({ ...pcParams, monitors: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="1">1 Monitor (~25W)</option>
                  <option value="2">2 Monitors (~50W Dual Screen)</option>
                  <option value="3">3 Monitors (~75W Triple Screen)</option>
                  <option value="0">0 (Headless Server / VM)</option>
                </select>
              </div>

              {/* Active Hours */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Daily Usage (Hours/Day):</label>
                <select
                  value={pcParams.hoursPerDay}
                  onChange={e => setPcParams({ ...pcParams, hoursPerDay: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="8">8 Hours (Standard Single Shift)</option>
                  <option value="9">9 Hours (Office with lunch break)</option>
                  <option value="16">16 Hours (Two Shifts)</option>
                  <option value="24">24 Hours (Continuous 24/7 Server)</option>
                </select>
              </div>

              {/* Workdays per Month */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Workdays per Month:</label>
                <select
                  value={pcParams.workdaysPerMonth}
                  onChange={e => setPcParams({ ...pcParams, workdaysPerMonth: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="22">22 Days (Mon - Fri Office)</option>
                  <option value="26">26 Days (Mon - Sat Plant Schedule)</option>
                  <option value="30">30 Days (Full Month / 24/7)</option>
                </select>
              </div>

              {/* Electricity Rate (PHP) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Electricity Rate (₱ / kWh):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pcParams.electricityRate}
                  onChange={e => setPcParams({ ...pcParams, electricityRate: parseFloat(e.target.value) || 12 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Unit Purchase Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Price / PC (₱):
                </label>
                <input
                  type="number"
                  value={pcParams.unitCost}
                  onChange={e => setPcParams({ ...pcParams, unitCost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Useful Life Years */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Useful Lifespan (Years):</label>
                <select
                  value={pcParams.usefulLifeYears}
                  onChange={e => setPcParams({ ...pcParams, usefulLifeYears: parseFloat(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="3">3 Years (High Performance / Tech Refresh)</option>
                  <option value="4">4 Years (Standard Corporate Cycle)</option>
                  <option value="5">5 Years (Extended Lifespan)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Results Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Power, UPS & Cost Analysis</span>
                <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pcParams.quantity} Desktop Fleet
                </span>
              </div>

              {/* Top Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Fleet Active Power</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {formatNumber(pcResults.fleetActiveKw, 2)} <span className="text-xs font-bold text-gold-400">kW</span>
                  </div>
                  <span className="text-[10px] text-slate-400">({pcResults.totalWattsPerUnit} W / workstation)</span>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Monthly Electricity</span>
                  <div className="text-2xl font-black text-gold-400 mt-1">
                    {formatCurrency(pcResults.fleetMonthlyCost)}
                  </div>
                  <span className="text-[10px] text-slate-400">({formatNumber(pcResults.fleetMonthlyKwh, 0)} kWh / mo)</span>
                </div>
              </div>

              {/* UPS Spec Card */}
              <div className="bg-indigo-950/40 border border-indigo-600/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wide">
                  <Zap className="w-4 h-4" />
                  <span>Recommended UPS per Desk</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {pcResults.recommendedUpsRating}
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Minimum Capacity Needed:</span>
                  <span className="font-semibold text-white">{pcResults.upsMinVa} VA / {pcResults.upsMinWatts} Watts</span>
                </div>
              </div>

              {/* TCO & Cost Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Annual Fleet Electricity Bill:</span>
                  <span className="font-bold text-gold-400 font-mono">{formatCurrency(pcResults.fleetAnnualCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Power Cost / PC:</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(pcResults.monthlyCostPerUnit)} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Asset Depreciation / PC:</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(pcResults.monthlyDepreciationPerUnit)} / mo</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-bold">
                  <span className="text-gold-400">Total Fleet Monthly TCO:</span>
                  <span className="text-white text-sm font-mono">{formatCurrency(pcResults.totalFleetMonthlyTco)} / mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: LAPTOP & BATTERY CALCULATOR
          ===================================================================== */}
      {activeTab === 'laptop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-gold-500" />
                <h2 className="font-bold text-slate-800 dark:text-white text-base">Laptop Fleet & Battery Configuration</h2>
              </div>
              <button
                type="button"
                onClick={() => setLaptopParams({
                  tier: 'corporate', avgWatts: 28, chargerWatts: 65, batteryWh: 56, quantity: 20,
                  hoursPlugged: 8, hoursOnBattery: 2, workdaysPerMonth: 22, electricityRate: 12.00,
                  unitCost: 45000, usefulLifeYears: 3.5, cyclesPerWeek: 4
                })}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Form Factor Presets:</label>
              <div className="flex flex-wrap gap-2">
                {laptopPresets.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setLaptopParams(prev => ({ ...prev, ...preset }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fleet Quantity: <span className="font-bold text-gold-600 dark:text-gold-400">{laptopParams.quantity} Laptops</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={laptopParams.quantity}
                  onChange={e => setLaptopParams({ ...laptopParams, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Average Power Draw */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Average Power Draw: <span className="font-bold text-slate-900 dark:text-white">{laptopParams.avgWatts} Watts</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={laptopParams.avgWatts}
                  onChange={e => setLaptopParams({ ...laptopParams, avgWatts: parseInt(e.target.value) || 25 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Charger Adapter Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Power Adapter Rating:</label>
                <select
                  value={laptopParams.chargerWatts}
                  onChange={e => setLaptopParams({ ...laptopParams, chargerWatts: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="45">45W Type-C (Slim Ultrabook)</option>
                  <option value="65">65W Type-C (Standard Corporate)</option>
                  <option value="100">100W Type-C (Performance Pro)</option>
                  <option value="135">135W - 170W (Mobile Workstation)</option>
                </select>
              </div>

              {/* Battery Capacity (Wh) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Battery Capacity (Watt-hours):
                </label>
                <input
                  type="number"
                  min="30"
                  max="99"
                  value={laptopParams.batteryWh}
                  onChange={e => setLaptopParams({ ...laptopParams, batteryWh: parseInt(e.target.value) || 50 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Hours Plugged In */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hours Plugged / Charging per Day:</label>
                <select
                  value={laptopParams.hoursPlugged}
                  onChange={e => setLaptopParams({ ...laptopParams, hoursPlugged: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="6">6 Hours</option>
                  <option value="8">8 Hours (Standard day)</option>
                  <option value="10">10 Hours (Overtime)</option>
                  <option value="16">16 Hours (Docked continuously)</option>
                </select>
              </div>

              {/* Charge Cycles per Week */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Battery Discharge Cycles / Week:</label>
                <select
                  value={laptopParams.cyclesPerWeek}
                  onChange={e => setLaptopParams({ ...laptopParams, cyclesPerWeek: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="2">2 Cycles (Mostly deskbound / docked)</option>
                  <option value="4">4 Cycles (Hybrid mobile office)</option>
                  <option value="7">7 Cycles (Heavy field work / daily full discharge)</option>
                </select>
              </div>

              {/* Unit Purchase Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Price / Laptop (₱):
                </label>
                <input
                  type="number"
                  value={laptopParams.unitCost}
                  onChange={e => setLaptopParams({ ...laptopParams, unitCost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Useful Life */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Planned Useful Life (Years):</label>
                <select
                  value={laptopParams.usefulLifeYears}
                  onChange={e => setLaptopParams({ ...laptopParams, usefulLifeYears: parseFloat(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="3">3.0 Years (Enterprise Refresh)</option>
                  <option value="3.5">3.5 Years (Standard)</option>
                  <option value="4">4.0 Years (Extended)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Results Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Green IT & Battery Health</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {laptopParams.quantity} Laptops
                </span>
              </div>

              {/* Top Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Fleet Monthly Power</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {formatCurrency(laptopResults.fleetMonthlyCost)}
                  </div>
                  <span className="text-[10px] text-slate-400">({formatNumber(laptopResults.fleetMonthlyKwh, 1)} kWh)</span>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Savings vs Desktop</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {formatCurrency(laptopResults.fleetAnnualSavings)}
                  </div>
                  <span className="text-[10px] text-emerald-300">Annual energy saved</span>
                </div>
              </div>

              {/* Battery Degradation Health */}
              <div className="bg-emerald-950/40 border border-emerald-600/40 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <Battery className="w-4 h-4" />
                  <span>Battery Health Forecast</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  ~{laptopResults.monthsTo80Percent} Months until 80% Capacity Degradation
                </div>
                <p className="text-xs text-slate-300">
                  Based on {laptopResults.cyclesPerYear} charge cycles/year (500 cycle Li-ion standard). Battery replacement recommended in Year {Math.ceil(laptopResults.monthsTo80Percent / 12)}.
                </p>
              </div>

              {/* Financial TCO */}
              <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Electricity Cost / Laptop:</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(laptopResults.monthlyCostPerUnit)} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Asset Depreciation / Laptop:</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(laptopResults.monthlyDepreciationPerUnit)} / mo</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-bold">
                  <span className="text-gold-400">Total Fleet Monthly TCO:</span>
                  <span className="text-white text-sm font-mono">{formatCurrency(laptopResults.totalFleetMonthlyTco)} / mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PRINTER COST-PER-PAGE (CPP) CALCULATOR
          ===================================================================== */}
      {activeTab === 'printer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-gold-500" />
                <h2 className="font-bold text-slate-800 dark:text-white text-base">Printer Cost-Per-Page (CPP) Sizing</h2>
              </div>
              <button
                type="button"
                onClick={() => setPrinterParams({
                  category: 'mono_laser', printerPrice: 18500, lifespanMonths: 48, monthlyMonoPages: 2500,
                  monthlyColorPages: 400, blackConsumableCost: 3200, blackYieldPages: 3000, colorConsumablesCost: 8500,
                  colorYieldPages: 2200, drumCost: 3500, drumLifespanPages: 18000, paperReamCost: 240, monthlyPowerMaint: 250
                })}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Printer Technology Presets:</label>
              <div className="flex flex-wrap gap-2">
                {printerPresets.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setPrinterParams(prev => ({ ...prev, ...preset }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Printer Hardware Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Printer Hardware Cost (₱):
                </label>
                <input
                  type="number"
                  value={printerParams.printerPrice}
                  onChange={e => setPrinterParams({ ...printerParams, printerPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Expected Lifespan Months */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Lifespan:</label>
                <select
                  value={printerParams.lifespanMonths}
                  onChange={e => setPrinterParams({ ...printerParams, lifespanMonths: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                >
                  <option value="36">36 Months (3 Years)</option>
                  <option value="48">48 Months (4 Years - Recommended)</option>
                  <option value="60">60 Months (5 Years)</option>
                </select>
              </div>

              {/* Monthly Black & White Pages */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly B&W Pages:
                </label>
                <input
                  type="number"
                  min="0"
                  value={printerParams.monthlyMonoPages}
                  onChange={e => setPrinterParams({ ...printerParams, monthlyMonoPages: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Monthly Color Pages */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Color Pages:
                </label>
                <input
                  type="number"
                  min="0"
                  value={printerParams.monthlyColorPages}
                  onChange={e => setPrinterParams({ ...printerParams, monthlyColorPages: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Black Cartridge Cost & Yield */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Black Cartridge Cost (₱):
                </label>
                <input
                  type="number"
                  value={printerParams.blackConsumableCost}
                  onChange={e => setPrinterParams({ ...printerParams, blackConsumableCost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Black Cartridge Rated Yield:
                </label>
                <input
                  type="number"
                  value={printerParams.blackYieldPages}
                  onChange={e => setPrinterParams({ ...printerParams, blackYieldPages: parseInt(e.target.value) || 1000 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Color Cartridge Set Cost & Yield */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color Toner/Ink Set Cost (₱):
                </label>
                <input
                  type="number"
                  value={printerParams.colorConsumablesCost}
                  onChange={e => setPrinterParams({ ...printerParams, colorConsumablesCost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color Set Rated Yield:
                </label>
                <input
                  type="number"
                  value={printerParams.colorYieldPages}
                  onChange={e => setPrinterParams({ ...printerParams, colorYieldPages: parseInt(e.target.value) || 1000 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Paper Ream Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  A4 Paper Ream Cost (₱ / 500 sheets):
                </label>
                <input
                  type="number"
                  value={printerParams.paperReamCost}
                  onChange={e => setPrinterParams({ ...printerParams, paperReamCost: parseFloat(e.target.value) || 200 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>

              {/* Drum / Maintenance Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drum / Maintenance Box Cost (₱):
                </label>
                <input
                  type="number"
                  value={printerParams.drumCost}
                  onChange={e => setPrinterParams({ ...printerParams, drumCost: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Right Results Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Cost-Per-Page & TCO Breakdown</span>
                <span className="bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {printerResults.totalPages} Pages / Month
                </span>
              </div>

              {/* CPP Highlights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">B&W Cost-Per-Page</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {formatCurrency(printerResults.totalMonoCpp)}
                  </div>
                  <span className="text-[10px] text-slate-400">Toner + Drum + Paper</span>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Color Cost-Per-Page</span>
                  <div className="text-2xl font-black text-gold-400 mt-1">
                    {formatCurrency(printerResults.totalColorCpp)}
                  </div>
                  <span className="text-[10px] text-slate-400">CMYK + Drum + Paper</span>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Consumables (Toner/Ink):</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(printerResults.monthlyConsumablesCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Paper Expense:</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(printerResults.monthlyPaperCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Operating Cost (Opex):</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatCurrency(printerResults.monthlyTotalOpex)} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Machine Amortization (Depreciation):</span>
                  <span className="font-semibold text-white font-mono">{formatCurrency(printerResults.monthlyDepreciation)} / mo</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-bold">
                  <span className="text-gold-400">Total Monthly TCO:</span>
                  <span className="text-white text-sm font-mono">{formatCurrency(printerResults.monthlyTotalTco)} / mo</span>
                </div>
              </div>

              {/* Lifetime TCO Card */}
              <div className="bg-gold-950/40 border border-gold-600/40 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>3-Year Lifetime Ownership Cost:</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(printerResults.threeYearTco)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>5-Year Lifetime Ownership Cost:</span>
                  <span className="font-bold text-gold-400 font-mono">{formatCurrency(printerResults.fiveYearTco)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Hardware Sizing Summary Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Layers className="w-5 h-5 text-gold-500" />
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Quick Comparison & Sizing Reference</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Equipment Type</th>
                <th className="py-2.5 px-3">Primary Capacity / Spec</th>
                <th className="py-2.5 px-3">Monthly Energy / Consumables</th>
                <th className="py-2.5 px-3">Recommended Infrastructure</th>
                <th className="py-2.5 px-3 text-right">Key Sizing Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold flex items-center gap-2">
                  <Video className="w-4 h-4 text-gold-500" />
                  <span>CCTV Surveillance</span>
                </td>
                <td className="py-3 px-3">{cctvParams.cameras} Cams @ {cctvParams.resolution} ({cctvParams.codec.toUpperCase()})</td>
                <td className="py-3 px-3">{formatNumber(cctvResults.totalDailyGb, 1)} GB / day ingestion</td>
                <td className="py-3 px-3">{cctvResults.recommendedDrivesCount}x {cctvResults.driveSize}TB HDDs ({cctvResults.nvrChannels}CH NVR)</td>
                <td className="py-3 px-3 text-right font-bold text-gold-600 dark:text-gold-400">{formatNumber(cctvResults.usableStorageTb, 2)} TB Storage</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span>Desktop Workstation</span>
                </td>
                <td className="py-3 px-3">{pcParams.quantity} PCs ({pcResults.totalWattsPerUnit}W per desk)</td>
                <td className="py-3 px-3">{formatCurrency(pcResults.fleetMonthlyCost)} / mo ({formatNumber(pcResults.fleetMonthlyKwh, 0)} kWh)</td>
                <td className="py-3 px-3">{pcResults.recommendedUpsRating} UPS per unit</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatNumber(pcResults.fleetActiveKw, 2)} kW Active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-500" />
                  <span>Corporate Laptop</span>
                </td>
                <td className="py-3 px-3">{laptopParams.quantity} Laptops (~{laptopParams.avgWatts}W draw, {laptopParams.batteryWh}Wh battery)</td>
                <td className="py-3 px-3">{formatCurrency(laptopResults.fleetMonthlyCost)} / mo ({formatNumber(laptopResults.fleetMonthlyKwh, 1)} kWh)</td>
                <td className="py-3 px-3">Saves {formatCurrency(laptopResults.fleetAnnualSavings)}/yr vs Desktops</td>
                <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">~{laptopResults.monthsTo80Percent} mo Battery Life</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-500" />
                  <span>Office Printer / Copier</span>
                </td>
                <td className="py-3 px-3">{printerResults.totalPages} Pages/mo ({printerParams.monthlyMonoPages} B&W / {printerParams.monthlyColorPages} Color)</td>
                <td className="py-3 px-3">{formatCurrency(printerResults.monthlyTotalOpex)} / mo Opex</td>
                <td className="py-3 px-3">B&W: {formatCurrency(printerResults.totalMonoCpp)} / Color: {formatCurrency(printerResults.totalColorCpp)}</td>
                <td className="py-3 px-3 text-right font-bold text-purple-600 dark:text-purple-400">{formatCurrency(printerResults.monthlyTotalTco)} / mo TCO</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
