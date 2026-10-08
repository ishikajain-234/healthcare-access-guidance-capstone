import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  RefreshCw,
  Sparkles,
  UserCheck,
  Wrench,
  RotateCcw,
  CheckCircle2,
  Lock,
  Filter,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  getHospitalWards,
  getHospitalBeds,
  getHospitalBedAvailability,
  reserveBed,
  occupyBed,
  cleanBed,
  releaseBed,
  outOfServiceBed,
  restoreBed,
} from '../../services/api';
import { formatPercent } from '../../utils/formatters';

export default function BedsPage({
  hospitalId,
  hospitalName,
}) {
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('ALL');
  const [beds, setBeds] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Transition confirmation dialog
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    confirmLabel: 'Confirm Transition',
    variant: 'primary',
  });

  // Load Wards
  useEffect(() => {
    async function loadWards() {
      if (!hospitalId) return;
      try {
        const res = await getHospitalWards(hospitalId);
        setWards(res.wards || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch wards.');
      }
    }
    loadWards();
  }, [hospitalId]);

  // Load Beds and Availability
  const loadBedData = async () => {
    if (!hospitalId) return;
    setLoading(true);
    setActionError(null);
    try {
      const wardParam = selectedWardId === 'ALL' ? null : selectedWardId;
      const [bedsRes, availRes] = await Promise.all([
        getHospitalBeds(hospitalId, wardParam),
        getHospitalBedAvailability(hospitalId),
      ]);
      setBeds(bedsRes.beds || []);
      setAvailability(availRes);
    } catch (err) {
      setError(err.message || 'Failed to load bed capacity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBedData();
  }, [hospitalId, selectedWardId]);

  // Execute FSM action
  const executeBedTransition = async (fn, bedId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn(bedId);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await loadBedData();
    } catch (err) {
      setActionError(err.message || 'Bed state transition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const avail = availability || {
    total_beds: 0,
    available_beds: 0,
    reserved_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
    out_of_service_beds: 0,
    occupancy_rate: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bed Availability & State Management"
        subtitle={`Real-time inpatient capacity and FSM status transitions for ${hospitalName || hospitalId}`}
        actions={
          <button
            onClick={loadBedData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Beds</span>
          </button>
        }
      />

      {/* Prominent Occupancy & Availability KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Beds</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{avail.total_beds}</span>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">Available</span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{avail.available_beds}</span>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">Reserved</span>
          <span className="text-xl font-bold text-amber-900 mt-0.5 block">{avail.reserved_beds}</span>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-800">Occupied</span>
          <span className="text-xl font-bold text-blue-900 mt-0.5 block">{avail.occupied_beds}</span>
        </div>
        <div className="p-3 bg-purple-50 border border-purple-200 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-800">Cleaning</span>
          <span className="text-xl font-bold text-purple-900 mt-0.5 block">{avail.cleaning_beds}</span>
        </div>
        <div className="p-3 bg-slate-100 border border-slate-300 rounded">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Out of Service</span>
          <span className="text-xl font-bold text-slate-800 mt-0.5 block">{avail.out_of_service_beds}</span>
        </div>
        <div className="p-3 bg-terracotta-50 border border-terracotta-300 rounded col-span-2 sm:col-span-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-terracotta-800">Occupancy Rate</span>
          <span className="text-xl font-bold text-terracotta-900 mt-0.5 block">
            {formatPercent(avail.occupancy_rate)}
          </span>
        </div>
      </div>

      {/* Ward Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Filter by Ward:
          </label>
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-terracotta-500"
          >
            <option value="ALL">All Hospital Wards</option>
            {wards.map((w) => (
              <option key={w.ward_id} value={w.ward_id}>
                {w.ward_name} ({w.ward_type}) - {w.total_capacity} beds
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{beds.length}</strong> bed units
        </div>
      </div>

      {actionError && (
        <ErrorState
          title="State Transition Rejected"
          message={actionError}
          onRetry={() => setActionError(null)}
        />
      )}

      {/* Bed Grid & FSM Controllers */}
      <SectionCard
        title="Bed Capacity Grid & State Controls"
        subtitle="Allowed FSM Paths: AVAILABLE ⇄ RESERVED ⇄ OCCUPIED → CLEANING → AVAILABLE &bull; AVAILABLE ⇄ OUT_OF_SERVICE"
      >
        {loading ? (
          <LoadingState message="Loading bed status..." minHeight="h-48" />
        ) : beds.length === 0 ? (
          <EmptyState
            title="No Beds Configured"
            description="There are no beds matching the current ward filter in this hospital."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {beds.map((b) => (
              <div
                key={b.bed_id}
                className="border border-slate-200 rounded bg-white p-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-mono">
                        {b.bed_number}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {b.ward_name} &bull; <span className="font-semibold">{b.ward_type}</span>
                      </p>
                    </div>
                    <StatusBadge type="bed" status={b.current_state} size="xs" />
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 mt-2 truncate">
                    ID: {b.bed_id}
                  </p>
                </div>

                {/* Valid FSM Transition Actions for current state */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  {/* AVAILABLE: Reserve / Out of service */}
                  {b.current_state === 'AVAILABLE' && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: `Reserve Bed ${b.bed_number}`,
                            message: `Hold bed ${b.bed_number} for an incoming inpatient admission?`,
                            confirmLabel: 'Reserve Bed',
                            variant: 'primary',
                            action: () => executeBedTransition(reserveBed, b.bed_id),
                          })
                        }
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 transition"
                      >
                        Reserve
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: `Take Bed ${b.bed_number} Out of Service`,
                            message: `Mark bed ${b.bed_number} as OUT_OF_SERVICE for technical maintenance?`,
                            confirmLabel: 'Out of Service',
                            variant: 'warning',
                            action: () => executeBedTransition(outOfServiceBed, b.bed_id),
                          })
                        }
                        className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                      >
                        Out of Service
                      </button>
                    </>
                  )}

                  {/* RESERVED: Occupy / Release */}
                  {b.current_state === 'RESERVED' && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: `Occupy Bed ${b.bed_number}`,
                            message: `Confirm patient intake and move bed ${b.bed_number} to OCCUPIED?`,
                            confirmLabel: 'Occupy Bed',
                            variant: 'primary',
                            action: () => executeBedTransition(occupyBed, b.bed_id),
                          })
                        }
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Occupy
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: `Release Reserved Bed ${b.bed_number}`,
                            message: `Release reservation on bed ${b.bed_number} and return it to AVAILABLE?`,
                            confirmLabel: 'Release Reservation',
                            variant: 'warning',
                            action: () => executeBedTransition(releaseBed, b.bed_id),
                          })
                        }
                        className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                      >
                        Release
                      </button>
                    </>
                  )}

                  {/* OCCUPIED: Clean */}
                  {b.current_state === 'OCCUPIED' && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: `Initiate Cleaning for Bed ${b.bed_number}`,
                          message: `Discharge patient and move bed ${b.bed_number} to CLEANING protocol? (Note: Admitted patients must undergo discharge workflow on Admissions page).`,
                          confirmLabel: 'Move to Cleaning',
                          variant: 'primary',
                          action: () => executeBedTransition(cleanBed, b.bed_id),
                        })
                      }
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-purple-600 text-white hover:bg-purple-700 transition"
                    >
                      Clean Bed
                    </button>
                  )}

                  {/* CLEANING: Release */}
                  {b.current_state === 'CLEANING' && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: `Release Cleaned Bed ${b.bed_number}`,
                          message: `Confirm sanitation completion and return bed ${b.bed_number} to AVAILABLE for intake?`,
                          confirmLabel: 'Release to Available',
                          variant: 'primary',
                          action: () => executeBedTransition(releaseBed, b.bed_id),
                        })
                      }
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      Complete Cleaning
                    </button>
                  )}

                  {/* OUT_OF_SERVICE: Restore */}
                  {b.current_state === 'OUT_OF_SERVICE' && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          title: `Restore Bed ${b.bed_number}`,
                          message: `Maintenance complete. Restore bed ${b.bed_number} back to operational AVAILABLE status?`,
                          confirmLabel: 'Restore Bed',
                          variant: 'primary',
                          action: () => executeBedTransition(restoreBed, b.bed_id),
                        })
                      }
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      Restore to Service
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.variant}
        isLoading={actionLoading}
      />
    </div>
  );
}
