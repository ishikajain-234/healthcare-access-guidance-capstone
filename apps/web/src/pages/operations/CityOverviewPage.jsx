import React, { useState, useEffect } from 'react';
import {
  Building2,
  AlertTriangle,
  Info,
  RefreshCw,
  Users,
  BedDouble,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { getCityOverview } from '../../services/api';
import { formatPercent, formatDurationMinutes } from '../../utils/formatters';

export default function CityOverviewPage({
  onSelectHospital,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overviewData, setOverviewData] = useState(null);

  const loadCitySnapshots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCityOverview();
      setOverviewData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch persisted city snapshots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitySnapshots();
  }, []);

  const cityTotals = overviewData?.city_totals;
  const hospitalList = overviewData?.hospitals || [];

  const columns = [
    {
      header: 'Hospital Facility',
      key: 'hospital_name',
      render: (h) => (
        <div>
          <span className="font-bold text-slate-900">{h.hospital_name || h.hospital_id}</span>
          <span className="block text-[10px] text-slate-500 font-mono">ID: {h.hospital_id} | City: {h.city || 'Delhi'}</span>
        </div>
      ),
    },
    {
      header: 'OPD Waiting',
      key: 'opd_waiting_tokens',
      cellClassName: 'text-center font-mono',
      render: (h) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          (h.opd_waiting_tokens || 0) > 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
        }`}>
          {h.opd_waiting_tokens ?? 0} tokens
        </span>
      ),
    },
    {
      header: 'Observed Wait',
      key: 'opd_avg_wait_minutes',
      cellClassName: 'text-center font-mono',
      render: (h) => formatDurationMinutes(h.opd_avg_wait_minutes),
    },
    {
      header: 'Bed Capacity',
      key: 'beds',
      render: (h) => (
        <div className="text-xs">
          <span className="font-semibold text-emerald-800">{h.available_beds ?? 0} available</span>
          <span className="text-slate-500"> / {h.total_beds ?? 0} total</span>
          {h.icu_total_beds > 0 && (
            <span className="block text-[10px] text-purple-700 font-medium">ICU: {h.icu_available_beds}/{h.icu_total_beds}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Occupancy Rate',
      key: 'bed_occupancy_rate',
      render: (h) => {
        const rate = parseFloat(h.bed_occupancy_rate || 0);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full"
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {formatPercent(rate)}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Active Admissions',
      key: 'admissions_active',
      cellClassName: 'text-center font-mono font-semibold text-slate-800',
      render: (h) => h.admissions_active ?? 0,
    },
    {
      header: 'Supply Alerts',
      key: 'inventory_low_stock_count',
      cellClassName: 'text-center',
      render: (h) => (
        <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${
          (h.inventory_low_stock_count || 0) > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {h.inventory_low_stock_count ?? 0} low
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'action',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (h) => (
        <button
          onClick={() => onSelectHospital && onSelectHospital(h.hospital_id)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-terracotta-700 hover:text-terracotta-900"
        >
          <span>Console</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  if (loading && !overviewData) {
    return <LoadingState message="Loading city aggregate operational snapshot..." />;
  }

  if (error && !overviewData) {
    return <ErrorState title="Failed to Load City Overview" message={error} onRetry={loadCitySnapshots} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Operations Overview & Multi-Hospital Snapshot"
        subtitle="Periodic telemetry rollups from Table #17 city_aggregate_snapshot across simulated regional facilities"
        badge={overviewData?.is_stale ? 'SNAPSHOT STALE' : `PERIODIC BATCH (${overviewData?.snapshot_period || 'HOURLY'})`}
        actions={
          <div className="flex items-center gap-3">
            {overviewData?.snapshot_timestamp && (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Captured: {new Date(overviewData.snapshot_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {overviewData.age_minutes !== null && ` (${overviewData.age_minutes}m ago)`}
              </span>
            )}
            <button
              onClick={loadCitySnapshots}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Snapshot</span>
            </button>
          </div>
        }
      />

      {/* Staleness Warning if snapshot is old */}
      {overviewData?.is_stale && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Stale Snapshot Notice:</span> This municipal aggregate snapshot was generated more than 3 hours ago ({overviewData.age_minutes} minutes elapsed). Run the ETL background task (<code className="font-mono bg-amber-100 px-1 rounded">python etl/aggregate_city_snapshot.py</code>) to refresh municipal rollups.
          </div>
        </div>
      )}

      {/* Mandatory Approved Simulated Notice */}
      <div className="p-4 bg-terracotta-50 border border-terracotta-300 rounded text-xs text-terracotta-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-terracotta-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold uppercase tracking-wider text-terracotta-900">
            Simulated Reference Notice
          </h4>
          <p className="leading-relaxed font-medium">
            "Recent periodic snapshots indicate lower queue volume in Cardiology at GTB Hospital compared to LNJP Hospital. This is simulated demonstration guidance only; it does not reflect live hospital triage, emergency priority, or guaranteed bed/counter availability."
          </p>
          <p className="text-[11px] text-terracotta-800 pt-1">
            Do not imply live city-wide hospital availability. Table #17 <code className="font-mono bg-terracotta-100 px-1 rounded">city_aggregate_snapshot</code> records periodic batch aggregates only.
          </p>
        </div>
      </div>

      {/* Aggregate City KPIs (Read directly from Table #17 CITY-level record) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          title="Monitored Facilities"
          value={hospitalList.length}
          subtext="Simulated state facilities (LNJP, GTB, DDU)"
          icon={Building2}
        />
        <StatCard
          title="Total City Beds"
          value={cityTotals?.total_beds ?? 0}
          subtext={`${cityTotals?.available_beds ?? 0} available (${cityTotals?.bed_occupancy_rate ?? 0}% occupancy)`}
          icon={BedDouble}
          variant="info"
        />
        <StatCard
          title="City OPD Waiting"
          value={cityTotals?.opd_waiting_tokens ?? 0}
          subtext={`${cityTotals?.opd_active_counters ?? 0} active counters across city`}
          icon={Users}
          variant="warning"
        />
        <StatCard
          title="Inpatient Pipeline"
          value={cityTotals?.admissions_active ?? 0}
          subtext={`${cityTotals?.inventory_low_stock_count ?? 0} supply alerts citywide`}
          icon={Layers}
        />
      </div>

      {/* Cross-Facility Comparison Table (Read from Table #17 HOSPITAL-level records) */}
      <SectionCard
        title="Cross-Facility Operational Comparison (Table #17 Persisted Telemetry)"
        subtitle="Snapshot telemetry comparing patient queue volume, bed availability, and stock alerts by facility"
      >
        <DataTable
          columns={columns}
          data={hospitalList}
          keyExtractor={(h) => h.hospital_id}
          isLoading={loading}
          emptyTitle="No Snapshot Records Available"
          emptyMessage="Run the operational telemetry pipeline (python etl/aggregate_city_snapshot.py) to generate city-wide snapshots."
        />
      </SectionCard>
    </div>
  );
}
