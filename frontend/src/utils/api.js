import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE });

/**
 * Submit images for enhancement.
 * @param {File[]} files
 * @returns {{ job_id: string }}
 */
export async function submitEnhancement(files) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const { data } = await api.post('/enhance', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Poll job status.
 * @param {string} jobId
 */
export async function getStatus(jobId) {
  const { data } = await api.get(`/status/${jobId}`);
  return data;
}

/**
 * Get final result (when status === 'done').
 */
export async function getResult(jobId) {
  const { data } = await api.get(`/result/${jobId}`);
  return data;
}

/**
 * Get full URL for a server output path.
 */
export function outputUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE}${path}`;
}

/**
 * Poll until job is done or errored.
 * @param {string} jobId
 * @param {function} onProgress  (progress: number, message: string) => void
 * @param {number} intervalMs
 */
export async function pollUntilDone(jobId, onProgress, intervalMs = 600) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await getStatus(jobId);
        if (onProgress) onProgress(status.progress || 0, status.message || '');

        if (status.status === 'done') {
          clearInterval(interval);
          resolve(status);
        } else if (status.status === 'error') {
          clearInterval(interval);
          reject(new Error(status.message || 'Enhancement failed'));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
}
