import { createContext, useContext, ReactNode } from 'react';
import Joyride from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TourProgress } from './TourProgress';
import { joyrideStyles } from './joyrideStyles';
import { joyrideLocale } from './joyrideLocale';

interface OnboardingContextType {
  startTour: () => void;
  isFirstVisit: boolean;
  run: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const {
    run,
    stepIndex,
    steps,
    isFirstVisit,
    startTour,
    handleCallback,
    currentStep,
    totalSteps,
  } = useOnboarding();

  return (
    <OnboardingContext.Provider value={{ startTour, isFirstVisit, run }}>
      <Joyride
        run={run}
        steps={steps}
        stepIndex={stepIndex}
        callback={handleCallback}
        continuous
        showProgress
        showSkipButton
        hideCloseButton={false}
        scrollToFirstStep
        spotlightClicks
        disableOverlayClose
        styles={joyrideStyles}
        locale={joyrideLocale}
        floaterProps={{
          disableAnimation: false,
        }}
      />
      {run && (
        <TourProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          steps={steps.map(s => ({ title: typeof s.title === 'string' ? s.title : 'Step' }))}
        />
      )}
      {children}
    </OnboardingContext.Provider>
  );
}
