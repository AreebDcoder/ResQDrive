import { useEffect, useState } from 'react';
import api from '../api';

export default function EmergencyNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ regionName: '', serviceName: '', phoneNumber: '', priorityOrder: 1 });

  const fetch = () => {
    api.get('/admin/emergency-numbers').then(res => setNumbers(res.data || [])).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const addNumber = async () => {
    try {
      await api.post('/admin/emergency-numbers', form);
      setShowForm(false);
      setForm({ regionName: '', serviceName: '', phoneNumber: '', priorityOrder: 1 });
      fetch();
    } catch (err) { alert('Failed to add number.'); }
  };

  const deleteNumber = async (id: string) => {
    if (!confirm('Delete this emergency number?')) return;
    try {
      await api.delete(`/admin/emergency-numbers/${id}`);
      setNumbers(prev => prev.filter(n => n.id !== id));
    } catch (err) { alert('Failed to delete.'); }
  };

  if (isLoading) return <div className="p-8 text-gray-400">Loading emergency numbers...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Regional Emergency Numbers ({numbers.length})</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{showForm ? 'Cancel' : '+ Add Number'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 mb-6 grid grid-cols-2 gap-4">
          <input className="bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm" placeholder="Region Name" value={form.regionName} onChange={e => setForm({...form, regionName: e.target.value})} />
          <input className="bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm" placeholder="Service Name" value={form.serviceName} onChange={e => setForm({...form, serviceName: e.target.value})} />
          <input className="bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm" placeholder="Phone Number (11-digit)" value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} />
          <input type="number" className="bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm" placeholder="Priority" value={form.priorityOrder} onChange={e => setForm({...form, priorityOrder: parseInt(e.target.value)})} />
          <button onClick={addNumber} className="col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Save Number</button>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
              <th className="p-3">Region</th>
              <th className="p-3">Service</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((n: any) => (
              <tr key={n.id} className="border-b border-gray-800">
                <td className="p-3 text-sm text-white">{n.regionName}</td>
                <td className="p-3 text-sm text-gray-300">{n.serviceName}</td>
                <td className="p-3 text-sm text-green-400 font-mono">{n.phoneNumber}</td>
                <td className="p-3 text-sm text-gray-400">P{n.priorityOrder}</td>
                <td className="p-3"><button onClick={() => deleteNumber(n.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}