import React, { useState } from 'react';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import LandingPage from './pages/LandingPage';
import CategorySelectionPage from './pages/CategorySelectionPage';
import ReferenceFoundPage from './pages/ReferenceFoundPage';
import ReferenceNotFoundPage from './pages/ReferenceNotFoundPage';
import OfficialRoutePage from './pages/OfficialRoutePage';
import CompletionPage from './pages/CompletionPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

export default function App() {
  const [currentView, setCurrentView] = useState('LANDING'); // LANDING, CATEGORY, FOUND, NOT_FOUND, ROUTE, COMPLETION, ADMIN
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
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      <DisclaimerBanner />
      <Header
        currentSession={session}
        currentView={currentView}
        onNavigateAdmin={() => setCurrentView('ADMIN')}
        onNavigateHome={handleResetSession}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {currentView === 'ADMIN' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setCurrentView(session ? 'CATEGORY' : 'LANDING')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>&larr; Back to Guidance Flow</span>
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
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>Healthcare Access Guidance Prototype &bull; Academic 2nd-Year Capstone Demonstration</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Synthetic demonstration data only. Not affiliated with NHA, PM-JAY, or any hospital authority.
        </p>
      </footer>
    </div>
  );
}
