import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BedDouble,
  UserCheck,
  AlertCircle,
  Link,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  getAdmissions,
  getHospitalWards,
  getHospitalBeds,
  createAdmission,
  markAdmissionPendingReview,
  assignAdmissionBed,
  confirmAdmission,
  admitPatient,
  dischargePatient,
  cancelAdmission,
} from '../../services/api';
import { formatDateTime, formatTime, getAdmissionStatusConfig } from '../../utils/formatters';

export default function AdmissionsPage({
  hospitalId,
  hospitalName,
}) {
  const [admissions, setAdmissions] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state
  const [selectedWardId, setSelectedWardId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Create Admission Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWardId, setNewWardId] = useState('');
  const [linkedTokenId, setLinkedTokenId] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');

  // Assign Bed Modal
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    admission: null,
    availableBeds: [],
    selectedBedId: '',
    loadingBeds: false,
  });

  // Confirm Transition Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm Transition',
    variant: 'primary',
    action: null,
  });

  // Load Wards
  useEffect(() => {
    async function loadWards() {
      if (!hospitalId) return;
      try {
        const res = await getHospitalWards(hospitalId);
        const wList = res.wards || [];
        setWards(wList);
        if (wList.length > 0) {
          setNewWardId(wList[0].ward_id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load hospital wards.');
      }
    }
    loadWards();
  }, [hospitalId]);

  // Load Admissions
  const loadAdmissionsData = async () => {
    if (!hospitalId) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await getAdmissions({
        hospital_id: hospitalId,
        ward_id: selectedWardId === 'ALL' ? null : selectedWardId,
        status: selectedStatus === 'ALL' ? null : selectedStatus,
        limit: 100,
      });
      setAdmissions(res.admissions || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch admissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissionsData();
  }, [hospitalId, selectedWardId, selectedStatus]);

  // Handle Admission Creation (Strict Zero-PII)
  const handleCreateAdmission = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await createAdmission({
        hospital_id: hospitalId,
        ward_id: newWardId,
        linked_token_id: linkedTokenId.trim() || null,
        notes: intakeNotes.trim() || null,
      });
      setCreateModalOpen(false);
      setLinkedTokenId('');
      setIntakeNotes('');
      await loadAdmissionsData();
    } catch (err) {
      setActionError(err.message || 'Failed to initiate admission request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Bed Assignment Modal
  const handleOpenAssignModal = async (adm) => {
    setAssignModal({
      isOpen: true,
      admission: adm,
      availableBeds: [],
      selectedBedId: '',
      loadingBeds: true,
    });
    try {
      const res = await getHospitalBeds(hospitalId, adm.ward_id);
      const availBeds = (res.beds || []).filter((b) => b.current_state === 'AVAILABLE');
      setAssignModal((prev) => ({
        ...prev,
        availableBeds: availBeds,
        selectedBedId: availBeds.length > 0 ? availBeds[0].bed_id : '',
        loadingBeds: false,
      }));
    } catch (err) {
      setActionError(err.message || 'Failed to fetch available beds.');
      setAssignModal((prev) => ({ ...prev, loadingBeds: false }));
    }
  };

  const handleAssignBedSubmit = async (e) => {
    e.preventDefault();
    if (!assignModal.selectedBedId || !assignModal.admission) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await assignAdmissionBed(assignModal.admission.admission_id, assignModal.selectedBedId);
      setAssignModal({ isOpen: false, admission: null, availableBeds: [], selectedBedId: '', loadingBeds: false });
      await loadAdmissionsData();
    } catch (err) {
      setActionError(err.message || 'Failed to assign bed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute State Transition
  const executeTransition = async (fn, admissionId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn(admissionId);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await loadAdmissionsData();
    } catch (err) {
      setActionError(err.message || 'Transition execution failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow visual tracker steps
  const workflowSteps = [
    { key: 'ADMISSION_REQUESTED', label: '1. Requested' },
    { key: 'PENDING_REVIEW', label: '2. Pending Review' },
    { key: 'BED_ASSIGNED', label: '3. Bed Assigned' },
    { key: 'ADMISSION_CONFIRMED', label: '4. Confirmed' },
    { key: 'ADMITTED', label: '5. Admitted' },
    { key: 'DISCHARGED', label: '6. Discharged' },
  ];

  // Table Columns
  const columns = [
    {
      header: 'Admission #',
      key: 'admission_number',
      cellClassName: 'font-mono font-bold text-slate-900',
      render: (a) => (
        <div>
          <span>{a.admission_number}</span>
          {a.notes && (
            <p className="text-[10px] text-slate-500 font-normal truncate max-w-xs">{a.notes}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Ward',
      key: 'ward_name',
      render: (a) => (
        <div>
          <span className="font-medium text-slate-800">{a.ward_name}</span>
          <span className="block text-[10px] text-slate-500">{a.ward_type}</span>
        </div>
      ),
    },
    {
      header: 'Bed Unit',
      key: 'bed_number',
      cellClassName: 'font-mono text-slate-800',
      render: (a) => (
        a.bed_number ? (
          <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 font-semibold">
            {a.bed_number}
          </span>
        ) : (
          <span className="text-slate-400 italic">Unassigned</span>
        )
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (a) => <StatusBadge type="admission" status={a.status} size="xs" />,
    },
    {
      header: 'OPD Link (0..1)',
      key: 'linked_token_id',
      render: (a) =>
        a.linked_token_id ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
            <Link className="w-3 h-3" />
            <span>{a.linked_token_number || a.linked_token_id.slice(0, 8)}</span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono">Autonomous</span>
        ),
    },
    {
      header: 'Requested At',
      key: 'requested_at',
      cellClassName: 'font-mono text-slate-600',
      render: (a) => formatDateTime(a.requested_at),
    },
    {
      header: 'Actions',
      key: 'actions',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* ADMISSION_REQUESTED: Review / Cancel */}
          {a.status === 'ADMISSION_REQUESTED' && (
            <>
              <button
                onClick={() =>
                  executeTransition(markAdmissionPendingReview, a.admission_id)
                }
                className="px-2 py-1 text-[11px] font-semibold rounded bg-orange-600 text-white hover:bg-orange-700 transition"
              >
                Review
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: `Cancel Admission ${a.admission_number}`,
                    message: 'Cancel this admission request? (Administrative operational cancellation).',
                    confirmLabel: 'Cancel Request',
                    variant: 'danger',
                    action: () => executeTransition(cancelAdmission, a.admission_id),
                  })
                }
                className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          )}

          {/* PENDING_REVIEW: Assign Bed / Cancel */}
          {a.status === 'PENDING_REVIEW' && (
            <>
              <button
                onClick={() => handleOpenAssignModal(a)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                <BedDouble className="w-3 h-3" />
                <span>Assign Bed</span>
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: `Cancel Admission ${a.admission_number}`,
                    message: 'Cancel this admission during review stage? (Operational cancellation).',
                    confirmLabel: 'Cancel Admission',
                    variant: 'danger',
                    action: () => executeTransition(cancelAdmission, a.admission_id),
                  })
                }
                className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          )}

          {/* BED_ASSIGNED: Confirm / Cancel */}
          {a.status === 'BED_ASSIGNED' && (
            <>
              <button
                onClick={() => executeTransition(confirmAdmission, a.admission_id)}
                className="px-2 py-1 text-[11px] font-semibold rounded bg-cyan-600 text-white hover:bg-cyan-700 transition"
              >
                Confirm
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: `Cancel Admission ${a.admission_number}`,
                    message: `Cancel this admission? Bed ${a.bed_number} will be released back to AVAILABLE.`,
                    confirmLabel: 'Cancel & Free Bed',
                    variant: 'warning',
                    action: () => executeTransition(cancelAdmission, a.admission_id),
                  })
                }
                className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          )}

          {/* ADMISSION_CONFIRMED: Admit / Cancel */}
          {a.status === 'ADMISSION_CONFIRMED' && (
            <>
              <button
                onClick={() => executeTransition(admitPatient, a.admission_id)}
                className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Admit Patient
              </button>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: `Cancel Confirmed Admission ${a.admission_number}`,
                    message: `Cancel confirmed admission? Reserved bed ${a.bed_number} will be released back to AVAILABLE.`,
                    confirmLabel: 'Cancel Admission',
                    variant: 'warning',
                    action: () => executeTransition(cancelAdmission, a.admission_id),
                  })
                }
                className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          )}

          {/* ADMITTED: Discharge */}
          {a.status === 'ADMITTED' && (
            <button
              onClick={() =>
                setConfirmModal({
                  isOpen: true,
                  title: `Discharge Patient ${a.admission_number}`,
                  message: `Complete inpatient discharge? Admission moves to DISCHARGED, and bed ${a.bed_number} transitions automatically to CLEANING protocol.`,
                  confirmLabel: 'Discharge Patient',
                  variant: 'primary',
                  action: () => executeTransition(dischargePatient, a.admission_id),
                })
              }
              className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Discharge
            </button>
          )}

          {(a.status === 'DISCHARGED' || a.status === 'CANCELLED') && (
            <span className="text-[11px] text-slate-400 font-mono italic">
              Terminal
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inpatient Admission Coordination"
        subtitle={`Bed allocation workflow and lifecycle tracking for ${hospitalName || hospitalId}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-terracotta-600 text-white hover:bg-terracotta-700 transition shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Admission Request</span>
            </button>
            <button
              onClick={loadAdmissionsData}
              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white hover:bg-slate-50"
              title="Refresh admissions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Visual Workflow Diagram */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          Frozen Inpatient Lifecycle Workflow
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          {workflowSteps.map((step, idx) => (
            <div
              key={step.key}
              className="p-2 rounded bg-slate-50 border border-slate-200 flex flex-col items-center justify-center"
            >
              <span className="font-semibold text-slate-800">{step.label}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {step.key === 'BED_ASSIGNED' ? 'Bed Reserved' : step.key === 'ADMITTED' ? 'Bed Occupied' : step.key === 'DISCHARGED' ? 'Bed to Cleaning' : 'Queue State'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          &bull; <strong>Operational Cancellation:</strong> Permitted from non-admitted states as an administrative workflow action (not a clinical triage decision). Releases any reserved bed back to AVAILABLE.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Ward:</label>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
            >
              <option value="ALL">All Wards</option>
              {wards.map((w) => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.ward_name} ({w.ward_type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
            >
              <option value="ALL">All States</option>
              <option value="ADMISSION_REQUESTED">ADMISSION_REQUESTED</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="BED_ASSIGNED">BED_ASSIGNED</option>
              <option value="ADMISSION_CONFIRMED">ADMISSION_CONFIRMED</option>
              <option value="ADMITTED">ADMITTED</option>
              <option value="DISCHARGED">DISCHARGED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{admissions.length}</strong> admissions
        </div>
      </div>

      {actionError && (
        <ErrorState
          title="Operation Rejected"
          message={actionError}
          onRetry={() => setActionError(null)}
        />
      )}

      {/* Admissions Table */}
      <SectionCard
        title="Inpatient Admissions Ledger"
        subtitle="Synthetic-safe operational records &bull; Strictly zero patient PII"
      >
        <DataTable
          columns={columns}
          data={admissions}
          keyExtractor={(a) => a.admission_id}
          isLoading={loading}
          emptyTitle="No Inpatient Admissions"
          emptyMessage="No admission records found for the selected ward and status filters. Click 'Create Admission Request' to initiate patient intake."
          emptyAction={
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-terracotta-600 text-white hover:bg-terracotta-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Admission</span>
            </button>
          }
        />
      </SectionCard>

      {/* Modal: Create Admission */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Initiate Inpatient Admission Request"
        subtitle="Zero-PII synthetic admission record"
      >
        <form onSubmit={handleCreateAdmission} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <p>
              <strong>Zero-PII Compliance Gate:</strong> Do NOT enter patient names, Aadhaar, contact details, medical diagnosis, or symptoms. Synthetic identifiers only.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Ward
            </label>
            <select
              required
              value={newWardId}
              onChange={(e) => setNewWardId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-800"
            >
              {wards.map((w) => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.ward_name} ({w.ward_type}) - Capacity: {w.total_capacity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Linked OPD Token UUID (Optional 0..1 Bridge)
            </label>
            <input
              type="text"
              value={linkedTokenId}
              onChange={(e) => setLinkedTokenId(e.target.value)}
              placeholder="e.g. 703c6971-73d9-4d95-87a2-45001f6520e3"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank for autonomous admissions originating outside OPD (e.g. direct referral).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Notes (Administrative Only)
            </label>
            <input
              type="text"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              placeholder="e.g. Post-OPD inpatient intake demo"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-terracotta-600 text-white hover:bg-terracotta-700 disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : 'Initiate Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Bed */}
      <Modal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal({ isOpen: false, admission: null, availableBeds: [], selectedBedId: '', loadingBeds: false })}
        title={`Assign Bed to ${assignModal.admission?.admission_number}`}
        subtitle={`Select an available bed in ${assignModal.admission?.ward_name || 'ward'}`}
      >
        <form onSubmit={handleAssignBedSubmit} className="space-y-4">
          {assignModal.loadingBeds ? (
            <LoadingState message="Checking available sanitized beds..." minHeight="h-32" />
          ) : assignModal.availableBeds.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-center">
              <p className="text-xs font-semibold text-amber-900">
                No AVAILABLE beds in this ward!
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                All beds in this ward are currently reserved, occupied, or cleaning. Please clean a bed or select another ward.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Available Bed Unit:
              </label>
              <select
                required
                value={assignModal.selectedBedId}
                onChange={(e) => setAssignModal((prev) => ({ ...prev, selectedBedId: e.target.value }))}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 font-mono font-semibold"
              >
                {assignModal.availableBeds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_number} (State: {b.current_state}) - ID: {b.bed_id}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Assigning this bed will atomically transition it to RESERVED and update admission to BED_ASSIGNED.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModal({ isOpen: false, admission: null, availableBeds: [], selectedBedId: '', loadingBeds: false })}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || assignModal.availableBeds.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {actionLoading ? 'Assigning...' : 'Assign Bed'}
            </button>
          </div>
        </form>
      </Modal>

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
