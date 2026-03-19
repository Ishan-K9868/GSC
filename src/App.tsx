import { Suspense, lazy } from 'react';
import { MotionConfig } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import { ThemeProvider } from './context/ThemeContext';
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

function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ReactLenis root options={{ lerp: 0.1, duration: 1.5 }}>
          <CustomCursor />
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Navbar />
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
        </ReactLenis>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
