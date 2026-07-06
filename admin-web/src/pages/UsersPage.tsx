import { useEffect, useState } from 'react';
import api from '../api';
import type { User } from '../types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: any = { page, limit: 15 };
        if (roleFilter) params.role = roleFilter;
        const res = await api.get('/admin/users', { params });
        setUsers(res.data.users);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [page, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to change role');
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to change status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Users ({total})</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="">All Roles</option>
          <option value="DRIVER">Driver</option>
          <option value="MECHANIC">Mechanic</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-gray-500">No users found.</div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700">
                  <td className="p-4 text-white text-sm">{u.fullName}</td>
                  <td className="p-4 text-gray-400 text-sm">{u.email}</td>
                  <td className="p-4 text-gray-400 text-sm">{u.phoneNumber}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700"
                    >
                      <option value="DRIVER">Driver</option>
                      <option value="MECHANIC">Mechanic</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleStatusChange(u.id, !u.isActive)}
                      className={`px-3 py-1 rounded text-xs font-bold text-white ${u.isActive ? 'bg-green-600' : 'bg-red-600'}`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-sm">
                      Delete
                    </button>
                  </td>
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