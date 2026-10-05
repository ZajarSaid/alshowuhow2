"use client";

import { fill } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { localizeServiceName } from "@/lib/i18n/serviceNames";
import { useState, useEffect } from "react";
import CustomerFeedbackForm from "./CustomerFeedbackForm";

export type DbService = {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** The "Other" catch-all: selecting it collects free text, not a sub-service. */
  isCatchAll: boolean;
};
export type ServiceCategory = DbService & { subServices: DbService[] };

type FormData = {
  service: string;
  zipCode: string;
  description: string;
  name: string;
  email: string;
  phone: string;
  preferredContact: "email" | "phone" | "both";
  urgency: "NORMAL" | "URGENT";
  additionalNotes: string;
  otherServiceText: string;
};

const MAX_OTHER_SERVICE_TEXT = 500;

const initialData: FormData = {
  service: "",
  zipCode: "",
  description: "",
  name: "",
  email: "",
  phone: "",
  preferredContact: "email",
  urgency: "NORMAL",
  additionalNotes: "",
  otherServiceText: "",
};

const STEPS_BASE = ["Service", "Location", "Project Details", "Contact Info", "Review"];

type Props = {
  initialServiceId?: string;
  categories: ServiceCategory[];
};

function resolvePreselect(initialServiceId: string | undefined, categories: ServiceCategory[]) {
  if (!initialServiceId) return { category: "", service: "" };
  for (const cat of categories) {
    if (cat.subServices.some((s) => s.id === initialServiceId)) {
      return { category: cat.id, service: initialServiceId };
    }
  }
  const cat = categories.find((c) => c.id === initialServiceId);
  if (cat) {
    // A catch-all category is its own service row, so serviceId is the
    // category id itself — the free text is collected on the same step.
    return { category: cat.id, service: cat.isCatchAll ? cat.id : "" };
  }
  return { category: "", service: "" };
}

