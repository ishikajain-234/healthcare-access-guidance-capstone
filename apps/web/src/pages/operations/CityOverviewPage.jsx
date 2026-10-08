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
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import {
  getHospitals,
  getHospitalBedAvailability,
  getOpdTokens,
  getAdmissions,
} from '../../services/api';
import { formatPercent, formatDurationMinutes } from '../../utils/formatters';

export default function CityOverviewPage({
  onSelectHospital,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hospitalSummaries, setHospitalSummaries] = useState([]);

  const loadCitySnapshots = async () => {
    setLoading(true);
    setError(null);
    try {
      const hospRes = await getHospitals();
      const hospitals = hospRes.hospitals || [];

      // Fetch availability and tokens for each hospital
      const summaries = await Promise.all(
        hospitals.map(async (h) => {
          const [bedRes, tokenRes, admRes] = await Promise.all([
            getHospitalBedAvailability(h.hospital_id).catch(() => null),
            getOpdTokens({ hospital_id: h.hospital_id, limit: 100 }).catch(() => ({ tokens: [] })),
            getAdmissions({ hospital_id: h.hospital_id, limit: 100 }).catch(() => ({ admissions: [] })),
          ]);

          const tokens = tokenRes?.tokens || [];
          const waitingTokens = tokens.filter((t) => t.status === 'WAITING').length;
          const totalTokens = tokens.length;

          const admissions = admRes?.admissions || [];
          const activeAdmissions = admissions.filter((a) =>
            ['ADMISSION_REQUESTED', 'PENDING_REVIEW', 'BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED'].includes(a.status)
          ).length;

          return {
            hospital_id: h.hospital_id,
            hospital_name: h.hospital_name,
            hospital_code: h.hospital_code,
            city: h.city,
            total_beds: bedRes?.total_beds ?? 0,
            available_beds: bedRes?.available_beds ?? 0,
            occupied_beds: bedRes?.occupied_beds ?? 0,
            occupancy_rate: bedRes?.occupancy_rate ?? 0,
            opd_waiting: waitingTokens,
            opd_total: totalTokens,
            avg_wait_minutes: h.hospital_id.includes('GTB') ? 11.2 : 16.5,
            active_admissions: activeAdmissions,
            low_stock_items: 2,
          };
        })
      );

      setHospitalSummaries(summaries);
    } catch (err) {
      setError(err.message || 'Failed to aggregate city snapshots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitySnapshots();
  }, []);

  const columns = [
    {
      header: 'Hospital Facility',
      key: 'hospital_name',
      render: (h) => (
        <div>
          <span className="font-bold text-slate-900">{h.hospital_name}</span>
          <span className="block text-[10px] text-slate-500 font-mono">Code: {h.hospital_code}</span>
        </div>
      ),
    },
    {
      header: 'OPD Waiting',
      key: 'opd_waiting',
      cellClassName: 'text-center font-mono',
      render: (h) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          h.opd_waiting > 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
        }`}>
          {h.opd_waiting} tokens
        </span>
      ),
    },
    {
      header: 'Estimated Wait',
      key: 'avg_wait_minutes',
      cellClassName: 'text-center font-mono',
      render: (h) => formatDurationMinutes(h.avg_wait_minutes),
    },
    {
      header: 'Bed Capacity',
      key: 'beds',
      render: (h) => (
        <div className="text-xs">
          <span className="font-semibold text-emerald-800">{h.available_beds} available</span>
          <span className="text-slate-500"> / {h.total_beds} total</span>
        </div>
      ),
    },
    {
      header: 'Occupancy Rate',
      key: 'occupancy_rate',
      render: (h) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full"
              style={{ width: `${Math.min(h.occupancy_rate, 100)}%` }}
            />
          </div>
          <span className="font-mono font-bold text-slate-800 text-[11px]">
            {formatPercent(h.occupancy_rate)}
          </span>
        </div>
      ),
    },
    {
      header: 'Active Admissions',
      key: 'active_admissions',
      cellClassName: 'text-center font-mono font-semibold text-slate-800',
    },
    {
      header: 'Supply Alerts',
      key: 'low_stock_items',
      cellClassName: 'text-center',
      render: (h) => (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
          {h.low_stock_items} low
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
          <span>Switch Facility</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Operations Overview & Multi-Hospital Snapshot"
        subtitle="Cross-facility telemetry aggregation across simulated regional public hospitals"
        badge="SIMULATED PERIODIC SNAPSHOT"
        actions={
          <button
            onClick={loadCitySnapshots}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Snapshot</span>
          </button>
        }
      />

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

      {/* Aggregate City KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          title="Monitored Facilities"
          value={hospitalSummaries.length}
          subtext="Simulated state hospitals"
          icon={Building2}
        />
        <StatCard
          title="Total City Beds"
          value={hospitalSummaries.reduce((acc, h) => acc + h.total_beds, 0)}
          subtext={`${hospitalSummaries.reduce((acc, h) => acc + h.available_beds, 0)} available`}
          icon={BedDouble}
          variant="info"
        />
        <StatCard
          title="City OPD Queue"
          value={hospitalSummaries.reduce((acc, h) => acc + h.opd_waiting, 0)}
          subtext="Total currently waiting"
          icon={Users}
          variant="warning"
        />
        <StatCard
          title="Inpatient Pipeline"
          value={hospitalSummaries.reduce((acc, h) => acc + h.active_admissions, 0)}
          subtext="Active admissions across facilities"
          icon={Layers}
        />
      </div>

      {/* Cross-Facility Comparison Table */}
      <SectionCard
        title="Cross-Facility Operational Comparison"
        subtitle="Snapshot telemetry comparing patient queue volume, bed availability, and stock alerts"
      >
        <DataTable
          columns={columns}
          data={hospitalSummaries}
          keyExtractor={(h) => h.hospital_id}
          isLoading={loading}
          emptyTitle="No Regional Hospitals Found"
          emptyMessage="No hospitals registered in the demonstration database."
        />
      </SectionCard>
    </div>
  );
}
