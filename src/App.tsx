import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SectionSkeleton, SectionNavigator, CustomCursor } from './components/shared';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import './styles/global.css';

// Lazy-loaded sections
const TrustStrip = lazy(() => import('./components/TrustStrip'));
const ProblemStatement = lazy(() => import('./components/ProblemStatement'));
const ThreePillars = lazy(() => import('./components/ThreePillars'));
const IntakeEngineDemo = lazy(() => import('./components/IntakeEngineDemo'));
const PulseMapSection = lazy(() => import('./components/PulseMapSection'));
const MatchingEngine = lazy(() => import('./components/MatchingEngine'));
const ImpactStats = lazy(() => import('./components/ImpactStats'));
const Personas = lazy(() => import('./components/Personas'));
const CrisisMode = lazy(() => import('./components/CrisisMode'));
const CSRPortal = lazy(() => import('./components/CSRPortal'));
const TechFoundation = lazy(() => import('./components/TechFoundation'));
const Testimonials = lazy(() => import('./components/Testimonials'));
const FinalCTA = lazy(() => import('./components/FinalCTA'));
const Footer = lazy(() => import('./components/Footer'));

// Lazy-loaded pages
const IntakePage = lazy(() => import('./pages/intake/IntakePage'));
const CommunityPulseMap = lazy(() => import('./pages/pulse-map/CommunityPulseMap'));
const SevaAgentDashboard = lazy(() => import('./pages/seva-agent/SevaAgentDashboard'));
const NgoDashboard = lazy(() => import('./pages/ngo-dashboard/NgoDashboard'));
const VolunteerExperience = lazy(() => import('./pages/volunteer-app/VolunteerExperience'));
const GeminiLab = lazy(() => import('./pages/gemini-lab/GeminiLab'));
const CsrPortalPage = lazy(() => import('./pages/csr-portal/CsrPortalPage'));
const PanchayatInterface = lazy(() => import('./pages/panchayat/PanchayatInterface'));
const CrisisModePage = lazy(() => import('./pages/crisis-mode/CrisisModePage'));

function LandingPage() {
  return (
    <>
      <SectionNavigator />
      <main id="main-content">
        <Hero />
        <Suspense fallback={<SectionSkeleton />}>
          <TrustStrip />
          <ProblemStatement />
          <ThreePillars />
          <IntakeEngineDemo />
          <PulseMapSection />
          <MatchingEngine />
          <ImpactStats />
          <Personas />
          <CrisisMode />
          <CSRPortal />
          <TechFoundation />
          <Testimonials />
          <FinalCTA />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <ReactLenis root options={{ lerp: 0.1, duration: 1.5 }}>
            <CustomCursor />
            <a href="#main-content" className="skip-link">Skip to content</a>
            <Navbar />
            <Suspense fallback={<SectionSkeleton />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/intake" element={<IntakePage />} />
                <Route path="/pulse-map" element={<CommunityPulseMap />} />
                <Route path="/seva-agent" element={<SevaAgentDashboard />} />
                <Route path="/ngo-dashboard" element={<NgoDashboard />} />
                <Route path="/volunteer-app" element={<VolunteerExperience />} />
                <Route path="/gemini-lab" element={<GeminiLab />} />
                <Route path="/csr-portal" element={<CsrPortalPage />} />
                <Route path="/panchayat" element={<PanchayatInterface />} />
                <Route path="/crisis-mode" element={<CrisisModePage />} />
              </Routes>
            </Suspense>
          </ReactLenis>
        </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
