"use client";

import { useState } from "react";
import { FEEDBACK_HEAR_ABOUT, FEEDBACK_USE_AGAIN, FEEDBACK_RECOMMEND } from "@/lib/constants";

type Props = {
  serviceRequestId: string;
};

export default function CustomerFeedbackForm({ serviceRequestId }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hearAbout, setHearAbout] = useState("");
  const [useAgain, setUseAgain] = useState("");
  const [recommend, setRecommend] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  if (submitted || dismissed) {
    return (
      <div className="text-center py-6">
        {submitted ? (
          <p className="text-dark-text/60 text-sm">Thanks for your feedback!</p>
        ) : null}
      </div>
    );
  }

  const isValid = rating > 0 && hearAbout && useAgain && recommend;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId,
          rating,
          hearAbout,
          useAgain,
          recommend,
          comment: comment || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to submit feedback");
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left">
      <h3 className="text-lg font-semibold text-dark-text mb-1">Help Us Improve</h3>
      <p className="text-sm text-dark-text/50 mb-6">Optional — takes 30 seconds</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">
            How easy was it to submit your request?
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl transition-colors cursor-pointer"
              >
                <span className={(hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300"}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">
            How did you hear about ALshowUhow?
          </label>
          <select
            value={hearAbout}
            onChange={(e) => setHearAbout(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none text-sm"
          >
            <option value="">Select an option</option>
            {FEEDBACK_HEAR_ABOUT.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">
            How likely are you to use ALshowUhow again?
          </label>
          <select
            value={useAgain}
            onChange={(e) => setUseAgain(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none text-sm"
          >
            <option value="">Select an option</option>
            {FEEDBACK_USE_AGAIN.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">
            Would you recommend ALshowUhow to a friend or neighbor?
          </label>
          <select
            value={recommend}
            onChange={(e) => setRecommend(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none text-sm"
          >
            <option value="">Select an option</option>
            {FEEDBACK_RECOMMEND.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text/70 mb-2">
            Any suggestions for improvement? <span className="text-dark-text/40">(optional)</span>
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Type here..."
            maxLength={200}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple focus:border-purple outline-none text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="px-6 py-2.5 bg-purple text-white rounded-lg font-semibold text-sm hover:bg-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-4 py-2.5 text-dark-text/50 hover:text-dark-text text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
