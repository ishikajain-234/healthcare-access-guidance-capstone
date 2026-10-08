import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Layers,
  Shield,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusBadge from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';

export default function InventoryPage({
  hospitalId,
  hospitalName,
}) {
  const [filterType, setFilterType] = useState('ALL');

  // The 8 approved synthetic demonstration items specified in Migration 008
  const syntheticInventoryItems = [
    {
      code: 'MED-SYN-001',
      name: 'Synthetic Paracetamol Tablet (Demo)',
      type: 'SYNTHETIC MEDICINE',
      unit: 'STRIP (10 TAB)',
      stock: 45,
      threshold: 50,
      status: 'LOW_STOCK',
      simulated: true,
    },
    {
      code: 'MED-SYN-002',
      name: 'Synthetic Amoxicillin Capsule (Demo)',
      type: 'SYNTHETIC MEDICINE',
      unit: 'STRIP (10 CAP)',
      stock: 120,
      threshold: 30,
      status: 'IN_STOCK',
      simulated: true,
    },
    {
      code: 'MED-SYN-003',
      name: 'Synthetic Metformin Tablet (Demo)',
      type: 'SYNTHETIC MEDICINE',
      unit: 'STRIP (10 TAB)',
      stock: 80,
      threshold: 40,
      status: 'IN_STOCK',
      simulated: true,
    },
    {
      code: 'MED-SYN-004',
      name: 'Synthetic ORS Sachet (Demo)',
      type: 'SYNTHETIC MEDICINE',
      unit: 'SACHET',
      stock: 250,
      threshold: 50,
      status: 'IN_STOCK',
      simulated: true,
    },
    {
      code: 'CON-SYN-001',
      name: 'Synthetic Examination Gloves (Demo)',
      type: 'CONSUMABLE',
      unit: 'BOX (100 PCS)',
      stock: 15,
      threshold: 20,
      status: 'LOW_STOCK',
      simulated: true,
    },
    {
      code: 'CON-SYN-002',
      name: 'Synthetic Surgical Face Masks (Demo)',
      type: 'CONSUMABLE',
      unit: 'BOX (50 PCS)',
      stock: 95,
      threshold: 25,
      status: 'IN_STOCK',
      simulated: true,
    },
    {
      code: 'CON-SYN-003',
      name: 'Synthetic Sterile Gauze Swab (Demo)',
      type: 'CONSUMABLE',
      unit: 'PACK (10 PCS)',
      stock: 60,
      threshold: 30,
      status: 'IN_STOCK',
      simulated: true,
    },
    {
      code: 'CON-SYN-004',
      name: 'Synthetic IV Infusion Set (Demo)',
      type: 'CONSUMABLE',
      unit: 'UNIT',
      stock: 0,
      threshold: 15,
      status: 'OUT_OF_STOCK',
      simulated: true,
    },
  ];

  const filteredItems = syntheticInventoryItems.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'LOW') return item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK';
    return item.type === filterType;
  });

  const inStockCount = syntheticInventoryItems.filter((i) => i.status === 'IN_STOCK').length;
  const lowStockCount = syntheticInventoryItems.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStockCount = syntheticInventoryItems.filter((i) => i.status === 'OUT_OF_STOCK').length;

  const columns = [
    {
      header: 'Item Code',
      key: 'code',
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    {
      header: 'Item Display Name',
      key: 'name',
      render: (i) => (
        <div>
          <span className="font-medium text-slate-800">{i.name}</span>
          <span className="block text-[10px] text-slate-500 font-mono">Simulated Safe Identifier</span>
        </div>
      ),
    },
    {
      header: 'Category / Type',
      key: 'type',
      cellClassName: 'text-slate-600 font-medium',
    },
    {
      header: 'Unit',
      key: 'unit',
      cellClassName: 'font-mono text-slate-600',
    },
    {
      header: 'Current Stock',
      key: 'stock',
      cellClassName: 'font-mono font-bold',
      render: (i) => (
        <span
          className={
            i.status === 'OUT_OF_STOCK'
              ? 'text-rose-600 font-bold'
              : i.status === 'LOW_STOCK'
              ? 'text-amber-600 font-bold'
              : 'text-slate-900'
          }
        >
          {i.stock}
        </span>
      ),
    },
    {
      header: 'Reorder Threshold',
      key: 'threshold',
      cellClassName: 'font-mono text-slate-600',
      render: (i) => `${i.threshold} ${i.unit.split(' ')[0]}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (i) => <StatusBadge type="inventory" status={i.status} size="xs" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Essential Hospital Inventory & Stock"
        subtitle={`Synthetic medical supply and consumable tracking for ${hospitalName || hospitalId}`}
      />

      {/* Backend API Vertical Slice Notice */}
      <div className="p-4 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold uppercase tracking-wider text-slate-900">
            Backend Architecture Status Notice
          </h4>
          <p className="mt-1 text-slate-600 leading-relaxed">
            Database schema for inventory is completely frozen (Table #15 <code className="font-mono bg-slate-200 px-1 rounded">inventory_item</code> in Migration 008 and Table #16 <code className="font-mono bg-slate-200 px-1 rounded">inventory_transaction</code> in Migration 009). The HTTP REST API controllers for inventory are pending implementation in the backend service layer.
          </p>
          <p className="mt-1 text-slate-500 text-[11px]">
            Displaying the 8 approved synthetic demo items matching the frozen schema specification. Zero clinical dosages or real medicines.
          </p>
        </div>
      </div>

      {/* Stock KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Synthetic Items"
          value={syntheticInventoryItems.length}
          subtext="Approved demo inventory catalogue"
          icon={Package}
        />
        <StatCard
          title="In Stock"
          value={inStockCount}
          subtext="Stock &ge; reorder threshold"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Low Stock Warning"
          value={lowStockCount}
          subtext="Current stock &le; threshold"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Out of Stock"
          value={outOfStockCount}
          subtext="Immediate restock required"
          icon={XCircle}
          variant="terracotta"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <label className="font-bold uppercase tracking-wider text-slate-600">Filter Items:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 bg-white"
          >
            <option value="ALL">All Items (8)</option>
            <option value="SYNTHETIC MEDICINE">Synthetic Medicines (4)</option>
            <option value="CONSUMABLE">Consumables (4)</option>
            <option value="LOW">Low / Out of Stock Alerts (3)</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredItems.length}</strong> items
        </span>
      </div>

      {/* Inventory Table */}
      <SectionCard
        title="Approved Synthetic Inventory Catalogue"
        subtitle="Synthetic medicine vs consumable categorization &bull; No patient prescription data"
      >
        <DataTable
          columns={columns}
          data={filteredItems}
          keyExtractor={(item) => item.code}
        />
      </SectionCard>

      {/* Immutable Transaction Ledger Info */}
      <SectionCard
        title="Append-Only Transaction Ledger Semantics"
        subtitle="Architecture Freeze v2.1 (Migration 009 Specification)"
      >
        <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-2 text-slate-700">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-800">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>Immutable Stock Audit Trail</span>
          </div>
          <p className="leading-relaxed">
            Per Migration 009, all inventory transactions (<code className="font-mono bg-slate-200 px-1 rounded">RECEIPT</code>, <code className="font-mono bg-slate-200 px-1 rounded">ISSUE</code>, <code className="font-mono bg-slate-200 px-1 rounded">ADJUSTMENT</code>, <code className="font-mono bg-slate-200 px-1 rounded">TRANSFER_IN</code>, <code className="font-mono bg-slate-200 px-1 rounded">TRANSFER_OUT</code>) follow append-only semantics. Database triggers prevent any <code className="font-mono bg-slate-200 px-1 rounded">UPDATE</code> or <code className="font-mono bg-slate-200 px-1 rounded">DELETE</code> operations once records are committed.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Note: In accordance with project instructions, no fabricated fake transactions are shown prior to backend transaction API availability.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
