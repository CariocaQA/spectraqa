import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { toast } from 'sonner';
import { onboardingSteps } from '@/data/onboardingSteps';

const STORAGE_KEY = 'spectra_tour_completed';

export function useOnboarding() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isFirstVisit = !localStorage.getItem(STORAGE_KEY);

  const startTour = useCallback(() => {
    // Always start from dashboard
    if (location.pathname !== '/') {
      navigate('/');
    }
    setStepIndex(0);
    setRun(true);
  }, [navigate, location.pathname]);

  const endTour = useCallback((completed: boolean = false) => {
    setRun(false);
    setStepIndex(0);
    localStorage.setItem(STORAGE_KEY, 'true');
    
    if (completed) {
      toast.success('Tour concluído! 🎉', {
        description: 'Você conheceu todas as funcionalidades do Spectra. Bom trabalho!',
      });
    }
  }, []);

  const skipTour = useCallback(() => {
    setRun(false);
    setStepIndex(0);
    localStorage.setItem(STORAGE_KEY, 'true');
    toast.info('Tour pulado', {
      description: 'Você pode reiniciar o tour a qualquer momento pelo Dashboard.',
    });
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    startTour();
  }, [startTour]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, step } = data;

    // Handle step navigation for different pages
    if (type === EVENTS.STEP_BEFORE && step?.data?.route) {
      const targetRoute = step.data.route as string;
      if (location.pathname !== targetRoute) {
        navigate(targetRoute);
        // Small delay to let the page render
        return;
      }
    }

    if (type === EVENTS.STEP_AFTER) {
      // Move to next step
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      endTour(true);
    }

    // Handle skip or close
    if (status === STATUS.SKIPPED || (type === EVENTS.TOUR_END && action === ACTIONS.SKIP)) {
      skipTour();
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      skipTour();
    }
  }, [navigate, location.pathname, endTour, skipTour]);

  return {
    run,
    stepIndex,
    steps: onboardingSteps,
    isFirstVisit,
    startTour,
    endTour,
    skipTour,
    resetTour,
    handleCallback,
    totalSteps: onboardingSteps.length,
    currentStep: stepIndex + 1,
  };
}
