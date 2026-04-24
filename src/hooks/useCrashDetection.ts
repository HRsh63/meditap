import { useState, useEffect, useCallback } from 'react';
import { crashDetectionService, CrashEvent } from '../services/crashDetectionService';

export function useCrashDetection() {
  const [isMonitoring, setIsMonitoring] = useState(() => {
    return localStorage.getItem('crash_detection_enabled') === 'true';
  });
  const [lastCrash, setLastCrash] = useState<CrashEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveAcc, setLiveAcc] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleCrash = useCallback((event: CrashEvent) => {
    setLastCrash(event);
    setIsMonitoring(false);
    localStorage.setItem('crash_detection_enabled', 'false');
    crashDetectionService.stop();
  }, []);

  useEffect(() => {
    crashDetectionService.setCrashCallback(handleCrash);
    crashDetectionService.setDataCallback(setLiveAcc);
    crashDetectionService.setCountdownCallback(setCountdown);
    
    // Auto-start if it was enabled
    if (localStorage.getItem('crash_detection_enabled') === 'true') {
      startMonitoring();
    }

    return () => {
      crashDetectionService.stop();
    };
  }, [handleCrash]);

  const startMonitoring = async () => {
    const result = await crashDetectionService.requestPermissions();
    if (result.granted) {
      crashDetectionService.start();
      setIsMonitoring(true);
      localStorage.setItem('crash_detection_enabled', 'true');
      setError(null);
    } else {
      setError(result.error || 'Motion sensor permission denied');
    }
  };

  const stopMonitoring = () => {
    crashDetectionService.stop();
    setIsMonitoring(false);
    localStorage.setItem('crash_detection_enabled', 'false');
  };

  const cancelEmergency = () => {
    crashDetectionService.cancelEmergency();
  };

  return {
    isMonitoring,
    lastCrash,
    error,
    liveAcc,
    countdown,
    startMonitoring,
    stopMonitoring,
    cancelEmergency
  };
}
