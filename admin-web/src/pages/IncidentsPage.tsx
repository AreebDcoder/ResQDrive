import { useEffect, useState } from 'react';
import api from '../api';
import type { Incident } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  NONE: 'bg-gray-600', MINOR: 'bg-yellow-600', MODERATE: 'bg-orange-600', SEVERE: 'bg-red-600',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-600', RESOLVED: 'bg-green-600', FALSE_ALARM: 'bg-gray-600', ARCHIVED: 'bg-gray-800',
};

export default function IncidentsPage({ onSelectIncident }: { onSelectIncident: (id: string) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ severity: '', status: '', search: '' });

  useEffect(() => {
    const fetchIncidents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: any = { page, limit: 15 };
        if (filters.severity) params.severity = filters.severity;
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;
        const res = await api.get('/admin/incidents', { params });
        setIncidents(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load incidents');
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, [page, filters]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">All Incidents ({total})</h1>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by description, address, user..."
          value={filters.search}
          onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
        />
        <select
          value={filters.severity}
          onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1); }}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="">All Severities</option>
          <option value="NONE">None</option>
          <option value="MINOR">Minor</option>
          <option value="MODERATE">Moderate</option>
          <option value="SEVERE">Severe</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_ALARM">False Alarm</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : incidents.length === 0 ? (
        <div className="text-gray-500">No incidents found.</div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="p-4">Severity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4">User</th>
                <th className="p-4">Location</th>
                <th className="p-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${SEVERITY_COLORS[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${STATUS_COLORS[inc.status]}`}>
                      {inc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 text-sm">{new Date(inc.occurredAt).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-300 text-sm">{inc.user?.fullName || 'Unknown'}</td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{inc.address || 'No address'}</td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{inc.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}