import { useState, useCallback, useRef } from 'react';
import { submitEnhancement, pollUntilDone, outputUrl } from '../utils/api';

export const STAGES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

export function useEnhancement() {
  const [stage, setStage] = useState(STAGES.IDLE);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const jobIdRef = useRef(null);

  const enhance = useCallback(async (files) => {
    setStage(STAGES.UPLOADING);
    setProgress(0);
    setProgressMsg('Uploading images...');
    setError(null);
    setResult(null);

    try {
      const { job_id } = await submitEnhancement(files);
      jobIdRef.current = job_id;

      setStage(STAGES.PROCESSING);
      setProgressMsg('Processing...');

      const finalStatus = await pollUntilDone(job_id, (pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      });

      setResult({
        originalUrl: outputUrl(finalStatus.original_url),
        enhancedUrl: outputUrl(finalStatus.enhanced_url),
        metadata: finalStatus.metadata || {},
        params: finalStatus.params || {},
      });
      setStage(STAGES.DONE);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStage(STAGES.ERROR);
    }
  }, []);

  const reset = useCallback(() => {
    setStage(STAGES.IDLE);
    setProgress(0);
    setProgressMsg('');
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, []);

  return { stage, progress, progressMsg, result, error, enhance, reset, STAGES };
}
