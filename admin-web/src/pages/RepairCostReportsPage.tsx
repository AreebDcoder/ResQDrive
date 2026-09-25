import { useEffect, useState } from 'react';
import api, { API_URL } from '../api';

export default function RepairCostReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/admin/repair-cost-reports?limit=${limit}&skip=${(page - 1) * limit}`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setReports(data);
        setTotal(res.data?.total ?? res.data?.meta?.total ?? data.length);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page]);

  const downloadPdf = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/repair-cost/report/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repair-cost-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const parseLineItems = (lineItems: any) => {
    if (!lineItems) return [];
    try {
      const items = typeof lineItems === 'string' ? JSON.parse(lineItems) : lineItems;
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  };

  if (isLoading && reports.length === 0) return <div className="p-8 text-gray-400">Loading repair cost reports...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Repair Cost Reports</h1>
      {reports.length === 0 ? (
        <p className="text-gray-500">No repair cost reports recorded.</p>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((r: any) => {
              const items = parseLineItems(r.lineItems);
              const minCost = r.totalMinCostPkr ? r.totalMinCostPkr.toLocaleString() : 'N/A';
              const maxCost = r.totalMaxCostPkr ? r.totalMaxCostPkr.toLocaleString() : 'N/A';
              const damageType = items.find((i: any) => i.damageType)?.damageType || items.find((i: any) => i.part)?.part || 'N/A';
              const severity = items.find((i: any) => i.severity)?.severity || 'N/A';

              return (
                <div key={r.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-white">{r.user?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => downloadPdf(r.id)} className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-900/20 rounded-lg">Download PDF</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Damage Type</p>
                      <span className="text-xs font-bold text-red-400">{damageType}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Severity</p>
                      <span className="text-xs font-bold text-amber-400">{(() => {
                    const SEVERITY_MAP: Record<string, string> = {
                      scratch: 'minor', dent: 'minor',
                      lamp_broken: 'moderate', tire_flat: 'moderate',
                      crack: 'severe', glass_shatter: 'severe',
                    };
                    const dt = items[0]?.damageType;
                    return r.damageAssessment?.derivedSeverity || (dt ? SEVERITY_MAP[dt] : 'N/A') || 'N/A';
                  })()}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Min Cost</p>
                      <span className="text-sm font-bold text-green-400">Rs. {minCost}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Max Cost</p>
                      <span className="text-sm font-bold text-green-400">Rs. {maxCost}</span>
                    </div>
                  </div>
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Line Items:</p>
                      <div className="space-y-1">
                        {items.slice(0, 5).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-400">{item.part || item.description || item.name || `Item ${i+1}`}</span>
                            <span className="text-gray-300">Rs. {(item.cost || item.price || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}