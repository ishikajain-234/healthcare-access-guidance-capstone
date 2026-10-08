import React, { useState } from 'react';
import LandingPage from '../LandingPage';
import CategorySelectionPage from '../CategorySelectionPage';
import ReferenceFoundPage from '../ReferenceFoundPage';
import ReferenceNotFoundPage from '../ReferenceNotFoundPage';
import OfficialRoutePage from '../OfficialRoutePage';
import CompletionPage from '../CompletionPage';
import AdminAnalyticsPage from '../AdminAnalyticsPage';
import DisclaimerBanner from '../../components/DisclaimerBanner';
import { ArrowLeft, Shield, ExternalLink, HelpCircle } from 'lucide-react';

export default function CitizenGuidanceWrapper({
  initialView = 'LANDING',
  onBackToOperations,
}) {
  const [currentView, setCurrentView] = useState(initialView); // LANDING, CATEGORY, FOUND, NOT_FOUND, ROUTE, COMPLETION, ADMIN
  const [session, setSession] = useState(null);
  const [referenceData, setReferenceData] = useState(null);
  const [searchCategory, setSearchCategory] = useState(null);

  const handleSessionStarted = (newSession) => {
    setSession(newSession);
    setCurrentView('CATEGORY');
  };

  const handleSearchSuccess = (updatedSession, record) => {
    setSession(updatedSession);
    setReferenceData(record);
    setCurrentView('FOUND');
  };

  const handleSearchNotFound = (updatedSession, categoryId) => {
    setSession(updatedSession);
    setSearchCategory(categoryId);
    setReferenceData(null);
    setCurrentView('NOT_FOUND');
  };

  const handleProceedToOfficialRoute = (updatedSession) => {
    setSession(updatedSession);
    setCurrentView('ROUTE');
  };

  const handleCompletion = (updatedSession) => {
    setSession(updatedSession);
    setCurrentView('COMPLETION');
  };

  const handleResetSession = () => {
    setSession(null);
    setReferenceData(null);
    setSearchCategory(null);
    setCurrentView('LANDING');
  };

  return (
    <div className="space-y-6">
      {/* Return to Operations Platform Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOperations}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Hospital Operations Platform</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Public Citizen Healthcare Guidance Gate
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('ADMIN')}
            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            Telemetry Audit
          </button>
          {currentView !== 'LANDING' && (
            <button
              onClick={handleResetSession}
              className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
            >
              Restart Guidance
            </button>
          )}
        </div>
      </div>

      {/* Existing Safety Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Preserved Citizen Guidance Pages */}
      <div className="bg-white border border-slate-200 rounded p-6 shadow-none">
        {currentView === 'ADMIN' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setCurrentView(session ? 'CATEGORY' : 'LANDING')}
                className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-900 flex items-center space-x-1"
              >
                <span>&larr; Back to Citizen Guidance Flow</span>
              </button>
            </div>
            <AdminAnalyticsPage />
          </div>
        )}

        {currentView === 'LANDING' && (
          <LandingPage
            onSessionStarted={handleSessionStarted}
            onNavigateAdmin={() => setCurrentView('ADMIN')}
          />
        )}

        {currentView === 'CATEGORY' && (
          <CategorySelectionPage
            session={session}
            onSearchSuccess={handleSearchSuccess}
            onSearchNotFound={handleSearchNotFound}
          />
        )}

        {currentView === 'FOUND' && (
          <ReferenceFoundPage
            session={session}
            record={referenceData}
            onProceed={handleProceedToOfficialRoute}
          />
        )}

        {currentView === 'NOT_FOUND' && (
          <ReferenceNotFoundPage
            session={session}
            categoryId={searchCategory}
            onProceed={handleProceedToOfficialRoute}
          />
        )}

        {currentView === 'ROUTE' && (
          <OfficialRoutePage
            session={session}
            record={referenceData}
            onComplete={handleCompletion}
          />
        )}

        {currentView === 'COMPLETION' && (
          <CompletionPage
            session={session}
            onRestart={handleResetSession}
          />
        )}
      </div>
    </div>
  );
}
