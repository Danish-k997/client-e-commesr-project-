"use client";

import React, { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  useSubmitCustomRequest,
  useUploadCustomRequestFile,
  type CustomRequestReferenceFileDraft,
} from "../../lib/api/customRequests";
import { WHATSAPP_URL } from "../../lib/contact";

export default function CustomRequestSection() {
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [additionalRequirement, setAdditionalRequirement] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<CustomRequestReferenceFileDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");
  const [submittedData, setSubmittedData] = useState<{
    requestId: string;
    whatsappUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadCustomRequestFile();
  const submitMutation = useSubmitCustomRequest();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileDataUrl = reader.result as string;
          const result = await uploadMutation.mutateAsync({
            filename: file.name,
            fileDataUrl,
          });

          setReferenceFiles((prev) => [
            ...prev,
            {
              url: result.url,
              publicId: result.publicId,
              deleteToken: result.deleteToken,
              filename: result.filename,
              mime: result.mime,
              size: result.size,
              resourceType: result.resourceType,
            },
          ]);
        } catch {
          setUploadError("Could not upload file. You can still submit and send it on WhatsApp.");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError("Failed to read file.");
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!whatsappNumber.trim()) {
      setFormError("Please enter your WhatsApp number.");
      return;
    }
    if (!description.trim()) {
      setFormError("Please describe what you want made.");
      return;
    }

    try {
      const response = await submitMutation.mutateAsync({
        name: name.trim(),
        whatsappNumber: whatsappNumber.trim(),
        description: description.trim(),
        quantity: Math.max(1, quantity),
        additionalRequirement: additionalRequirement.trim() || undefined,
        referenceFiles,
      });

      setSubmittedData({
        requestId: response.request._id,
        whatsappUrl: response.whatsapp?.url,
      });
    } catch {
      setFormError("Couldn't submit online right now. Please tap below to chat on WhatsApp directly.");
    }
  };

  return (
    <section className="py-16 md:py-24 relative" id="custom-order" aria-label="Custom 3D Print Order">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title with Consumer-Friendly Headline */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cream border border-brand-border text-[11px] font-bold tracking-widest uppercase text-brand-charcoal mb-3">
            <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
            <span>Fastest Way to Custom 3D Print</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-brand-charcoal tracking-tight leading-tight">
            APNA PRODUCT
            <br />
            <span className="inline-block relative">
              CUSTOMIZE KARWAIYE.
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-brand-accent/40 -z-10 -rotate-1"></span>
            </span>
          </h2>
          <p className="text-sm sm:text-base text-brand-muted mt-3">
            Photo bhejo, idea bhejo ya reference bhejo — hum aapki requirement ke according custom product banane mein help karenge.
          </p>
        </div>

        {/* 3 Visual Steps Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
          <div className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-3.5 shadow-subtle">
            <div className="w-8 h-8 rounded-lg bg-brand-accent font-heading font-bold text-xs flex items-center justify-center text-brand-charcoal">
              01
            </div>
            <div>
              <span className="text-xs font-heading font-bold text-brand-charcoal block">IDEA / PHOTO SEND</span>
              <span className="text-[11px] text-brand-muted">Upload sketch, image or file</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-3.5 shadow-subtle">
            <div className="w-8 h-8 rounded-lg bg-brand-cream border border-brand-border font-heading font-bold text-xs flex items-center justify-center text-brand-charcoal">
              02
            </div>
            <div>
              <span className="text-xs font-heading font-bold text-brand-charcoal block">DESIGN CONFIRM</span>
              <span className="text-[11px] text-brand-muted">Get 3D preview &amp; cost quote</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-3.5 shadow-subtle">
            <div className="w-8 h-8 rounded-lg bg-brand-cream border border-brand-border font-heading font-bold text-xs flex items-center justify-center text-brand-charcoal">
              03
            </div>
            <div>
              <span className="text-xs font-heading font-bold text-brand-charcoal block">CUSTOM PRODUCT READY</span>
              <span className="text-[11px] text-brand-muted">Printed &amp; shipped to your door</span>
            </div>
          </div>
        </div>

        {/* Two-Part Custom Order Interface Card */}
        <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-10 shadow-card max-w-5xl mx-auto">
          {submittedData ? (
            <div className="text-center py-12 px-4 max-w-lg mx-auto">
              <div className="w-16 h-16 mx-auto rounded-full bg-brand-accent text-brand-charcoal flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-brand-charcoal mb-2">
                CUSTOM REQUEST SUBMITTED!
              </h3>
              <p className="text-sm text-brand-muted mb-6">
                Thank you, <strong>{name}</strong>. Your request reference ID is{" "}
                <span className="font-mono font-bold text-brand-charcoal">#{submittedData.requestId.slice(-6)}</span>.
                Our team will review your specifications and contact you on WhatsApp shortly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={submittedData.whatsappUrl || `${WHATSAPP_URL}?text=Hi%20Kasar%20Dimensions,%20I%20just%20submitted%20request%20%23${submittedData.requestId.slice(-6)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>CONTINUE ON WHATSAPP</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedData(null);
                    setDescription("");
                    setReferenceFiles([]);
                  }}
                  className="py-3.5 px-6 rounded-xl bg-brand-cream border border-brand-border text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider"
                >
                  SUBMIT ANOTHER ITEM
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Visual Upload Area (5 cols) */}
              <div className="lg:col-span-5 bg-brand-cream/50 border-2 border-dashed border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-center min-h-[360px]">
                <div>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-brand-border flex items-center justify-center text-brand-charcoal mb-4 shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-brand-charcoal mb-1">PHOTO / IDEA BHEJIYE</h3>
                  <p className="text-xs text-brand-muted leading-relaxed max-w-xs mx-auto">
                    Product ki photo, sketch, STL file ya reference image upload karein.
                  </p>
                </div>

                <div className="my-6">
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-brand-cream border border-brand-border font-heading font-bold text-xs tracking-wider uppercase text-brand-charcoal transition-all shadow-sm">
                    <svg className="w-4 h-4 text-brand-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>{uploading ? "UPLOADING..." : "+ UPLOAD YOUR FILE"}</span>
                    <input
                      ref={fileInputRef}
                      className="hidden"
                      type="file"
                      accept="image/*,.stl,.obj,.step,.stp,.pdf"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                  {referenceFiles.length > 0 && (
                    <div className="mt-3 text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{referenceFiles.length} file(s) attached</span>
                    </div>
                  )}
                  {uploadError && <p className="mt-2 text-[11px] text-rose-600 font-medium">{uploadError}</p>}
                  <div className="mt-3 text-[11px] text-brand-muted font-medium">
                    Supported formats: <strong className="text-brand-charcoal">Image • STL • PDF • STEP</strong>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-3 border border-brand-border/60 text-left flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      clipRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      fillRule="evenodd"
                    />
                  </svg>
                  <p className="text-[11px] text-brand-muted">
                    Drawing nahi hai? No problem. Just rough sketch ya WhatsApp audio note se bhi kaam start ho jayega.
                  </p>
                </div>
              </div>

              {/* Right Side: Clean Short Form (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-heading font-bold text-xl text-brand-charcoal">CUSTOM ORDER DETAILS</h3>
                    <span className="text-[11px] text-brand-muted font-medium">Takes only 30 seconds</span>
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1.5">
                          Your Name
                        </label>
                        <input
                          className="w-full px-3.5 py-2.5 bg-brand-cream/30 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-charcoal transition-colors"
                          placeholder="e.g. Rahul Sharma"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1.5">
                          WhatsApp Number
                        </label>
                        <input
                          className="w-full px-3.5 py-2.5 bg-brand-cream/30 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-charcoal transition-colors"
                          placeholder="+91 98765 43210"
                          type="tel"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1.5">
                          What do you want made?
                        </label>
                        <input
                          className="w-full px-3.5 py-2.5 bg-brand-cream/30 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-charcoal transition-colors"
                          placeholder="e.g. Broken knob / Custom drone arm / Gift lamp"
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1.5">
                          Quantity
                        </label>
                        <input
                          className="w-full px-3.5 py-2.5 bg-brand-cream/30 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-charcoal transition-colors"
                          min="1"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1.5">
                        Additional Requirement (Optional)
                      </label>
                      <textarea
                        className="w-full px-3.5 py-2 bg-brand-cream/30 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-charcoal transition-colors resize-none"
                        placeholder="Mention size dimensions, color preference, or special material requirements..."
                        rows={2}
                        value={additionalRequirement}
                        onChange={(e) => setAdditionalRequirement(e.target.value)}
                      />
                    </div>

                    {formError && (
                      <p className="text-xs text-rose-600 font-medium" role="alert">
                        {formError}
                      </p>
                    )}

                    {/* Action CTAs */}
                    <div className="mt-6 pt-5 border-t border-brand-border">
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="submit"
                          disabled={submitMutation.isPending}
                          className="w-full sm:flex-1 py-4 px-6 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-sm uppercase tracking-wider transition-all shadow-sm hover:shadow text-center disabled:opacity-50"
                        >
                          {submitMutation.isPending ? "SUBMITTING..." : "GET MY CUSTOM QUOTE →"}
                        </button>
                        <a
                          className="w-full sm:w-auto py-4 px-5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-heading font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                          href={`${WHATSAPP_URL}?text=Hi%20Kasar%20Dimensions,%20I%20have%20a%20custom%203D%20print%20inquiry`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                          </svg>
                          <span>CHAT ON WHATSAPP</span>
                        </a>
                      </div>
                      <p className="text-center text-[11px] text-brand-muted mt-3">
                        ⚡ Average reply time: 10 mins • No technical knowledge required.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}