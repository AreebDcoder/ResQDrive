import { useEffect, useState } from 'react';
import api, { API_URL } from '../api';

export default function RepairCostReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/repair-cost-reports').then(res => setReports(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const downloadPdf = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/repair-cost/report/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repair-cost-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading repair cost reports...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Repair Cost Reports</h1>
      {reports.length === 0 ? (
        <p className="text-gray-500">No repair cost reports recorded.</p>
      ) : (
        <div className="bg-gray-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                <th className="p-3">User</th>
                <th className="p-3">Damage Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Total Cost</th>
                <th className="p-3">Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                  <td className="p-3 text-sm text-white">{r.user?.fullName || 'Unknown'}</td>
                  <td className="p-3"><span className="text-xs font-bold text-red-400">{r.damageAssessment?.predictedDamageType || 'N/A'}</span></td>
                  <td className="p-3"><span className="text-xs font-bold text-amber-400">{r.damageAssessment?.derivedSeverity || 'N/A'}</span></td>
                  <td className="p-3 text-sm text-green-400 font-bold">{r.totalCost ? `Rs. ${r.totalCost.toLocaleString()}` : 'N/A'}</td>
                  <td className="p-3 text-sm text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <button onClick={() => downloadPdf(r.id)} className="text-xs text-blue-400 hover:text-blue-300">Download PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}