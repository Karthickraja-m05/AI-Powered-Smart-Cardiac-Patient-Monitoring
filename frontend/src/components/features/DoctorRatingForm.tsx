import { useState } from 'react';
import { motion } from 'framer-motion';
import { ratingsAPI } from '../../services/api';

interface Props {
  doctorId: number;
  patientId: number;
  doctorName: string;
  onSubmit?: () => void;
}

export default function DoctorRatingForm({ doctorId, patientId, doctorName, onSubmit }: Props) {
  const [ratings, setRatings] = useState({
    communication: 0, treatment: 0, availability: 0, kindness: 0, overall: 0,
  });
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dimensions = [
    { key: 'communication' as const, label: 'Communication', emoji: '🗣️' },
    { key: 'treatment' as const, label: 'Treatment Quality', emoji: '💊' },
    { key: 'availability' as const, label: 'Availability', emoji: '🕐' },
    { key: 'kindness' as const, label: 'Kindness & Empathy', emoji: '❤️' },
    { key: 'overall' as const, label: 'Overall Experience', emoji: '⭐' },
  ];

  const handleSubmit = async () => {
    const allRated = Object.values(ratings).every(r => r > 0);
    if (!allRated) return;

    setSubmitting(true);
    try {
      await ratingsAPI.create({
        doctor_id: doctorId,
        patient_id: patientId,
        ...ratings,
        comment: comment.trim() || null,
        is_anonymous: isAnonymous ? 1 : 0,
      });
      setSubmitted(true);
      onSubmit?.();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-800/50 border border-emerald-500/20 rounded-2xl p-8 text-center">
        <span className="text-5xl block mb-3">🎉</span>
        <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
        <p className="text-slate-400 text-sm">Your rating for {doctorName} has been submitted successfully.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-1">⭐ Rate Your Doctor</h3>
      <p className="text-sm text-slate-400 mb-6">How was your experience with {doctorName}?</p>

      {/* Rating Dimensions */}
      <div className="space-y-5">
        {dimensions.map(dim => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">
                <span className="mr-2">{dim.emoji}</span>{dim.label}
              </span>
              <span className="text-xs text-slate-500">
                {ratings[dim.key] > 0 ? `${ratings[dim.key]}/5` : 'Not rated'}
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatings(r => ({ ...r, [dim.key]: star }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${
                    star <= ratings[dim.key]
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 scale-110'
                      : 'bg-white/5 text-slate-600 border border-white/5 hover:bg-white/10 hover:text-amber-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className="mt-6">
        <label className="text-sm text-slate-300 block mb-2">💬 Additional Feedback (optional)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your thoughts about the care you received..."
          rows={3}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
        />
      </div>

      {/* Anonymous Toggle */}
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => setIsAnonymous(!isAnonymous)}
          className={`w-5 h-5 rounded border transition-all ${
            isAnonymous ? 'bg-amber-500 border-amber-500' : 'bg-white/5 border-white/10'
          }`}>
          {isAnonymous && <span className="text-white text-xs">✓</span>}
        </button>
        <span className="text-sm text-slate-400">Submit anonymously</span>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !Object.values(ratings).every(r => r > 0)}
        className="mt-6 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 transition-all"
      >
        {submitting ? 'Submitting...' : '⭐ Submit Rating'}
      </button>
    </motion.div>
  );
}
