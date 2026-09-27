import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Megaphone, Users, Wrench, Globe } from 'lucide-react';
import { useBroadcastNotification } from '../hooks/useAdminOps';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';

/**
 * BroadcastPage — send a push notification to all active users in a segment.
 *
 * Segments:
 *   - ALL      — every active user (DRIVERS + MECHANICS + ADMINS)
 *   - DRIVERS  — only DRIVER role users
 *   - MECHANICS — only MECHANIC role users
 *
 * The broadcast is fire-and-forget per-user (partial failures don't fail
 * the whole call). Returns counts: { sentCount, failedCount, totalUsers, segment }.
 *
 * Categories (must match the NotificationCategory enum):
 *   driving_mode, alert_delivery_confirmation, false_alarm_log, system_status, general
 */
export default function BroadcastPage() {
  const navigate = useNavigate();
  const broadcastMut = useBroadcastNotification();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [segment, setSegment] = useState<'ALL' | 'DRIVERS' | 'MECHANICS'>('ALL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required.');
      return;
    }
    broadcastMut.mutate({
      title: title.trim(),
      body: body.trim(),
      category,
      segment,
    }, {
      onSuccess: () => {
        // Optionally navigate to notification history to see the broadcast entries
        navigate('/notifications');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcast notification</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Send a push notification to all active users in a segment. Each user receives
            an individual notification — partial failures are non-blocking.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')} leftIcon={<ArrowLeft size={14} />}>
          Back to notifications
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Segment selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Audience</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">Who should receive this broadcast?</p>
          <div className="grid grid-cols-3 gap-3">
            <SegmentOption
              active={segment === 'ALL'}
              onClick={() => setSegment('ALL')}
              icon={<Globe size={18} />}
              label="All users"
              description="Drivers + mechanics + admins"
            />
            <SegmentOption
              active={segment === 'DRIVERS'}
              onClick={() => setSegment('DRIVERS')}
              icon={<Users size={18} />}
              label="Drivers"
              description="DRIVER role only"
            />
            <SegmentOption
              active={segment === 'MECHANICS'}
              onClick={() => setSegment('MECHANICS')}
              icon={<Wrench size={18} />}
              label="Mechanics"
              description="MECHANIC role only"
            />
          </div>
        </div>

        {/* Notification content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Content</h2>
          <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">Push notification content (max 150 chars for title).</p>
          <div className="space-y-4">
            <Input
              id="title"
              label="Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="System maintenance scheduled"
              maxLength={150}
              hint={`${title.length}/150 characters`}
              required
              autoFocus
            />
            <div>
              <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Body <span className="text-danger-500">*</span>
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="The system will be down for 30 minutes tonight at 2 AM. Please plan accordingly."
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
            <Select
              id="category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { label: 'general', value: 'general' },
                { label: 'system_status', value: 'system_status' },
                { label: 'driving_mode', value: 'driving_mode' },
                { label: 'alert_delivery_confirmation', value: 'alert_delivery_confirmation' },
                { label: 'false_alarm_log', value: 'false_alarm_log' },
              ]}
              hint="Controls whether the user sees the notification based on their preferences."
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Preview</h2>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Megaphone size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{title || 'Notification title'}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body || 'Notification body preview…'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="neutral" size="sm">{category}</Badge>
                  <Badge variant="info" size="sm" dot>{segment}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/notifications')}>Cancel</Button>
          <Button type="submit" loading={broadcastMut.isPending} leftIcon={<Send size={14} />}>
            Send broadcast
          </Button>
        </div>
      </form>
    </div>
  );
}

function SegmentOption({ active, onClick, icon, label, description }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex flex-col items-start rounded-lg border p-4 text-left transition-colors ' +
        (active
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600')
      }
    >
      <div className={active ? 'text-primary-600 dark:text-primary-300' : 'text-gray-400'}>{icon}</div>
      <p className={'mt-2 text-sm font-semibold ' + (active ? 'text-primary-700 dark:text-primary-200' : 'text-gray-900 dark:text-white')}>{label}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}
