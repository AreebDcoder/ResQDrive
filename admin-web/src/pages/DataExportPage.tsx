import { useState } from 'react';
import api, { API_URL } from '../api';
import { Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExportTarget {
  key: string;
  label: string;
  description: string;
  color: string;
}

const EXPORT_TARGETS: ExportTarget[] = [
  { key: 'incidents',            label: 'Incidents',           description: 'All incident records with severity, status, GPS, user', color: 'border-red-500' },
  { key: 'repair-costs',         label: 'Repair Cost Reports', description: 'Line items, min/max PKR totals, vehicle',                 color: 'border-green-500' },
  { key: 'notifications',       label: 'Notification Logs',   description: 'Title, body, read status, delivery status',                color: 'border-amber-500' },
  { key: 'crash-logs',          label: 'Crash Detection Logs', description: 'YAMNet confidence, flagged crashes, sensor fusion',        color: 'border-indigo-500' },
  { key: 'voice-logs',           label: 'Voice Command Logs',  description: 'Transcripts, classified intent, engine',                  color: 'border-pink-500' },
  { key: 'damage-assessments',  label: 'Damage Assessments', description: 'Predicted type, severity, part tag, photo URL',            color: 'border-cyan-500' },
  { key: 'dispatch-logs',       label: 'Dispatch Logs',       description: 'Per-channel status (push/SMS/email), payload JSON',       color: 'border-blue-500' },
];

export default function DataExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ key: string; success: boolean; message: string } | null>(null);

  const handleDownload = async (target: ExportTarget) => {
    setDownloading(target.key);
    setLastResult(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/admin/export/${target.key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${target.key}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setLastResult({ key: target.key, success: true, message: `Exported ${target.label} successfully.` });
    } catch (err: any) {
      const msg = err?.message || 'Download failed';
      setLastResult({ key: target.key, success: false, message: msg });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <FileSpreadsheet size={28} className="text-emerald-400" />
          Data Export
        </h1>
        <p className="text-sm text-gray-400">
          Download any admin dataset as a CSV file (UTF-8 with BOM — opens cleanly in Excel, Google Sheets, or any text editor).
          Use these exports for insurance documentation, police reports, academic FYP submissions, monthly review meetings, or offline analysis.
        </p>
      </div>

      {lastResult && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${lastResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          {lastResult.success ? (
            <CheckCircle2 size={20} className="text-green-400" />
          ) : (
            <AlertCircle size={20} className="text-red-400" />
          )}
          <span className={`text-sm ${lastResult.success ? 'text-green-300' : 'text-red-300'}`}>
            {lastResult.message}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_TARGETS.map((target) => {
          const isDownloading = downloading === target.key;
          return (
            <div
              key={target.key}
              className={`bg-gray-800 rounded-xl p-5 border-l-4 ${target.color} flex flex-col justify-between`}
            >
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{target.label}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{target.description}</p>
              </div>
              <button
                onClick={() => handleDownload(target)}
                disabled={isDownloading}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-gray-800/50 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Export Tips</h2>
        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
          <li>CSV files include a UTF-8 BOM marker so Excel renders Urdu/special characters correctly without manual import.</li>
          <li>Exports are generated on-demand directly from the live database — always reflect the latest state.</li>
          <li>Each export filename is timestamped in milliseconds so re-downloads never overwrite each other.</li>
          <li>Exports respect the same role guard as the rest of the admin panel — only ADMIN-role JWTs can call them.</li>
          <li>For PDF reports of individual incidents, use the Download PDF button on the Incident Detail page.</li>
        </ul>
      </div>
    </div>
  );
}
