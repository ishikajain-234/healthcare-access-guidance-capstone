import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Sliders,
  ArrowRightLeft,
  RefreshCw,
  Shield,
  Layers,
  History,
  Info,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusBadge from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import {
  getInventoryItems,
  getInventoryAvailability,
  getInventoryTransactions,
  receiveStock,
  issueStock,
  adjustStock,
  transferInStock,
  transferOutStock,
} from '../../services/api';
import { formatDateTime, formatTime } from '../../utils/formatters';

export default function InventoryPage({
  hospitalId,
  hospitalName,
}) {
  const [items, setItems] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('ALL');

  // Transaction Modal State
  const [txModal, setTxModal] = useState({
    isOpen: false,
    item: null,
    actionType: 'RECEIPT', // RECEIPT, ISSUE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT
    quantity: 10,
    adjustmentQuantity: 0,
    batchNumber: 'BATCH-2026-A',
    linkedTokenId: '',
    auditReason: 'Routine replenishment from central warehouse',
  });

  const loadInventoryData = async () => {
    if (!hospitalId) return;
    setLoading(true);
    setActionError(null);
    try {
      const [itemsRes, availRes, txRes] = await Promise.all([
        getInventoryItems({ hospital_id: hospitalId, limit: 100 }),
        getInventoryAvailability({ hospital_id: hospitalId }),
        getInventoryTransactions({ hospital_id: hospitalId, limit: 25 }).catch(() => ({ transactions: [] })),
      ]);

      setItems(itemsRes.items || []);
      setAvailability(availRes);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, [hospitalId]);

  const handleOpenTxModal = (item, actionType) => {
    let defaultReason = 'Routine dispensary operation';
    if (actionType === 'RECEIPT') defaultReason = 'Restocking from medical stores';
    else if (actionType === 'ISSUE') defaultReason = 'Ward dispensary issue for patient intake';
    else if (actionType === 'ADJUSTMENT') defaultReason = 'Physical stock audit adjustment';
    else if (actionType === 'TRANSFER_IN') defaultReason = 'Inter-facility transfer intake';
    else if (actionType === 'TRANSFER_OUT') defaultReason = 'Regional redistribution dispatch';

    setTxModal({
      isOpen: true,
      item,
      actionType,
      quantity: 10,
      adjustmentQuantity: actionType === 'ADJUSTMENT' ? -5 : 0,
      batchNumber: 'BATCH-2026-01',
      linkedTokenId: '',
      auditReason: defaultReason,
    });
  };

  const handleExecuteTransaction = async (e) => {
    e.preventDefault();
    if (!txModal.item) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const itemId = txModal.item.item_id;

      if (txModal.actionType === 'RECEIPT') {
        await receiveStock(itemId, {
          quantity: Number(txModal.quantity),
          batch_number: txModal.batchNumber,
          audit_reason: txModal.auditReason,
        });
      } else if (txModal.actionType === 'ISSUE') {
        await issueStock(itemId, {
          quantity: Number(txModal.quantity),
          batch_number: txModal.batchNumber,
          linked_token_id: txModal.linkedTokenId.trim() || null,
          audit_reason: txModal.auditReason,
        });
      } else if (txModal.actionType === 'ADJUSTMENT') {
        await adjustStock(itemId, {
          adjustment_quantity: Number(txModal.adjustmentQuantity),
          batch_number: txModal.batchNumber,
          audit_reason: txModal.auditReason,
        });
      } else if (txModal.actionType === 'TRANSFER_IN') {
        await transferInStock(itemId, {
          quantity: Number(txModal.quantity),
          batch_number: txModal.batchNumber,
          audit_reason: txModal.auditReason,
        });
      } else if (txModal.actionType === 'TRANSFER_OUT') {
        await transferOutStock(itemId, {
          quantity: Number(txModal.quantity),
          batch_number: txModal.batchNumber,
          audit_reason: txModal.auditReason,
        });
      }

      setTxModal((prev) => ({ ...prev, isOpen: false }));
      await loadInventoryData();
    } catch (err) {
      setActionError(err.message || 'Inventory transaction failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'LOW') return item.stock_status === 'LOW_STOCK' || item.stock_status === 'OUT_OF_STOCK';
    return item.item_type === filterType;
  });

  const avail = availability || {
    total_items: items.length,
    in_stock_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
  };

  const columns = [
    {
      header: 'Item Code',
      key: 'item_code',
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    {
      header: 'Item Display Name',
      key: 'item_name',
      render: (i) => (
        <div>
          <span className="font-medium text-slate-800">{i.item_name}</span>
          <span className="block text-[10px] text-slate-500 font-mono">ID: {i.item_id}</span>
        </div>
      ),
    },
    {
      header: 'Category / Type',
      key: 'item_type',
      cellClassName: 'text-slate-600 font-medium',
    },
    {
      header: 'Unit',
      key: 'unit_of_measure',
      cellClassName: 'font-mono text-slate-600',
    },
    {
      header: 'Current Stock',
      key: 'current_stock',
      cellClassName: 'font-mono font-bold',
      render: (i) => (
        <span
          className={
            i.stock_status === 'OUT_OF_STOCK'
              ? 'text-rose-600 font-bold'
              : i.stock_status === 'LOW_STOCK'
              ? 'text-amber-600 font-bold'
              : 'text-slate-900'
          }
        >
          {i.current_stock}
        </span>
      ),
    },
    {
      header: 'Threshold',
      key: 'reorder_threshold',
      cellClassName: 'font-mono text-slate-600',
      render: (i) => `${i.reorder_threshold} ${i.unit_of_measure}`,
    },
    {
      header: 'Status',
      key: 'stock_status',
      render: (i) => <StatusBadge type="inventory" status={i.stock_status} size="xs" />,
    },
    {
      header: 'Operational Actions',
      key: 'actions',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenTxModal(i, 'RECEIPT')}
            className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
            title="Receive Stock"
          >
            + Receive
          </button>
          <button
            onClick={() => handleOpenTxModal(i, 'ISSUE')}
            disabled={i.current_stock === 0}
            className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 disabled:opacity-40 transition"
            title="Issue Stock"
          >
            - Issue
          </button>
          <button
            onClick={() => handleOpenTxModal(i, 'ADJUSTMENT')}
            className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100 transition"
            title="Adjust Stock"
          >
            Adjust
          </button>
        </div>
      ),
    },
  ];

  const txColumns = [
    {
      header: 'Type',
      key: 'transaction_type',
      cellClassName: 'font-mono font-bold text-xs',
      render: (tx) => {
        const isPositive = ['RECEIPT', 'TRANSFER_IN'].includes(tx.transaction_type);
        return (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {tx.transaction_type}
          </span>
        );
      },
    },
    {
      header: 'Item',
      key: 'item_id',
      cellClassName: 'font-mono text-slate-800 text-xs',
    },
    {
      header: 'Quantity',
      key: 'quantity',
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    {
      header: 'Batch',
      key: 'batch_number',
      cellClassName: 'font-mono text-slate-600 text-[11px]',
    },
    {
      header: 'OPD Token Link',
      key: 'linked_token_id',
      cellClassName: 'font-mono text-indigo-700 text-[11px]',
      render: (tx) => (tx.linked_token_id ? tx.linked_token_id.slice(0, 8) + '...' : '—'),
    },
    {
      header: 'Audit Reason',
      key: 'audit_reason',
      cellClassName: 'text-slate-600 text-xs truncate max-w-xs',
    },
    {
      header: 'Committed At',
      key: 'created_at',
      cellClassName: 'font-mono text-slate-500 text-[11px]',
      render: (tx) => formatDateTime(tx.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Essential Hospital Inventory & Stock"
        subtitle={`Synthetic medical supply management and append-only ledger for ${hospitalName || hospitalId}`}
        actions={
          <button
            onClick={loadInventoryData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stock</span>
          </button>
        }
      />

      {/* Stock KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Monitored Items"
          value={avail.total_items}
          subtext="Active synthetic catalogue"
          icon={Package}
        />
        <StatCard
          title="In Stock"
          value={avail.in_stock_items}
          subtext="Stock &gt; reorder threshold"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Low Stock Warning"
          value={avail.low_stock_items}
          subtext="Stock &le; threshold"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={avail.out_of_stock_items}
          subtext="Stock = 0 (Immediate replenishment)"
          icon={XCircle}
          variant="terracotta"
        />
      </div>

      {actionError && (
        <ErrorState
          title="Inventory Operation Rejected"
          message={actionError}
          onRetry={() => setActionError(null)}
        />
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <label className="font-bold uppercase tracking-wider text-slate-600">Filter Items:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 bg-white"
          >
            <option value="ALL">All Items ({items.length})</option>
            <option value="MEDICINE">Synthetic Medicines</option>
            <option value="CONSUMABLE">Consumables</option>
            <option value="LOW">Low / Out of Stock Alerts ({avail.low_stock_items + avail.out_of_stock_items})</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredItems.length}</strong> items
        </span>
      </div>

      {/* Inventory Table */}
      <SectionCard
        title="Dispensary Inventory Master"
        subtitle="Real-time stock balance &bull; Zero real medicines or clinical dosage semantics"
      >
        <DataTable
          columns={columns}
          data={filteredItems}
          keyExtractor={(item) => item.item_id}
          isLoading={loading}
          emptyTitle="No Inventory Items Found"
          emptyMessage="No inventory items are registered for this hospital in the database."
        />
      </SectionCard>

      {/* Append-Only Transaction Audit Ledger */}
      <SectionCard
        title="Append-Only Inventory Transaction Ledger"
        subtitle="Immutable database audit trail (Migration 009) &bull; Mutations strictly prevented by DB trigger"
      >
        <DataTable
          columns={txColumns}
          data={transactions}
          keyExtractor={(tx) => tx.transaction_id}
          emptyTitle="No Ledger Transactions Recorded"
          emptyMessage="No stock movements have occurred for this hospital yet. Perform a Receive, Issue, or Adjust action above to record an immutable transaction."
        />
      </SectionCard>

      {/* Modal: Record Stock Transaction */}
      <Modal
        isOpen={txModal.isOpen}
        onClose={() => setTxModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Record ${txModal.actionType} — ${txModal.item?.item_name}`}
        subtitle={`Current Stock: ${txModal.item?.current_stock} ${txModal.item?.unit_of_measure}`}
      >
        <form onSubmit={handleExecuteTransaction} className="space-y-4">
          {txModal.actionType === 'ADJUSTMENT' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Signed Adjustment Quantity (Positive or Negative):
              </label>
              <input
                type="number"
                required
                value={txModal.adjustmentQuantity}
                onChange={(e) => setTxModal((prev) => ({ ...prev, adjustmentQuantity: e.target.value }))}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Use negative number to decrease stock (e.g. -5 for damage), or positive to increase (e.g. +10 for found count).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity ({txModal.item?.unit_of_measure}):
              </label>
              <input
                type="number"
                min="1"
                required
                value={txModal.quantity}
                onChange={(e) => setTxModal((prev) => ({ ...prev, quantity: e.target.value }))}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batch / Lot Identifier:
            </label>
            <input
              type="text"
              value={txModal.batchNumber}
              onChange={(e) => setTxModal((prev) => ({ ...prev, batchNumber: e.target.value }))}
              placeholder="e.g. BATCH-2026-01"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 font-mono text-slate-800"
            />
          </div>

          {txModal.actionType === 'ISSUE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Linked OPD Token UUID (Optional 0..N Link):
              </label>
              <input
                type="text"
                value={txModal.linkedTokenId}
                onChange={(e) => setTxModal((prev) => ({ ...prev, linkedTokenId: e.target.value }))}
                placeholder="e.g. 703c6971-73d9-4d95-87a2-45001f6520e3"
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Optional: Associate this issue with an OPD patient token from the same hospital.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Reason (Required):
            </label>
            <input
              type="text"
              required
              minLength="3"
              value={txModal.auditReason}
              onChange={(e) => setTxModal((prev) => ({ ...prev, auditReason: e.target.value }))}
              placeholder="e.g. Ward consumption, restocking shipment"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 text-slate-800"
            />
          </div>

          {actionError && (
            <p className="text-xs text-rose-600 font-mono">{actionError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTxModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-terracotta-600 text-white hover:bg-terracotta-700 disabled:opacity-50"
            >
              {actionLoading ? 'Recording...' : `Commit ${txModal.actionType}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
