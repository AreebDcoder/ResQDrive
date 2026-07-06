import { useEffect, useState } from 'react';
import { ArrowLeft, Download, MapPin } from 'lucide-react';
import api, { API_URL } from '../api';
import type { Incident } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: 'bg-gray-600', MINOR: 'bg-yellow-600', MODERATE: 'bg-orange-600', SEVERE: 'bg-red-600',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-600', RESOLVED: 'bg-green-600', FALSE_ALARM: 'bg-gray-600', ARCHIVED: 'bg-gray-800',
};

export default function IncidentDetailPage({ incidentId, onBack }: { incidentId: string; onBack: () => void }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIncident = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/admin/incidents/${incidentId}`);
        setIncident(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncident();
  }, [incidentId]);

  const downloadPdf = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/admin/incidents/${incidentId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-${incidentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!incident) return <div className="p-8 text-red-400">Incident not found</div>;

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-gray-200">{value || '—'}</p>
    </div>
  );

  const JsonField = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <pre className="bg-gray-950 p-4 rounded-lg text-xs text-green-400 overflow-auto max-h-64">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          Back to Incidents
        </button>
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Download size={18} />
          Download PDF
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <span className={`px-3 py-1 rounded text-sm font-bold text-white ${SEVERITY_COLORS[incident.severity]}`}>
            {incident.severity}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-bold text-white ${STATUS_COLORS[incident.status]}`}>
            {incident.status.replace('_', ' ')}
          </span>
          <span className="text-gray-500 text-sm">
            {incident.type === 'AUTO' ? '🤖 Auto-detected' : '✍️ Manually logged'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Incident ID" value={incident.id} />
          <Field label="Occurred At" value={new Date(incident.occurredAt).toLocaleString()} />
          <Field label="Reported By" value={incident.user?.fullName} />
          <Field label="Contact" value={incident.user?.phoneNumber} />
          <Field label="Email" value={incident.user?.email} />
          <Field label="Role" value={incident.user?.role} />
          <Field label="Address" value={incident.address} />
          <Field label="Coordinates" value={
            incident.latitude != null && incident.longitude != null
              ? `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`
              : '—'
          } />
        </div>

        {incident.latitude != null && incident.longitude != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-red-400 hover:text-red-300 text-sm font-medium"
          >
            <MapPin size={16} />
            Open in Google Maps
          </a>
        )}
      </div>

      {incident.description && (
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</p>
          <p className="text-gray-200">{incident.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <JsonField label="Sensor Snapshot" value={incident.sensorSnapshot} />
        <JsonField label="Alert Dispatch Status" value={incident.alertDispatchStatus} />
        <JsonField label="Damage Assessment" value={incident.damageAssessmentResult} />
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mt-6">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Record Created" value={new Date(incident.createdAt).toLocaleString()} />
          <Field label="Last Updated" value={new Date(incident.updatedAt).toLocaleString()} />
        </div>
      </div>
    </div>
  );
}