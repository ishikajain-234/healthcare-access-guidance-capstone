import React, { useState, useEffect } from 'react';
import {
  Users,
  BedDouble,
  Clock,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  RefreshCw,
  Layers,
  Package,
  Calculator,
  ShieldAlert,
  Info,
  Sliders,
  ChevronRight,
  Filter,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import SectionCard from '../../components/common/SectionCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import {
  getHospitalBedAvailability,
  getHospitalDepartments,
  getOpdTokens,
  getOpdAnalytics,
  getAdmissions,
  getInventoryAvailability,
} from '../../services/api';
import {
  formatPercent,
  formatDateTime,
  formatTime,
  formatDurationMinutes,
} from '../../utils/formatters';

export default function DashboardPage({
  hospitalId,
  hospitalName,
  hospitals = [],
  onSelectHospital,
  onNavigate,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Operational datasets
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [tokens, setTokens] = useState([]);
  const [opdAnalytics, setOpdAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [bedAvailability, setBedAvailability] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [inventoryAvail, setInventoryAvail] = useState(null);

  // 1. Initial Load when hospital changes: load departments, beds, inventory, admissions
  useEffect(() => {
    async function loadHospitalData() {
      if (!hospitalId) return;
      setLoading(true);
      setError(null);
      try {
        const [deptRes, bedRes, invRes, admRes] = await Promise.all([
          getHospitalDepartments(hospitalId).catch(() => ({ departments: [] })),
          getHospitalBedAvailability(hospitalId).catch(() => null),
          getInventoryAvailability({ hospital_id: hospitalId }).catch(() => null),
          getAdmissions({ hospital_id: hospitalId, limit: 50 }).catch(() => ({ admissions: [] })),
        ]);

        const depts = deptRes?.departments || [];
        setDepartments(depts);
        setBedAvailability(bedRes);
        setInventoryAvail(invRes);
        setAdmissions(admRes?.admissions || []);

        // Default to first department if available, otherwise 'ALL'
        if (depts.length > 0) {
          setSelectedDeptId(depts[0].department_id);
        } else {
          setSelectedDeptId('ALL');
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize hospital operations data.');
      } finally {
        setLoading(false);
      }
    }

    loadHospitalData();
  }, [hospitalId]);

  // 2. Load Tokens and OPD Analytics whenever selected department changes
  useEffect(() => {
    async function loadDepartmentQueueData() {
      if (!hospitalId) return;
      setAnalyticsLoading(true);
      try {
        if (selectedDeptId && selectedDeptId !== 'ALL') {
          const [tokRes, anaRes] = await Promise.all([
            getOpdTokens({
              hospital_id: hospitalId,
              department_id: selectedDeptId,
              limit: 100,
            }).catch(() => ({ tokens: [] })),
            getOpdAnalytics({
              hospital_id: hospitalId,
              department_id: selectedDeptId,
            }).catch(() => null),
          ]);
          setTokens(tokRes?.tokens || []);
          setOpdAnalytics(anaRes);
        } else {
          // 'ALL' departments
          const tokRes = await getOpdTokens({
            hospital_id: hospitalId,
            limit: 100,
          }).catch(() => ({ tokens: [] }));
          setTokens(tokRes?.tokens || []);

          // Query analytics for first department if available as reference
          if (departments.length > 0) {
            const anaRes = await getOpdAnalytics({
              hospital_id: hospitalId,
              department_id: departments[0].department_id,
            }).catch(() => null);
            setOpdAnalytics(anaRes);
          } else {
            setOpdAnalytics(null);
          }
        }
      } catch (err) {
        console.error('Failed to load queue telemetry:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    }

    if (!loading) {
      loadDepartmentQueueData();
    }
  }, [hospitalId, selectedDeptId, loading]);

  const refreshAllTelemetry = async () => {
    if (!hospitalId) return;
    setLoading(true);
    setError(null);
    try {
      const [deptRes, bedRes, invRes, admRes] = await Promise.all([
        getHospitalDepartments(hospitalId).catch(() => ({ departments: [] })),
        getHospitalBedAvailability(hospitalId).catch(() => null),
        getInventoryAvailability({ hospital_id: hospitalId }).catch(() => null),
        getAdmissions({ hospital_id: hospitalId, limit: 50 }).catch(() => ({ admissions: [] })),
      ]);

      const depts = deptRes?.departments || [];
      setDepartments(depts);
      setBedAvailability(bedRes);
      setInventoryAvail(invRes);
      setAdmissions(admRes?.admissions || []);

      const activeDept = selectedDeptId && selectedDeptId !== 'ALL' ? selectedDeptId : (depts[0]?.department_id || 'ALL');
      if (activeDept !== 'ALL') {
        const [tokRes, anaRes] = await Promise.all([
          getOpdTokens({ hospital_id: hospitalId, department_id: activeDept, limit: 100 }).catch(() => ({ tokens: [] })),
          getOpdAnalytics({ hospital_id: hospitalId, department_id: activeDept }).catch(() => null),
        ]);
        setTokens(tokRes?.tokens || []);
        setOpdAnalytics(anaRes);
      } else {
        const tokRes = await getOpdTokens({ hospital_id: hospitalId, limit: 100 }).catch(() => ({ tokens: [] }));
        setTokens(tokRes?.tokens || []);
        if (depts.length > 0) {
          const anaRes = await getOpdAnalytics({ hospital_id: hospitalId, department_id: depts[0].department_id }).catch(() => null);
          setOpdAnalytics(anaRes);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh telemetry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff Operations Console"
          subtitle={`Hospital resource telemetry and patient coordination for ${hospitalName || hospitalId}`}
        />
        <LoadingState message="Connecting to facility operational telemetry..." minHeight="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff Operations Console"
          subtitle={`Hospital resource telemetry and patient coordination for ${hospitalName || hospitalId}`}
        />
        <ErrorState message={error} onRetry={refreshAllTelemetry} />
      </div>
    );
  }

  // Active department object
  const currentDept = departments.find((d) => d.department_id === selectedDeptId);

  // OPD Token Lifecycle Counts
  const totalTokens = tokens.length;
  const waitingTokens = tokens.filter((t) => t.status === 'WAITING').length;
  const calledTokens = tokens.filter((t) => t.status === 'CALLED').length;
  const inServiceTokens = tokens.filter((t) => t.status === 'IN_SERVICE').length;
  const completedTokens = tokens.filter((t) => t.status === 'COMPLETED').length;
  const cancelledTokens = tokens.filter((t) => t.status === 'CANCELLED').length;

  // Active Counters
  const activeCounters = opdAnalytics?.observed?.active_counters ?? 0;

  // Observed Waits
  const observedAvgWait = opdAnalytics?.observed?.average_wait_minutes ?? 0.00;
  const observedAvgService = opdAnalytics?.observed?.average_service_minutes ?? 0.00;

  // Bed Availability Metrics
  const bedStats = bedAvailability || {
    total_beds: 0,
    available_beds: 0,
    reserved_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
    out_of_service_beds: 0,
    occupancy_rate: 0,
    ward_breakdown: [],
  };

  // ICU Breakdown
  const icuWards = bedStats.ward_breakdown?.filter((w) => w.ward_type === 'ICU') || [];
  const icuTotalBeds = icuWards.reduce((acc, w) => acc + (w.total_beds || 0), 0);
  const icuAvailBeds = icuWards.reduce((acc, w) => acc + (w.available_beds || 0), 0);
  const icuOccupiedBeds = icuWards.reduce((acc, w) => acc + (w.occupied_beds || 0), 0);

  // Active Inpatient Admissions
  const activeAdmissionStatuses = ['ADMISSION_REQUESTED', 'PENDING_REVIEW', 'BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED'];
  const activeAdmissionsList = admissions.filter((a) => activeAdmissionStatuses.includes(a.status));
  const dischargedAdmissionsList = admissions.filter((a) => a.status === 'DISCHARGED');

  // Inventory Alerts
  const invTotalItems = inventoryAvail?.total_items ?? 0;
  const invLowStockItems = inventoryAvail?.low_stock_items ?? 0;
  const invOutOfStockItems = inventoryAvail?.out_of_stock_items ?? 0;
  const criticalSupplies = (inventoryAvail?.items || []).filter(
    (i) => i.stock_status === 'LOW_STOCK' || i.stock_status === 'OUT_OF_STOCK'
  );

  return (
    <div className="space-y-6">
      {/* 1. Header with Hospital & Department Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Operations Console</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 rounded">
              PS-75 Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time outpatient tokens, acute bed allocation, admission tracking, and dispensary inventory
          </p>
        </div>

        {/* Filters: Hospital & Department Selection Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Facility Selector */}
          {hospitals.length > 0 && onSelectHospital && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs shadow-none">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium">Facility:</span>
              <select
                value={hospitalId || ''}
                onChange={(e) => onSelectHospital(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {hospitals.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.hospital_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs shadow-none">
            <Sliders className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name} ({d.department_code})
                </option>
              ))}
            </select>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={refreshAllTelemetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            title="Refresh operational telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Prominent Simulated Data Notice */}
      <div className="p-3.5 bg-amber-50 border border-amber-300 rounded flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
            Academic Demonstration Environment &bull; Simulated Operational Telemetry
          </p>
          <p className="leading-relaxed">
            All OPD queue tokens, bed capacities, inpatient admissions, and dispensary inventory records shown on this console represent synthetic operational data for academic evaluation (PS-75). They do not represent live municipal hospital availability or real-time government triage. Token sequencing is strictly FIFO; no clinical priority logic is executed.
          </p>
        </div>
      </div>

      {/* 3. Top KPI Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Queue Size */}
        <StatCard
          title="Current Queue Size"
          value={waitingTokens}
          subtext={`${totalTokens} total tokens today`}
          icon={Users}
          variant={waitingTokens > 10 ? 'warning' : 'terracotta'}
        />

        {/* KPI 2: Active Counters */}
        <StatCard
          title="Active Counters"
          value={activeCounters}
          subtext={currentDept ? `${currentDept.department_code} counters` : 'monitored counters'}
          icon={Activity}
          variant="info"
        />

        {/* KPI 3: Observed Avg Wait */}
        <StatCard
          title="Observed Avg Wait"
          value={formatDurationMinutes(observedAvgWait)}
          subtext={`Avg service: ${formatDurationMinutes(observedAvgService)}`}
          icon={Clock}
          variant="default"
        />

        {/* KPI 4: Bed Occupancy */}
        <StatCard
          title="Bed Occupancy"
          value={formatPercent(bedStats.occupancy_rate)}
          subtext={`${bedStats.occupied_beds} of ${bedStats.total_beds} beds`}
          icon={BedDouble}
          variant={bedStats.occupancy_rate > 80 ? 'warning' : 'default'}
        />

        {/* KPI 5: Active Admissions */}
        <StatCard
          title="Active Admissions"
          value={activeAdmissionsList.length}
          subtext={`${dischargedAdmissionsList.length} discharged`}
          icon={Layers}
          variant="default"
        />

        {/* KPI 6: Inventory Alerts */}
        <StatCard
          title="Supply Alerts"
          value={invLowStockItems + invOutOfStockItems}
          subtext={`${invOutOfStockItems} out, ${invLowStockItems} low`}
          icon={AlertTriangle}
          variant={invOutOfStockItems > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* 4. OPD Token Lifecycle Breakdown & M/M/c Benchmark Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: OPD Token Queue Lifecycle & Active Queue */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            title="OPD Token Queue Lifecycle"
            subtitle={
              currentDept
                ? `Active outpatient tokens for ${currentDept.department_name}`
                : `Aggregated tokens across all ${departments.length} clinical departments`
            }
            actions={
              <button
                onClick={() => onNavigate('OPD_QUEUE')}
                className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900 inline-flex items-center gap-1"
              >
                <span>Full Queue Manager</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {/* Token Status Counters */}
            <div className="grid grid-cols-5 gap-2 pb-4 border-b border-slate-100 text-center">
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
                <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">WAITING</span>
                <span className="text-xl font-bold text-amber-900">{waitingTokens}</span>
                <span className="block text-[10px] text-amber-700 font-mono mt-0.5">Logical Queue</span>
              </div>
              <div className="p-2.5 rounded bg-sky-50 border border-sky-200">
                <span className="block text-[10px] font-bold text-sky-700 uppercase tracking-wider">CALLED</span>
                <span className="text-xl font-bold text-sky-900">{calledTokens}</span>
                <span className="block text-[10px] text-sky-700 font-mono mt-0.5">At Counter</span>
              </div>
              <div className="p-2.5 rounded bg-blue-50 border border-blue-200">
                <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">IN SERVICE</span>
                <span className="text-xl font-bold text-blue-900">{inServiceTokens}</span>
                <span className="block text-[10px] text-blue-700 font-mono mt-0.5">Consulting</span>
              </div>
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">COMPLETED</span>
                <span className="text-xl font-bold text-emerald-900">{completedTokens}</span>
                <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">Finished</span>
              </div>
              <div className="p-2.5 rounded bg-slate-100 border border-slate-200">
                <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">CANCELLED</span>
                <span className="text-xl font-bold text-slate-800">{cancelledTokens}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">No-show/Void</span>
              </div>
            </div>

            {/* Live Token Snapshot Table */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Active & Recent Tokens ({tokens.length})
              </h4>
              {tokens.length === 0 ? (
                <EmptyState
                  title="No Active OPD Tokens"
                  description="No patient tokens have been registered for this department today."
                  actionLabel="Go to OPD Queue"
                  onAction={() => onNavigate('OPD_QUEUE')}
                />
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-100 rounded">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-3">Token</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Counter</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Issued At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {tokens.slice(0, 10).map((t) => (
                        <tr key={t.token_id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {t.token_number}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-700">
                            {t.department_name || t.department_id}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {t.counter_id ? t.counter_id : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge type="token" status={t.status} size="xs" />
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {formatTime(t.issued_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* RIGHT 1 COL: M/M/c Erlang-C Theoretical Benchmark */}
        <div className="space-y-4">
          <SectionCard
            title="M/M/c Theoretical Benchmark"
            subtitle="Queueing theory reference model vs observed waiting times"
          >
            {opdAnalytics ? (
              <div className="space-y-4">
                {/* Traffic Intensity */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>Traffic Intensity (ρ = λ / c·μ)</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      opdAnalytics.mmc_benchmark?.rho < 0.8
                        ? 'bg-emerald-100 text-emerald-800'
                        : opdAnalytics.mmc_benchmark?.rho < 1.0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {formatPercent((opdAnalytics.mmc_benchmark?.rho || 0) * 100)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        opdAnalytics.mmc_benchmark?.rho < 0.8
                          ? 'bg-emerald-500'
                          : opdAnalytics.mmc_benchmark?.rho < 1.0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min((opdAnalytics.mmc_benchmark?.rho || 0) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>c = {opdAnalytics.mmc_benchmark?.c} active counters</span>
                    <span>λ = {opdAnalytics.mmc_benchmark?.lambda}/hr &bull; μ = {opdAnalytics.mmc_benchmark?.mu}/hr</span>
                  </div>
                </div>

                {/* Comparative Metric Grid */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Observed Wait Wq</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatDurationMinutes(observedAvgWait)}
                    </span>
                    <span className="block text-[10px] text-slate-500">From empirical tokens</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">M/M/c Theoretical Wq</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {opdAnalytics.mmc_benchmark?.stable
                        ? formatDurationMinutes(opdAnalytics.mmc_benchmark.wq_minutes)
                        : 'Unstable'}
                    </span>
                    <span className="block text-[10px] text-slate-500">Erlang-C formula</span>
                  </div>
                </div>

                {/* Variance Delta */}
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded flex items-center justify-between text-xs text-blue-950">
                  <span className="font-medium">Model Variance (ΔWq):</span>
                  <span className="font-mono font-bold text-blue-900">
                    {opdAnalytics.comparison?.wait_delta_minutes !== null
                      ? `${opdAnalytics.comparison.wait_delta_minutes > 0 ? '+' : ''}${opdAnalytics.comparison.wait_delta_minutes} min`
                      : 'N/A'}
                  </span>
                </div>

                {/* Benchmark Legal Notice */}
                <p className="text-[11px] text-slate-500 leading-tight border-t border-slate-100 pt-2 italic">
                  {opdAnalytics.model_notice}
                </p>
              </div>
            ) : (
              <EmptyState
                title="No Benchmark Available"
                description="Select a department with configured counters to evaluate the M/M/c benchmark."
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* 5. Inpatient Beds & Admissions Coordination Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bed State Summary */}
        <SectionCard
          title="Bed Capacity & State Summary"
          subtitle="Finite-state machine tracking across acute and intensive wards"
          actions={
            <button
              onClick={() => onNavigate('BEDS')}
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900 inline-flex items-center gap-1"
            >
              <span>Manage Beds</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="space-y-4">
            {/* Occupancy Rate Bar */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Facility Occupancy ({bedStats.occupied_beds} of {bedStats.total_beds} beds)</span>
                <span className="font-bold text-slate-900">{formatPercent(bedStats.occupancy_rate)}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${Math.min(bedStats.occupancy_rate, 100)}%` }}
                />
              </div>
            </div>

            {/* Bed State Count Matrix */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total</span>
                <span className="text-base font-bold text-slate-900">{bedStats.total_beds}</span>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Available</span>
                <span className="text-base font-bold text-emerald-800">{bedStats.available_beds}</span>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <span className="block text-[10px] font-bold text-amber-700 uppercase">Reserved</span>
                <span className="text-base font-bold text-amber-800">{bedStats.reserved_beds}</span>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="block text-[10px] font-bold text-blue-700 uppercase">Occupied</span>
                <span className="text-base font-bold text-blue-800">{bedStats.occupied_beds}</span>
              </div>
              <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                <span className="block text-[10px] font-bold text-purple-700 uppercase">Cleaning</span>
                <span className="text-base font-bold text-purple-800">{bedStats.cleaning_beds}</span>
              </div>
              <div className="p-2 bg-slate-100 border border-slate-300 rounded">
                <span className="block text-[10px] font-bold text-slate-600 uppercase">Out of Svc</span>
                <span className="text-base font-bold text-slate-700">{bedStats.out_of_service_beds}</span>
              </div>
            </div>

            {/* ICU Breakdown & Ward Distribution */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="font-semibold text-slate-800">ICU Capacity Telemetry:</span>
              </div>
              <span className="font-mono text-slate-700">
                {icuAvailBeds} available &bull; {icuOccupiedBeds} occupied ({icuTotalBeds} total ICU)
              </span>
            </div>

            {/* Ward-level distribution */}
            {bedStats.ward_breakdown && bedStats.ward_breakdown.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ward-Level Distribution
                </span>
                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto border border-slate-100 rounded">
                  {bedStats.ward_breakdown.map((w) => (
                    <div key={w.ward_id} className="flex items-center justify-between text-xs py-1.5 px-2.5 hover:bg-slate-50">
                      <div>
                        <span className="font-medium text-slate-800">{w.ward_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">[{w.ward_type}]</span>
                      </div>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {w.available_beds} avail / {w.total_beds} total ({formatPercent(w.total_beds > 0 ? (w.occupied_beds / w.total_beds) * 100 : 0)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Inpatient Admissions Pipeline */}
        <SectionCard
          title="Inpatient Admissions Pipeline"
          subtitle="Coordinated inpatient admissions and bed assignment workflow"
          actions={
            <button
              onClick={() => onNavigate('ADMISSIONS')}
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900 inline-flex items-center gap-1"
            >
              <span>Manage Admissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="space-y-4">
            {/* Admissions Pipeline Status Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Logged</span>
                <span className="text-lg font-bold text-slate-900">{admissions.length}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                <span className="block text-[10px] font-bold text-blue-700 uppercase">Active Pipeline</span>
                <span className="text-lg font-bold text-blue-900">{activeAdmissionsList.length}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Discharged</span>
                <span className="text-lg font-bold text-emerald-900">{dischargedAdmissionsList.length}</span>
              </div>
            </div>

            {/* Active Admissions List */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Active Inpatient Cases ({activeAdmissionsList.length})
              </h4>
              {activeAdmissionsList.length === 0 ? (
                <EmptyState
                  title="No Active Inpatient Cases"
                  description="All patient admissions are currently processed or discharged."
                  actionLabel="Create Admission"
                  onAction={() => onNavigate('ADMISSIONS')}
                />
              ) : (
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto border border-slate-100 rounded">
                  {activeAdmissionsList.map((a) => (
                    <div key={a.admission_id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 font-mono">{a.admission_number}</span>
                          <StatusBadge type="admission" status={a.status} size="xs" />
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Ward: <span className="font-medium text-slate-700">{a.ward_name || a.ward_id}</span>
                          {a.bed_number && (
                            <> &bull; Bed: <span className="font-mono text-slate-700">{a.bed_number}</span></>
                          )}
                          {a.linked_token_id && (
                            <> &bull; Linked Token: <span className="font-mono text-terracotta-700">Yes</span></>
                          )}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {formatTime(a.requested_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 6. Dispensary Inventory & Supply Alerts Section */}
      <SectionCard
        title="Dispensary Inventory & Supply Alerts"
        subtitle="Critical stock-level alerts, reorder thresholds, and zero-stock notices"
        actions={
          <button
            onClick={() => onNavigate('INVENTORY')}
            className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900 inline-flex items-center gap-1"
          >
            <span>Full Inventory Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="space-y-4">
          {/* Inventory KPI Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Monitored Items</span>
              <span className="text-base font-bold text-slate-900">{invTotalItems}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
              <span className="block text-[10px] font-bold text-emerald-700 uppercase">In Stock</span>
              <span className="text-base font-bold text-emerald-800">{inventoryAvail?.in_stock_items ?? 0}</span>
            </div>
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
              <span className="block text-[10px] font-bold text-amber-700 uppercase">Low Stock (≤ Threshold)</span>
              <span className="text-base font-bold text-amber-800">{invLowStockItems}</span>
            </div>
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded">
              <span className="block text-[10px] font-bold text-rose-700 uppercase">Out of Stock (Zero)</span>
              <span className="text-base font-bold text-rose-800">{invOutOfStockItems}</span>
            </div>
          </div>

          {/* Critical Items Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Critical Reorder Alerts ({criticalSupplies.length})
            </h4>
            {criticalSupplies.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <span className="font-semibold">All Monitored Supplies Stable</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  No medical supplies or consumables currently at or below their reorder threshold.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-3">Item Code</th>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3 text-center">Current Stock</th>
                      <th className="py-2 px-3 text-center">Reorder Threshold</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {criticalSupplies.map((item) => (
                      <tr key={item.item_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.item_code}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                          {item.item_name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className={item.current_stock === 0 ? 'text-rose-600' : 'text-amber-600'}>
                            {item.current_stock} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {item.reorder_threshold} {item.unit_of_measure}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <StatusBadge type="inventory" status={item.stock_status} size="xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() => onNavigate('INVENTORY')}
                            className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900"
                          >
                            Restock &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