export default function CustomerRequestForm({ initialServiceId, categories }: Props) {
  const { t, locale } = useI18n();
  const STEPS = t.form?.steps ?? STEPS_BASE;
  const preselect = resolvePreselect(initialServiceId, categories);

  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(preselect.category);
  const [data, setData] = useState<FormData>({
    ...initialData,
    service: preselect.service,
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) window.scrollTo(0, 0);
  }, [submitted]);

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const selectedCat = categories.find((c) => c.id === selectedCategory);
  // "Other" has no sub-services: the step becomes a free-text box instead of a
  // second grid, and the catch-all row itself is the serviceId.
  const isCatchAll = Boolean(selectedCat?.isCatchAll);
  const otherTextLength = data.otherServiceText.trim().length;

  const isStepValid = (s: number): boolean => {
    switch (s) {
      case 0:
        if (!data.service) return false;
        return isCatchAll ? otherTextLength > 0 : true;
      case 1:
        return /^\d{5}$/.test(data.zipCode.trim());
      case 2:
        return data.description.trim().length > 0;
      case 3:
        return (
          data.name.trim().length > 0 &&
          /^\S+@\S+\.\S+$/.test(data.email.trim())
        );
      default:
        return true;
    }
  };

  const stepHints: Record<number, string> = {
    0: isCatchAll
      ? "Tell us what service you need in a few words."
      : "Choose a category, then pick the specific service you need.",
    1: "Enter a valid 5-digit ZIP code to continue.",
    2: "Describe your project to continue.",
    3: "Enter your name and a valid email to continue.",
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/customer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          serviceId: data.service,
          zipCode: data.zipCode,
          description: data.description,
          preferredContactMethod: data.preferredContact,
          urgency: data.urgency,
          additionalNotes: data.additionalNotes || null,
          otherServiceText: isCatchAll ? data.otherServiceText.trim() : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to submit request");
      }
      const result = await res.json();
      setRequestId(result.request?.id || null);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We couldn't submit your request right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-dark-text mb-4">Request Received!</h2>
        <p className="text-dark-text/60 text-lg mb-8">
          Thank you for contacting ALshowUhow. We&apos;ve received your service request and are working to identify an appropriate local provider.
        </p>
        <p className="text-sm text-dark-text/50">
          {data.preferredContact === "phone" ? (
            <>Our team will contact you by phone at <span className="font-medium">{data.phone}</span> with an update.</>
          ) : data.preferredContact === "both" ? (
            <>Our team will reach out to you at <span className="font-medium">{data.phone}</span> or <span className="font-medium">{data.email}</span> with an update.</>
          ) : (
            <>Our team will contact you at <span className="font-medium">{data.email}</span> with an update.</>
          )}
        </p>

        {requestId && (
          <div className="mt-12 text-left">
            <CustomerFeedbackForm serviceRequestId={requestId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">{t.form?.title ?? t.hero.ctaService}</h1>
        <p className="text-gray-600 mt-2">
          {t.form?.subtitle ?? "Fill out the form below and we'll match you with local professionals."}
        </p>
      </div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="sm:hidden text-crimson text-sm font-medium">
            {fill(t.form?.stepOf ?? "Step {current} of {total}", {
              current: String(step + 1),
              total: String(STEPS.length),
            })}
          </span>
          {STEPS.map((s: string, i: number) => (
            <div
              key={s}
              className={`hidden sm:block text-sm font-medium ${i <= step ? "text-crimson" : "text-dark-text/40"}`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-crimson to-purple h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Step 1: Service */}
        {step === 0 && (
          <div>
            {!selectedCategory ? (
              <>
                <h3 className="text-xl font-bold text-dark-text mb-6">What type of service do you need?</h3>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        // A catch-all category is the serviceId itself and skips
                        // the sub-service grid; everything else starts empty.
                        setData((prev) => ({
                          ...prev,
                          service: cat.isCatchAll ? cat.id : "",
                          otherServiceText: "",
                        }));
                      }}
                      className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 hover:border-gray-300"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <div className="font-medium mt-2">{localizeServiceName(locale, cat)}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : isCatchAll ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-dark-text">What do you need?</h3>
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      setData((prev) => ({ ...prev, service: "", otherServiceText: "" }));
                    }}
                    className="text-sm font-medium text-crimson hover:text-crimson-dark hover:underline"
                  >
                    ← Change category
                  </button>
                </div>
                <div>
                  <label htmlFor="otherServiceText" className="block text-sm font-medium text-dark-text/70 mb-2">
                    Describe the service you&apos;re looking for
                  </label>
                  <textarea
                    id="otherServiceText"
                    value={data.otherServiceText}
                    onChange={(e) => update("otherServiceText", e.target.value)}
                    placeholder="e.g. I need someone to install a ceiling fan in my living room"
                    rows={4}
                    maxLength={MAX_OTHER_SERVICE_TEXT}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-dark-text/50">
                      A sentence or two is plenty — we&apos;ll find the right provider.
                    </span>
                    {data.otherServiceText.length > MAX_OTHER_SERVICE_TEXT - 80 && (
                      <span className="text-xs text-dark-text/50 tabular-nums">
                        {data.otherServiceText.length}/{MAX_OTHER_SERVICE_TEXT}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-dark-text">
                    Select a specific {selectedCat ? localizeServiceName(locale, selectedCat) : ""} service
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      setData((prev) => ({ ...prev, service: "", otherServiceText: "" }));
                    }}
                    className="text-sm font-medium text-crimson hover:text-crimson-dark hover:underline"
                  >
                    ← Change category
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCat?.subServices.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => update("service", sub.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        data.service === sub.id
                          ? "border-crimson bg-crimson/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl">{sub.icon}</span>
                      <div className="font-medium mt-2">{localizeServiceName(locale, sub)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Location */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-bold text-dark-text mb-6">Where is the project?</h3>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">ZIP Code</label>
              <input
                type="text"
                value={data.zipCode}
                onChange={(e) => update("zipCode", e.target.value)}
                placeholder="Enter your ZIP code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
                maxLength={5}
              />
            </div>
          </div>
        )}

        {/* Step 3: Project Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-dark-text mb-6">Tell us about your project</h3>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Project Description</label>
              <textarea
                value={data.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe what you need done..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Urgency</label>
              <div className="flex gap-4">
                <button
                  onClick={() => update("urgency", "NORMAL")}
                  className={`px-6 py-2 rounded-lg border-2 font-medium ${
                    data.urgency === "NORMAL"
                      ? "border-crimson bg-crimson/5 text-crimson"
                      : "border-gray-200 text-dark-text/60"
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => update("urgency", "URGENT")}
                  className={`px-6 py-2 rounded-lg border-2 font-medium ${
                    data.urgency === "URGENT"
                      ? "border-crimson bg-crimson/5 text-crimson"
                      : "border-gray-200 text-dark-text/60"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Additional Notes (optional)</label>
              <textarea
                value={data.additionalNotes}
                onChange={(e) => update("additionalNotes", e.target.value)}
                placeholder="Any other details..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Contact Info */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-dark-text mb-6">How can we reach you?</h3>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Full Name</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Phone</label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crimson focus:border-crimson outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text/70 mb-2">Preferred Contact Method</label>
              <div className="flex gap-4">
                {(["email", "phone", "both"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => update("preferredContact", method)}
                    className={`px-6 py-2 rounded-lg border-2 font-medium capitalize ${
                      data.preferredContact === method
                        ? "border-crimson bg-crimson/5 text-crimson"
                        : "border-gray-200 text-dark-text/60"
                    }`}
                  >
                    {method === "both" ? "Email & Phone" : method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 4 && (
          <div>
            <h3 className="text-xl font-bold text-dark-text mb-6">Review Your Request</h3>
            <div className="space-y-4">
              {(() => {
                const sub = selectedCat?.subServices.find((s) => s.id === data.service);
                return (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-dark-text/60">Category</span>
                      <span className="font-medium">{selectedCat?.name || "Not selected"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-dark-text/60">Service</span>
                      <span className="font-medium">
                        {isCatchAll ? "Other (described below)" : sub?.name || "Not selected"}
                      </span>
                    </div>
                    {isCatchAll && (
                      <div className="py-2 border-b border-gray-100">
                        <span className="text-dark-text/60 block mb-1">Service you need</span>
                        <span className="text-sm">{data.otherServiceText || "Not provided"}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-dark-text/60">ZIP Code</span>
                <span className="font-medium">{data.zipCode || "Not entered"}</span>
              </div>
              <div className="py-2 border-b border-gray-100">
                <span className="text-dark-text/60 block mb-1">Description</span>
                <span className="text-sm">{data.description || "Not provided"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-dark-text/60">Name</span>
                <span className="font-medium">{data.name || "Not entered"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-dark-text/60">Email</span>
                <span className="font-medium">{data.email || "Not entered"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-dark-text/60">Phone</span>
                <span className="font-medium">{data.phone || "Not entered"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-dark-text/60">Preferred Contact</span>
                <span className="font-medium capitalize">
                  {data.preferredContact === "both" ? "Email & Phone" : data.preferredContact}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-dark-text/60">Urgency</span>
                <span className="font-medium capitalize">{data.urgency}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={prev}
            disabled={step === 0}
            className="px-6 py-2 text-dark-text/60 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:text-dark-text"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <div className="flex flex-col items-end gap-1">
              {!isStepValid(step) && stepHints[step] && (
                <span className="text-xs text-dark-text/50">{stepHints[step]}</span>
              )}
              <button
                onClick={next}
                disabled={!isStepValid(step)}
                className="px-8 py-3 bg-crimson text-white rounded-lg font-semibold hover:bg-crimson-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-crimson text-white rounded-lg font-semibold hover:bg-crimson-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
