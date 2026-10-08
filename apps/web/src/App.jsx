import React, { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/operations/DashboardPage';
import OpdQueuePage from './pages/operations/OpdQueuePage';
import BedsPage from './pages/operations/BedsPage';
import AdmissionsPage from './pages/operations/AdmissionsPage';
import InventoryPage from './pages/operations/InventoryPage';
import AnalyticsPage from './pages/operations/AnalyticsPage';
import CityOverviewPage from './pages/operations/CityOverviewPage';
import CitizenGuidanceWrapper from './pages/guidance/CitizenGuidanceWrapper';
import { getHospitals, getHealth } from './services/api';

export default function App() {
  // Navigation states: DASHBOARD, OPD_QUEUE, BEDS, ADMISSIONS, INVENTORY, ANALYTICS, CITY_OVERVIEW, CITIZEN_GUIDANCE, GUIDANCE_ADMIN
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [systemStatus, setSystemStatus] = useState('CHECKING');
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize facilities and health check
  useEffect(() => {
    async function initPlatform() {
      try {
        const [healthRes, hospRes] = await Promise.all([
          getHealth().catch(() => ({ status: 'CONNECTING' })),
          getHospitals().catch(() => ({ hospitals: [] })),
        ]);

        setSystemStatus(healthRes.status === 'HEALTHY' ? 'HEALTHY' : 'CONNECTING');

        const hospList = hospRes.hospitals || [];
        setHospitals(hospList);
        if (hospList.length > 0) {
          setSelectedHospitalId(hospList[0].hospital_id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitialLoading(false);
      }
    }

    initPlatform();
  }, []);

  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId);
  const hospitalName = selectedHospital?.hospital_name || selectedHospitalId;

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      hospitals={hospitals}
      selectedHospitalId={selectedHospitalId}
      onSelectHospital={setSelectedHospitalId}
      systemStatus={systemStatus}
    >
      {/* 1. Dashboard Page */}
      {currentView === 'DASHBOARD' && (
        <DashboardPage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
          onNavigate={setCurrentView}
        />
      )}

      {/* 2. OPD Queue Management */}
      {currentView === 'OPD_QUEUE' && (
        <OpdQueuePage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
        />
      )}

      {/* 3. Inpatient Beds Management */}
      {currentView === 'BEDS' && (
        <BedsPage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
        />
      )}

      {/* 4. Inpatient Admissions Management */}
      {currentView === 'ADMISSIONS' && (
        <AdmissionsPage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
        />
      )}

      {/* 5. Essential Inventory */}
      {currentView === 'INVENTORY' && (
        <InventoryPage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
        />
      )}

      {/* 6. Operations & M/M/c Analytics */}
      {currentView === 'ANALYTICS' && (
        <AnalyticsPage
          hospitalId={selectedHospitalId}
          hospitalName={hospitalName}
        />
      )}

      {/* 7. City Overview Snapshot */}
      {currentView === 'CITY_OVERVIEW' && (
        <CityOverviewPage
          onSelectHospital={(id) => {
            setSelectedHospitalId(id);
            setCurrentView('DASHBOARD');
          }}
        />
      )}

      {/* 8. Citizen Access Guidance Flow (Preserved) */}
      {currentView === 'CITIZEN_GUIDANCE' && (
        <CitizenGuidanceWrapper
          initialView="LANDING"
          onBackToOperations={() => setCurrentView('DASHBOARD')}
        />
      )}

      {/* 9. Citizen Guidance Admin Audit Ledger (Preserved) */}
      {currentView === 'GUIDANCE_ADMIN' && (
        <CitizenGuidanceWrapper
          initialView="ADMIN"
          onBackToOperations={() => setCurrentView('DASHBOARD')}
        />
      )}
    </AppShell>
  );
}
