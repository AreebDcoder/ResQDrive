import { useEffect, useState } from 'react';
import api from '../api';

export default function DamageAssessmentPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/damage-assessments').then(res => setAssessments(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8 text-gray-400">Loading damage assessments...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Damage Assessment Gallery</h1>
      {assessments.length === 0 ? (
        <p className="text-gray-500">No damage assessments recorded.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {assessments.map((a: any) => (
            <div key={a.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              {a.photoUrl && (
                <img src={a.photoUrl} alt="Damage" className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <div className="space-y-1">
                <p className="text-sm text-white font-medium">{a.user?.fullName || 'Unknown'}</p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-900/40 text-red-400">{a.predictedDamageType || 'N/A'}</span>
                  <span className="px-2 py-1 rounded text-xs font-bold bg-amber-900/40 text-amber-400">{a.derivedSeverity || 'N/A'}</span>
                </div>
                <p className="text-xs text-gray-400">Confidence: {a.confidenceScore ? `${(a.confidenceScore * 100).toFixed(1)}%` : 'N/A'}</p>
                <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}