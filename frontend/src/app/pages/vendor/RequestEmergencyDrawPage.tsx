import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, UserCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useSession } from '../../context/SessionContext';
import {
  requestEmergencyDraw,
  approveEmergencyDraw,
  executeDraw,
  getEmergencyVoteInfo,
  requiredEmergencyApprovals,
  type EmergencyVote,
} from '../../contracts/poolContractService';

export default function RequestEmergencyDrawPage() {
  const { walletAddress } = useWallet();
  const { activePoolId } = useSession();
  const navigate = useNavigate();

  const [reason, setReason] = useState('');
  const [drawId, setDrawId] = useState<number | null>(null);
  const [vote, setVote] = useState<EmergencyVote | null>(null);
  const [executed, setExecuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadVote(id: number) {
    if (!activePoolId) return;
    setVote(await getEmergencyVoteInfo(walletAddress, Number(activePoolId), id));
  }

  useEffect(() => {
    if (drawId !== null) loadVote(drawId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawId]);

  async function handleRequest() {
    if (!activePoolId || !reason) return;
    setIsSubmitting(true);
    try {
      const id = await requestEmergencyDraw(walletAddress, Number(activePoolId), reason);
      setDrawId(id);
      toast.success('Emergency draw request submitted');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!activePoolId || drawId === null) return;
    setIsSubmitting(true);
    try {
      await approveEmergencyDraw(walletAddress, Number(activePoolId), drawId);
      await loadVote(drawId);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExecute() {
    if (!activePoolId || drawId === null) return;
    setIsSubmitting(true);
    try {
      await executeDraw(walletAddress, Number(activePoolId), drawId);
      setExecuted(true);
      toast.success('Emergency draw executed ✓');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to execute');
    } finally {
      setIsSubmitting(false);
    }
  }

  const required = vote ? requiredEmergencyApprovals(vote.memberCountSnapshot) : 0;
  const pct = vote ? Math.min(100, Math.round((vote.approvals.length / required) * 100)) : 0;
  const passed = vote ? vote.approvals.length >= required : false;

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pool')} className="w-9 h-9 rounded-full bg-white border border-orange-100 flex items-center justify-center shadow-sm" aria-label="Back">
          <ChevronLeft size={18} className="text-[#7A6F65]" />
        </button>
        <h1 className="text-xl font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
          Emergency Draw
        </h1>
      </div>

      {!vote && !executed && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <p className="text-sm text-[#7A6F65] mb-4 leading-relaxed">
            If you have an urgent need, you can request an early draw. It needs more than 50% of pool members to approve.
          </p>
          <label className="text-xs font-semibold text-[#7A6F65]">Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Need to buy medicine..."
            className="w-full mt-1.5 p-3 rounded-xl border border-orange-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            onClick={handleRequest}
            disabled={isSubmitting || !reason}
            className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-400 text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Submit Request
          </button>
        </div>
      )}

      {vote && !executed && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              Voting Progress
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {passed ? 'Approved' : 'Pending'}
            </span>
          </div>
          <p className="text-xs text-[#7A6F65] mb-4 italic">"{vote.reason}"</p>
          <div className="flex justify-between text-xs text-[#7A6F65] mb-1.5">
            <span>
              {vote.approvals.length}/{required} approvals
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-orange-100 rounded-full overflow-hidden mb-5">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>

          {!passed && vote.approvals.includes(walletAddress) && (
            <p className="text-xs text-[#7A6F65] text-center">You've already approved this request.</p>
          )}
          {!passed && !vote.approvals.includes(walletAddress) && (
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-3 rounded-2xl font-semibold hover:bg-orange-100 transition-colors"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <UserCheck size={18} />
              Approve Request
            </button>
          )}
          {passed && (
            <button
              onClick={handleExecute}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <CheckCircle size={18} />
              Execute Draw
            </button>
          )}
        </div>
      )}

      {executed && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 flex items-center gap-3">
          <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center flex-none">
            <CheckCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-[#2D2A26]" style={{ fontFamily: 'var(--font-heading)' }}>
              Executed 🎉
            </p>
            <p className="text-xs text-[#7A6F65] mt-0.5">The pool's full balance was released to the requester.</p>
          </div>
        </div>
      )}
    </div>
  );
}
