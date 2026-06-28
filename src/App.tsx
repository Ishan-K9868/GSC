import { Suspense, lazy } from 'react';
import { Navigate, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DemoRoleProvider, useDemoRole } from './context/DemoRoleContext';
import { canRoleAccessPath, roleDefaultPaths } from './config/appNavigation';
import { SectionSkeleton, SectionNavigator, CustomCursor } from './components/shared';
import Navbar from './components/Navbar';
import AppShell from './components/app-shell/AppShell';
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
const PublicKPIDashboard = lazy(() => import('./pages/pulse-map/PublicKPIDashboard'));
const SevaAgentDashboard = lazy(() => import('./pages/seva-agent/SevaAgentDashboard'));
const NgoDashboard = lazy(() => import('./pages/ngo-dashboard/NgoDashboard'));
const VolunteerExperience = lazy(() => import('./pages/volunteer-app/VolunteerExperience'));
const GeminiLab = lazy(() => import('./pages/gemini-lab/GeminiLab'));
const CsrPortalPage = lazy(() => import('./pages/csr-portal/CsrPortalPage'));
const PanchayatInterface = lazy(() => import('./pages/panchayat/PanchayatInterface'));
const CrisisModePage = lazy(() => import('./pages/crisis-mode/CrisisModePage'));
const WorkspaceDashboard = lazy(() => import('./pages/workspace/WorkspaceDashboard'));
const ForNgosPage = lazy(() => import('./pages/for-ngos/ForNgosPage'));
const RoleAccessPage = lazy(() => import('./pages/role-access/RoleAccessPage'));

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

function MarketingLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function RoleAccessGate({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { role } = useDemoRole();

  if (!canRoleAccessPath(role, location.pathname)) {
    return <Navigate to={roleDefaultPaths[role]} replace />;
  }

  return children;
}

function InternalLayout() {
  return (
    <RoleAccessGate>
      <AppShell />
    </RoleAccessGate>
  );
}

function PublicLayout() {
  return <Outlet />;
}

function StandaloneLayout() {
  return <Outlet />;
}

function AppChrome() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <>
      {isLandingPage ? <CustomCursor /> : null}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Suspense fallback={<SectionSkeleton />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path="/impact/live" element={<PublicKPIDashboard />} />
            <Route path="/impact/:wardSlug" element={<PublicKPIDashboard />} />
          </Route>

          <Route element={<StandaloneLayout />}>
            <Route path="/role-access" element={<RoleAccessPage />} />
          </Route>

          <Route element={<InternalLayout />}>
            <Route path="/workspace" element={<WorkspaceDashboard />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/pulse-map" element={<CommunityPulseMap />} />
            <Route path="/seva-agent" element={<SevaAgentDashboard />} />
            <Route path="/ngo-dashboard" element={<NgoDashboard />} />
            <Route path="/volunteer-app" element={<VolunteerExperience />} />
            <Route path="/gemini-lab" element={<GeminiLab />} />
            <Route path="/csr-portal" element={<CsrPortalPage />} />
            <Route path="/panchayat" element={<PanchayatInterface />} />
            <Route path="/crisis-mode" element={<CrisisModePage />} />
            <Route path="/for-ngos" element={<ForNgosPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DemoRoleProvider>
          <MotionConfig reducedMotion="user">
            <ReactLenis root options={{ lerp: 0.1, duration: 1.5 }}>
              <AppChrome />
            </ReactLenis>
          </MotionConfig>
        </DemoRoleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
