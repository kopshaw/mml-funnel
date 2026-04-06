"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Testimonial {
  name: string;
  text: string;
  result: string;
}

interface FormData {
  // Step 1 - Brand Info
  brandName: string;
  brandVoice: string;
  brandColors: string;
  websiteUrl: string;
  brandGuidelines: string;

  // Step 2 - Offer Details
  offerName: string;
  offerDescription: string;
  offerType: string;
  price: string;
  usps: string[];
  deliverables: string[];
  guarantee: string;

  // Step 3 - Audience & Proof
  targetAudience: string;
  targetPersona: string;
  painPoints: string[];
  desiredOutcomes: string[];
  demographics: string;
  testimonials: Testimonial[];
  competitorInfo: string;
  socialProof: string;

  // Step 4 - Campaign Config
  trafficSource: string;
  dailyBudget: string;
  campaignGoal: string;
  bookingUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Steps config                                                       */
/* ------------------------------------------------------------------ */

const steps = [
  { num: 1, label: "Brand Info" },
  { num: 2, label: "Offer Details" },
  { num: 3, label: "Audience & Proof" },
  { num: 4, label: "Campaign Config" },
  { num: 5, label: "Review & Generate" },
];

/* ------------------------------------------------------------------ */
/*  Initial state                                                      */
/* ------------------------------------------------------------------ */

const initialFormData: FormData = {
  brandName: "",
  brandVoice: "",
  brandColors: "",
  websiteUrl: "",
  brandGuidelines: "",

  offerName: "",
  offerDescription: "",
  offerType: "",
  price: "",
  usps: [],
  deliverables: [],
  guarantee: "",

  targetAudience: "",
  targetPersona: "",
  painPoints: [],
  desiredOutcomes: [],
  demographics: "",
  testimonials: [],
  competitorInfo: "",
  socialProof: "",

  trafficSource: "",
  dailyBudget: "",
  campaignGoal: "",
  bookingUrl: "",
};

/* ------------------------------------------------------------------ */
/*  Shared input styles                                                */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const textareaClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none";

const selectClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none";

const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

/* ------------------------------------------------------------------ */
/*  Reusable field components                                          */
/* ------------------------------------------------------------------ */

function FieldGroup({
  label,
  hint,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            (optional)
          </span>
        )}
      </label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

function MultiItemInput({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (idx: number) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInputValue("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-blue-500 hover:text-blue-400"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 border border-slate-700"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      {/* Steps row */}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          const isUpcoming = currentStep < step.num;

          return (
            <div key={step.num} className="flex flex-1 items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    isCompleted
                      ? "border-blue-500 bg-blue-600 text-white"
                      : isCurrent
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-slate-700 bg-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-blue-400"
                      : isCompleted
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="mx-3 mt-[-1.25rem] h-0.5 flex-1">
                  <div
                    className={`h-full rounded-full transition-colors ${
                      currentStep > step.num ? "bg-blue-500" : "bg-slate-700"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 - Brand Info                                                */
/* ------------------------------------------------------------------ */

function StepBrandInfo({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">
          Brand Information
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Tell us about the brand so AI can match its voice and identity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FieldGroup label="Brand Name">
          <input
            type="text"
            value={formData.brandName}
            onChange={(e) => onChange({ brandName: e.target.value })}
            placeholder="e.g. Metric Mentor Labs"
            className={inputClass}
          />
        </FieldGroup>

        <FieldGroup label="Website URL">
          <input
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => onChange({ websiteUrl: e.target.value })}
            placeholder="https://example.com"
            className={inputClass}
          />
        </FieldGroup>
      </div>

      <FieldGroup
        label="Brand Voice & Tone"
        hint="How should the brand sound? This shapes all generated copy."
      >
        <textarea
          value={formData.brandVoice}
          onChange={(e) => onChange({ brandVoice: e.target.value })}
          placeholder="e.g. Professional yet approachable. Data-driven but not robotic. Confident, direct, with a touch of wit."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>

      <FieldGroup
        label="Brand Colors"
        hint="Hex codes for primary and secondary colors"
      >
        <input
          type="text"
          value={formData.brandColors}
          onChange={(e) => onChange({ brandColors: e.target.value })}
          placeholder="e.g. #2563EB, #0F172A, #F8FAFC"
          className={inputClass}
        />
      </FieldGroup>

      {/* Logo upload placeholder */}
      <FieldGroup label="Logo" optional>
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 px-6 py-10 transition-colors hover:border-slate-600">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-2 text-sm text-slate-400">
              Drag and drop or click to upload
            </p>
            <p className="mt-1 text-xs text-slate-500">
              PNG, SVG, or JPG up to 5MB
            </p>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup
        label="Brand Guidelines"
        hint="Any additional guidelines, restrictions, or notes about the brand"
        optional
      >
        <textarea
          value={formData.brandGuidelines}
          onChange={(e) => onChange({ brandGuidelines: e.target.value })}
          placeholder="e.g. Never use exclamation marks in headlines. Always capitalize 'Agency'. Avoid words like 'cheap' or 'discount'."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 - Offer Details                                             */
/* ------------------------------------------------------------------ */

function StepOfferDetails({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Offer Details</h3>
        <p className="mt-1 text-sm text-slate-400">
          Define what you are selling. The more detail here, the better the
          generated funnel.
        </p>
      </div>

      <FieldGroup label="Offer Name">
        <input
          type="text"
          value={formData.offerName}
          onChange={(e) => onChange({ offerName: e.target.value })}
          placeholder="e.g. Agency Growth Accelerator Program"
          className={inputClass}
        />
      </FieldGroup>

      <FieldGroup
        label="Offer Description"
        hint="Describe the offer in detail -- what is it, what does the customer get?"
      >
        <textarea
          value={formData.offerDescription}
          onChange={(e) => onChange({ offerDescription: e.target.value })}
          placeholder="e.g. A 12-week done-with-you coaching program that helps digital agency owners scale from $10K/mo to $50K/mo using proven systems for lead gen, fulfillment, and client retention."
          rows={5}
          className={textareaClass}
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FieldGroup label="Offer Type">
          <div className="relative">
            <select
              value={formData.offerType}
              onChange={(e) => onChange({ offerType: e.target.value })}
              className={selectClass}
            >
              <option value="" disabled>
                Select offer type
              </option>
              <option value="Low Ticket (<$500)">Low Ticket (&lt;$500)</option>
              <option value="Mid Ticket ($500-$3k)">
                Mid Ticket ($500-$3k)
              </option>
              <option value="High Ticket ($3k+)">High Ticket ($3k+)</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </FieldGroup>

        <FieldGroup label="Price">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="4,997"
              className={`${inputClass} pl-7`}
            />
          </div>
        </FieldGroup>
      </div>

      <MultiItemInput
        label="USPs / Key Benefits"
        hint="What makes this offer unique? Add each benefit separately."
        items={formData.usps}
        onAdd={(item) => onChange({ usps: [...formData.usps, item] })}
        onRemove={(idx) =>
          onChange({ usps: formData.usps.filter((_, i) => i !== idx) })
        }
        placeholder="e.g. Guaranteed 3x ROI within 90 days"
      />

      <MultiItemInput
        label="Deliverables"
        hint="What does the customer actually receive?"
        items={formData.deliverables}
        onAdd={(item) =>
          onChange({ deliverables: [...formData.deliverables, item] })
        }
        onRemove={(idx) =>
          onChange({
            deliverables: formData.deliverables.filter((_, i) => i !== idx),
          })
        }
        placeholder="e.g. 12 weekly group coaching calls"
      />

      <FieldGroup label="Guarantee" optional>
        <textarea
          value={formData.guarantee}
          onChange={(e) => onChange({ guarantee: e.target.value })}
          placeholder="e.g. 30-day money-back guarantee, no questions asked. If you don't see results within the first 30 days, we'll refund 100% of your investment."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 - Audience & Proof                                          */
/* ------------------------------------------------------------------ */

function StepAudienceProof({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  const [newTestimonial, setNewTestimonial] = useState<Testimonial>({
    name: "",
    text: "",
    result: "",
  });

  function addTestimonial() {
    if (newTestimonial.name.trim() && newTestimonial.text.trim()) {
      onChange({
        testimonials: [...formData.testimonials, { ...newTestimonial }],
      });
      setNewTestimonial({ name: "", text: "", result: "" });
    }
  }

  function removeTestimonial(idx: number) {
    onChange({
      testimonials: formData.testimonials.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">
          Audience & Social Proof
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Who is this for, and why should they trust you?
        </p>
      </div>

      <FieldGroup
        label="Target Audience"
        hint="Broadly describe who this offer is for"
      >
        <textarea
          value={formData.targetAudience}
          onChange={(e) => onChange({ targetAudience: e.target.value })}
          placeholder="e.g. Digital marketing agency owners doing $10K-$30K/mo who want to scale but are stuck in fulfillment and can't find time to grow."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>

      <FieldGroup
        label="Target Persona"
        hint="Describe your ideal customer in detail"
      >
        <textarea
          value={formData.targetPersona}
          onChange={(e) => onChange({ targetPersona: e.target.value })}
          placeholder="e.g. 'Burnt-out Brandon' -- 32-year-old agency owner, 2-3 employees, working 60+ hours/week, good at delivery but terrible at sales and marketing."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MultiItemInput
          label="Pain Points"
          hint="What keeps them up at night?"
          items={formData.painPoints}
          onAdd={(item) =>
            onChange({ painPoints: [...formData.painPoints, item] })
          }
          onRemove={(idx) =>
            onChange({
              painPoints: formData.painPoints.filter((_, i) => i !== idx),
            })
          }
          placeholder="e.g. Feast-or-famine revenue cycles"
        />

        <MultiItemInput
          label="Desired Outcomes"
          hint="What do they want to achieve?"
          items={formData.desiredOutcomes}
          onAdd={(item) =>
            onChange({ desiredOutcomes: [...formData.desiredOutcomes, item] })
          }
          onRemove={(idx) =>
            onChange({
              desiredOutcomes: formData.desiredOutcomes.filter(
                (_, i) => i !== idx
              ),
            })
          }
          placeholder="e.g. Predictable $50K+ months"
        />
      </div>

      <FieldGroup label="Demographics" optional>
        <input
          type="text"
          value={formData.demographics}
          onChange={(e) => onChange({ demographics: e.target.value })}
          placeholder="e.g. 25-45, male-skewing, US/UK/AUS, English-speaking"
          className={inputClass}
        />
      </FieldGroup>

      {/* Testimonials */}
      <div>
        <label className={labelClass}>Testimonials</label>
        <p className="mb-3 text-xs text-slate-500">
          Add customer testimonials to strengthen the generated copy
        </p>

        {/* Existing testimonials */}
        {formData.testimonials.length > 0 && (
          <div className="mb-4 space-y-3">
            {formData.testimonials.map((t, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">
                      {t.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400 italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    {t.result && (
                      <p className="mt-1.5 text-xs font-medium text-emerald-400">
                        Result: {t.result}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTestimonial(idx)}
                    className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add testimonial form */}
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 p-4 space-y-3">
          <input
            type="text"
            value={newTestimonial.name}
            onChange={(e) =>
              setNewTestimonial({ ...newTestimonial, name: e.target.value })
            }
            placeholder="Customer name"
            className={inputClass}
          />
          <textarea
            value={newTestimonial.text}
            onChange={(e) =>
              setNewTestimonial({ ...newTestimonial, text: e.target.value })
            }
            placeholder="What did they say?"
            rows={2}
            className={textareaClass}
          />
          <input
            type="text"
            value={newTestimonial.result}
            onChange={(e) =>
              setNewTestimonial({ ...newTestimonial, result: e.target.value })
            }
            placeholder="Specific result (e.g. 'Went from $8K to $42K/mo in 90 days')"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTestimonial}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-blue-500 hover:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Add Testimonial
          </button>
        </div>
      </div>

      <FieldGroup
        label="Competitor Info"
        hint="Who are the main competitors and how are you different?"
        optional
      >
        <textarea
          value={formData.competitorInfo}
          onChange={(e) => onChange({ competitorInfo: e.target.value })}
          placeholder="e.g. Main competitors are AgencyVelocity ($2K/mo, group-only, no done-for-you) and ScaleSprint ($10K, too expensive for our market). We sit in the sweet spot."
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>

      <FieldGroup
        label="Social Proof"
        hint="Follower count, press mentions, awards, client count, revenue milestones"
        optional
      >
        <textarea
          value={formData.socialProof}
          onChange={(e) => onChange({ socialProof: e.target.value })}
          placeholder="e.g. 12K Instagram followers, featured in Forbes, 200+ agency owners served, $4M+ in client revenue generated"
          rows={3}
          className={textareaClass}
        />
      </FieldGroup>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 - Campaign Config                                           */
/* ------------------------------------------------------------------ */

function StepCampaignConfig({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">
          Campaign Configuration
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          How will you drive traffic and what is the goal?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FieldGroup label="Traffic Source">
          <div className="relative">
            <select
              value={formData.trafficSource}
              onChange={(e) => onChange({ trafficSource: e.target.value })}
              className={selectClass}
            >
              <option value="" disabled>
                Select traffic source
              </option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Organic">Organic</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </FieldGroup>

        <FieldGroup label="Daily Budget">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <input
              type="number"
              value={formData.dailyBudget}
              onChange={(e) => onChange({ dailyBudget: e.target.value })}
              placeholder="100"
              className={`${inputClass} pl-7`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              /day
            </span>
          </div>
        </FieldGroup>
      </div>

      <FieldGroup label="Campaign Goal">
        <div className="relative">
          <select
            value={formData.campaignGoal}
            onChange={(e) => onChange({ campaignGoal: e.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              Select campaign goal
            </option>
            <option value="Lead Generation">Lead Generation</option>
            <option value="Sales">Sales</option>
            <option value="Booking Calls">Booking Calls</option>
            <option value="Webinar Registration">Webinar Registration</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </FieldGroup>

      {(formData.campaignGoal === "Booking Calls" ||
        formData.campaignGoal === "Webinar Registration") && (
        <FieldGroup
          label="Booking / Registration URL"
          hint="Where should leads be sent to book or register?"
        >
          <input
            type="url"
            value={formData.bookingUrl}
            onChange={(e) => onChange({ bookingUrl: e.target.value })}
            placeholder="https://calendly.com/your-link"
            className={inputClass}
          />
        </FieldGroup>
      )}

      {/* Summary card */}
      {formData.trafficSource && formData.dailyBudget && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
          <h4 className="text-sm font-medium text-slate-300">
            Estimated Monthly Spend
          </h4>
          <p className="mt-1 text-2xl font-bold text-slate-100">
            ${(Number(formData.dailyBudget) * 30).toLocaleString()}
            <span className="text-sm font-normal text-slate-500">/month</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on ${formData.dailyBudget}/day via {formData.trafficSource}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 - Review & Generate                                         */
/* ------------------------------------------------------------------ */

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function ReviewList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300 border border-slate-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepReview({
  formData,
  generating,
  generated,
  onGenerate,
}: {
  formData: FormData;
  generating: boolean;
  generated: boolean;
  onGenerate: () => void;
}) {
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        </div>
        <h3 className="mt-6 text-xl font-semibold text-slate-100">
          AI is building your campaign...
        </h3>
        <p className="mt-2 max-w-md text-center text-sm text-slate-400">
          Generating landing pages, ad copy, email sequences, and funnel
          structure. This typically takes 30-60 seconds.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (generated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Check className="h-10 w-10 text-emerald-400" />
        </div>
        <h3 className="mt-6 text-xl font-semibold text-slate-100">
          Campaign Generated Successfully
        </h3>
        <p className="mt-2 max-w-md text-center text-sm text-slate-400">
          Your AI-powered campaign is ready for review. Check the landing pages,
          ad copy, and email sequences before launching.
        </p>
        <Link
          href="/campaigns/camp-new/review"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Sparkles className="h-4 w-4" />
          Review Generated Content
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">
          Review & Generate
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Review your campaign brief before generating. You can go back and edit
          any section.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReviewSection title="Brand Info">
          <ReviewRow label="Brand" value={formData.brandName} />
          <ReviewRow label="Website" value={formData.websiteUrl} />
          <ReviewRow label="Voice" value={formData.brandVoice} />
          <ReviewRow label="Colors" value={formData.brandColors} />
          {formData.brandGuidelines && (
            <div className="mt-2 border-t border-slate-800 pt-2">
              <span className="text-xs text-slate-500">Guidelines</span>
              <p className="mt-0.5 text-sm text-slate-300">
                {formData.brandGuidelines}
              </p>
            </div>
          )}
        </ReviewSection>

        <ReviewSection title="Offer Details">
          <ReviewRow label="Offer" value={formData.offerName} />
          <ReviewRow label="Type" value={formData.offerType} />
          <ReviewRow
            label="Price"
            value={formData.price ? `$${Number(formData.price).toLocaleString()}` : undefined}
          />
          <ReviewRow label="Guarantee" value={formData.guarantee} />
          <ReviewList label="USPs" items={formData.usps} />
          <ReviewList label="Deliverables" items={formData.deliverables} />
        </ReviewSection>

        <ReviewSection title="Audience & Proof">
          <ReviewRow label="Audience" value={formData.targetAudience} />
          <ReviewRow label="Persona" value={formData.targetPersona} />
          <ReviewRow label="Demographics" value={formData.demographics} />
          <ReviewList label="Pain Points" items={formData.painPoints} />
          <ReviewList label="Desired Outcomes" items={formData.desiredOutcomes} />
          {formData.testimonials.length > 0 && (
            <div className="mt-2 border-t border-slate-800 pt-2">
              <span className="text-xs text-slate-500">
                {formData.testimonials.length} testimonial
                {formData.testimonials.length !== 1 ? "s" : ""} added
              </span>
            </div>
          )}
        </ReviewSection>

        <ReviewSection title="Campaign Config">
          <ReviewRow label="Traffic Source" value={formData.trafficSource} />
          <ReviewRow
            label="Daily Budget"
            value={formData.dailyBudget ? `$${formData.dailyBudget}/day` : undefined}
          />
          <ReviewRow label="Goal" value={formData.campaignGoal} />
          <ReviewRow label="Booking URL" value={formData.bookingUrl} />
          <ReviewRow
            label="Monthly Spend"
            value={
              formData.dailyBudget
                ? `$${(Number(formData.dailyBudget) * 30).toLocaleString()}/mo`
                : undefined
            }
          />
        </ReviewSection>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30 active:scale-[0.99]"
      >
        <Rocket className="h-5 w-5" />
        Generate Campaign with AI
      </button>
      <p className="text-center text-xs text-slate-500">
        This will use AI to generate landing pages, ad copy, email sequences,
        and funnel structure based on your brief.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function updateFormData(updates: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function handleGenerate() {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 4000);
  }

  function goNext() {
    if (currentStep < 5) setCurrentStep((s) => s + 1);
  }

  function goBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">
          Create New Campaign
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Fill out your campaign brief and let AI build the entire funnel.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 md:p-8">
        {currentStep === 1 && (
          <StepBrandInfo formData={formData} onChange={updateFormData} />
        )}
        {currentStep === 2 && (
          <StepOfferDetails formData={formData} onChange={updateFormData} />
        )}
        {currentStep === 3 && (
          <StepAudienceProof formData={formData} onChange={updateFormData} />
        )}
        {currentStep === 4 && (
          <StepCampaignConfig formData={formData} onChange={updateFormData} />
        )}
        {currentStep === 5 && (
          <StepReview
            formData={formData}
            generating={generating}
            generated={generated}
            onGenerate={handleGenerate}
          />
        )}
      </div>

      {/* Navigation buttons */}
      {!generating && !generated && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
              currentStep === 1
                ? "cursor-not-allowed text-slate-600"
                : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-white"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep < 5 && (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
