"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import {
  CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH,
  CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH,
  CUSTOM_REQUEST_MAX_FILES,
  CUSTOM_REQUEST_MAX_NAME_LENGTH,
  CUSTOM_REQUEST_MAX_QUANTITY,
  CUSTOM_REQUEST_MIN_QUANTITY,
  CUSTOM_REQUEST_FILE_ACCEPT,
  CUSTOM_REQUEST_FILE_HINT,
  getCustomRequestFileExtension,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
} from "../../../lib/customRequests";
import {
  useDeleteCustomRequestFile,
  useSubmitCustomRequest,
  useUploadCustomRequestFile,
  type CustomRequestReferenceFileDraft,
} from "../../../lib/api/customRequests";
import { ApiClientError } from "../../../lib/api";
import { formatImageSize } from "../../../lib/customization";
import { WHATSAPP_URL } from "../../../lib/contact";
import styles from "./CustomRequestForm.module.css";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; filename: string; progress: number }
  | { status: "error"; message: string };

type SuccessState = {
  url: string;
  requestId: string;
  message: string;
  customerName: string;
};

type DragState = "idle" | "active";

const MATERIAL_OPTIONS = [
  {
    id: "pla-plus",
    name: "PLA+ Precision Matrix",
    tag: "Aesthetic & Prototyping",
    desc: "Ultra-crisp layer lines, ideal for concept models, figurines, and architectural mockups.",
  },
  {
    id: "petg-tough",
    name: "Industrial Tough PETG",
    tag: "Functional & Weather-Proof",
    desc: "Impact resistant, waterproof, and heat tolerant up to 75°C. Great for brackets and auto mounts.",
  },
  {
    id: "nylon-cf",
    name: "Engineering Carbon / Nylon",
    tag: "Heavy Mechanical & High Load",
    desc: "Rigid high-tensile material designed for functional gears, drone frames, and machinery parts.",
  },
  {
    id: "sla-resin",
    name: "Ultra-Detail SLA Resin",
    tag: "Micron Smooth Detail",
    desc: "Layerless injection-mold aesthetic for miniature sculptures, jewelry molds, and smooth prototypes.",
  },
] as const;

const INFILL_OPTIONS = [
  { id: "20%", label: "20% Standard", desc: "Lightweight, display & visual prototypes" },
  { id: "40%", label: "40% Structural", desc: "Balanced rigidity for functional use" },
  { id: "100%", label: "100% Solid Perimeter", desc: "Maximum load-bearing durability" },
] as const;

const COLOR_OPTIONS = [
  { id: "Matte Carbon Black", color: "#18181B" },
  { id: "Studio Warm White", color: "#F4F2EB" },
  { id: "Industrial Slate Gray", color: "#71717A" },
  { id: "Electric Acid Lime", color: "#CCFF00" },
  { id: "Natural Translucent", color: "#E2E8F0" },
] as const;

function CloudUploadIcon() {
  return (
    <svg
      className={styles.uploadCloudIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

function FileDocumentIcon() {
  return (
    <svg
      className={styles.fileIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className={styles.waIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.99.59 3.84 1.61 5.4L2 22l4.87-1.68a9.85 9.85 0 0 0 5.17 1.45h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2zm0 18.15c-1.63 0-3.18-.46-4.52-1.32l-.32-.2-3.32 1.15 1.16-3.23-.21-.34a8.16 8.16 0 0 1-1.25-4.3c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4a8.16 8.16 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.2 8.2v-.01zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.17.25-.65.8-.8 1-.15.19-.3.21-.55.08-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.03 2.6.12.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.2 1.16.17 1.6-.1.48-.3 1.46-1.2 1.67-1.73.2-.53.2-.99.14-1.08-.06-.09-.23-.15-.47-.27z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      className={styles.reassuranceIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg
      className={styles.alertIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className={styles.successIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function readFileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isValidReferenceExtension(extension: string) {
  return ["jpg", "jpeg", "png", "pdf", "stl", "obj", "step", "stp"].includes(extension);
}

export default function CustomRequestForm() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("pla-plus");
  const [selectedInfill, setSelectedInfill] = useState<string>("20%");
  const [selectedColor, setSelectedColor] = useState<string>("Matte Carbon Black");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"mm" | "cm" | "inch">("cm");
  const [quantity, setQuantity] = useState<number>(1);
  const [additional, setAdditional] = useState("");
  const [files, setFiles] = useState<CustomRequestReferenceFileDraft[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [dragState, setDragState] = useState<DragState>("idle");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadMutation = useUploadCustomRequestFile();
  const deleteMutation = useDeleteCustomRequestFile();
  const submitMutation = useSubmitCustomRequest();
  const isSubmitting = submitMutation.isPending;

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragState("active");
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragState("idle");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragState("idle");

    if (event.dataTransfer.files?.length) {
      void processFiles(event.dataTransfer.files);
    }
  }

  async function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void processFiles(event.target.files);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function processFiles(fileList: FileList) {
    const list = Array.from(fileList);
    setFormError("");
    setUploadState({ status: "idle" });

    for (const file of list) {
      if (files.length >= CUSTOM_REQUEST_MAX_FILES) {
        setFormError(
          `You can upload up to ${CUSTOM_REQUEST_MAX_FILES} reference files.`
        );
        break;
      }

      const extension = getCustomRequestFileExtension(file.name);
      if (!isValidReferenceExtension(extension)) {
        setFormError(
          "Unsupported file format. Please upload STL, OBJ, STEP, PDF, JPG, or PNG files."
        );
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormError(
          `This file exceeds the limit. Please upload files under ${formatImageSize(5 * 1024 * 1024)}.`
        );
        continue;
      }

      try {
        setUploadState({ status: "uploading", filename: file.name, progress: 50 });
        const dataUrl = await readFileToDataUrl(file);
        setUploadState({ status: "uploading", filename: file.name, progress: 85 });
        const uploaded = await uploadMutation.mutateAsync({
          fileDataUrl: dataUrl,
          filename: file.name,
        });
        setFiles((current) => [...current, { ...uploaded }]);
        setUploadState({ status: "idle" });
      } catch (error) {
        const details =
          error instanceof ApiClientError
            ? error.message
            : "Please try again.";
        const message = `File upload failed: ${details}`;
        setUploadState({ status: "error", message });
        break;
      }
    }
  }

  async function handleRemoveFile(file: CustomRequestReferenceFileDraft, index: number) {
    try {
      setFormError("");
      await deleteMutation.mutateAsync({
        publicId: file.publicId,
        deleteToken: file.deleteToken,
        resourceType: file.resourceType ?? "image",
      });
    } catch (error) {
      const details =
        error instanceof ApiClientError
          ? error.message
          : "Please try again.";
      const message = `Could not remove file: ${details}`;
      setFormError(message);
      return;
    }

    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function getDimensionsRecord() {
    const record: {
      length?: number;
      width?: number;
      height?: number;
      unit: "mm" | "cm" | "inch";
    } = {
      unit,
    };

    const parsedLength = parseFloat(length);
    if (length.trim() && Number.isFinite(parsedLength) && parsedLength > 0) {
      record.length = parsedLength;
    }

    const parsedWidth = parseFloat(width);
    if (width.trim() && Number.isFinite(parsedWidth) && parsedWidth > 0) {
      record.width = parsedWidth;
    }

    const parsedHeight = parseFloat(height);
    if (height.trim() && Number.isFinite(parsedHeight) && parsedHeight > 0) {
      record.height = parsedHeight;
    }

    const hasAny =
      record.length !== undefined ||
      record.width !== undefined ||
      record.height !== undefined;

    return hasAny ? record : undefined;
  }

  function handleQuantityStep(delta: number) {
    setQuantity((prev) =>
      Math.max(
        CUSTOM_REQUEST_MIN_QUANTITY,
        Math.min(CUSTOM_REQUEST_MAX_QUANTITY, prev + delta)
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Please enter your name to proceed.");
      return;
    }

    if (trimmedName.length > CUSTOM_REQUEST_MAX_NAME_LENGTH) {
      setFormError("Your name is too long. Please shorten it.");
      return;
    }

    const normalizedWhatsApp = normalizeWhatsAppNumber(whatsapp);
    if (!isValidWhatsAppNumber(whatsapp)) {
      setFormError("Please enter a valid 10-digit WhatsApp number (e.g. 9876543210).");
      return;
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setFormError("Please describe your custom part, product, or replacement idea.");
      return;
    }

    if (trimmedDesc.length > CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH) {
      setFormError("Description is too long. Please shorten it.");
      return;
    }

    if (
      quantity < CUSTOM_REQUEST_MIN_QUANTITY ||
      quantity > CUSTOM_REQUEST_MAX_QUANTITY
    ) {
      setFormError(
        `Quantity must be between ${CUSTOM_REQUEST_MIN_QUANTITY} and ${CUSTOM_REQUEST_MAX_QUANTITY}.`
      );
      return;
    }

    const materialName = MATERIAL_OPTIONS.find((m) => m.id === selectedMaterial)?.name ?? selectedMaterial;
    const combinedRequirements = [
      `Material: ${materialName}`,
      `Infill: ${selectedInfill}`,
      `Color/Finish: ${selectedColor}`,
      additional.trim() ? `Notes: ${additional.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    if (combinedRequirements.length > CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH) {
      setFormError("Additional requirement notes are too long. Please shorten them.");
      return;
    }

    if (files.length > CUSTOM_REQUEST_MAX_FILES) {
      setFormError(`You can upload up to ${CUSTOM_REQUEST_MAX_FILES} files.`);
      return;
    }

    try {
      const result = await submitMutation.mutateAsync({
        name: trimmedName,
        whatsappNumber: normalizedWhatsApp,
        description: trimmedDesc,
        dimensions: getDimensionsRecord(),
        quantity,
        referenceFiles: files,
        additionalRequirement: combinedRequirements || undefined,
      });

      setSuccess({
        url: result.whatsapp.url,
        requestId: result.request._id,
        message: result.whatsapp.message,
        customerName: trimmedName,
      });

      setName("");
      setWhatsapp("");
      setDescription("");
      setLength("");
      setWidth("");
      setHeight("");
      setUnit("cm");
      setQuantity(1);
      setAdditional("");
      setFiles([]);
    } catch (error) {
      const details =
        error instanceof ApiClientError
          ? error.message
          : "Please try again.";
      const message = `We couldn't submit your custom quote request: ${details}`;
      setFormError(message);
    }
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className={styles.sectionShell}>
      {success ? (
        <section className={styles.successContainer} aria-live="polite">
          <div className={styles.successIconWrap}>
            <CheckCircleIcon />
          </div>
          <p className={styles.successKicker}>REQUEST CONFIRMED · DIRECT WORKSHOP REVIEW</p>
          <h2 className={styles.successTitle}>
            Your Custom 3D Request is Received!<br />
            <span>Request #{success.requestId.slice(-6).toUpperCase()}</span>
          </h2>
          <p className={styles.successText}>
            Thank you {success.customerName}. Our workshop engineering team in Ranchi has received your file uploads and requirements. We are preparing your complimentary 3D slice analysis and will share the instant quote directly on WhatsApp.
          </p>
          <div className={styles.requestIdBadge}>
            <span>Request Identifier:</span>
            <strong>#{success.requestId}</strong>
          </div>
          <div className={styles.successActions}>
            <a
              className={styles.successWaButton}
              href={success.url}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
              <span>Connect on WhatsApp for Instant Quote &rarr;</span>
            </a>
            <button
              type="button"
              className={styles.successResetButton}
              onClick={() => setSuccess(null)}
            >
              Submit Another 3D Part
            </button>
            <Link className={styles.successResetButton} href="/shop">
              Explore Catalog
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Section A: Editorial Intro Header */}
          <header className={styles.introHeader}>
            <div className={styles.introBadgeRow}>
              <span className={styles.introBadge}>
                <span className={styles.introBadgeDot} aria-hidden="true" />
                BESPOKE 3D MANUFACTURING
              </span>
              <div className={styles.responseTimeBadge}>
                <span className={styles.pulseDot} aria-hidden="true" />
                Average review time: ~10 mins on WhatsApp
              </div>
            </div>
            <h1 className={styles.introHeading}>Bring Your Idea Into Physical Reality</h1>
            <p className={styles.introTagline}>
              Industrial Additive Manufacturing · Rapid Prototyping &amp; Custom Replacement Parts
            </p>
            <p className={styles.introDescription}>
              Need custom 3D printing, a functional prototype, a personalized artifact, or an exact replacement for a broken component? Upload your 3D files (STL/OBJ/STEP) or sketches below for immediate engineer evaluation and a zero-obligation quotation.
            </p>
          </header>

          {/* Section B: Two-Column Form Layout */}
          <form className={styles.formGrid} onSubmit={handleSubmit} noValidate>
            {/* Left Column: File Upload & Drawing Reassurance */}
            <div className={styles.leftColumn}>
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>
                  1. Upload 3D Files or Photos
                  <span className={styles.columnTitleSub}>CAD Models, Sketches &amp; Samples</span>
                </h2>
                <p className={styles.columnSubtitle}>
                  Supported formats: STL, OBJ, STEP, PDF, JPG, PNG. (Up to {CUSTOM_REQUEST_MAX_FILES} files, 5 MB each).
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                className={`${styles.uploadDropzone}${
                  dragState === "active" ? ` ${styles.isDragOver}` : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFilePicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerFilePicker();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload reference files: choose files or drag and drop"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CUSTOM_REQUEST_FILE_ACCEPT}
                  multiple
                  onChange={handleFileInputChange}
                  hidden
                />
                <CloudUploadIcon />
                <button
                  type="button"
                  className={styles.uploadCtaButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFilePicker();
                  }}
                >
                  Choose 3D Files or Photos
                </button>
                <p className={styles.uploadHint}>or drag and drop your CAD files here</p>
                <p className={styles.uploadFormatBadge}>
                  {CUSTOM_REQUEST_FILE_HINT} · Instant Cloud Encryption
                </p>
              </div>

              {/* Uploading Status Indicator */}
              {uploadState.status === "uploading" && (
                <div className={styles.uploadProgressBox} role="status">
                  <span className={styles.uploadSpinner} aria-hidden="true" />
                  <span>Uploading securely: {uploadState.filename}</span>
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadState.status === "error" && (
                <div className={styles.alertBanner} role="alert">
                  <AlertCircleIcon />
                  <span>{uploadState.message}</span>
                </div>
              )}

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <ul className={styles.fileList} aria-label="Uploaded reference files">
                  {files.map((file, index) => (
                    <li key={`${file.publicId}-${index}`} className={styles.fileItem}>
                      <div className={styles.fileItemMain}>
                        <FileDocumentIcon />
                        <div className={styles.fileItemText}>
                          <span className={styles.fileName}>{file.filename ?? "Reference file"}</span>
                          {file.size !== undefined && (
                            <span className={styles.fileSize}>{formatImageSize(file.size)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.fileRemoveBtn}
                        aria-label={`Remove ${file.filename ?? "reference file"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveFile(file, index);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Drawing Reassurance Card */}
              <div className={styles.reassuranceCard}>
                <LightbulbIcon />
                <div className={styles.reassuranceBody}>
                  <p className={styles.reassuranceTitle}>Don’t Have a 3D File? No Problem!</p>
                  <p className={styles.reassuranceText}>
                    You can share a rough sketch with dimensions, photos of a broken part taken from multiple angles, or a reference link. Our in-house CAD team can model it for you.
                  </p>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.reassuranceWaLink}
                  >
                    <span>Consult on WhatsApp directly</span>
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>

              {/* Studio Quality Badges */}
              <div className={styles.studioProofCard}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800 mb-2">Our Manufacturing Standard</h4>
                <div className="space-y-2 text-xs text-neutral-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon />
                    <span><strong>±0.1 mm</strong> High Precision Dimensional Tolerances</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon />
                    <span><strong>100% In-House</strong> Sintering &amp; Hand Deburring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon />
                    <span><strong>GST Verified</strong> Official Tax Invoice with GSTIN 20KIRPK6636R1ZA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Specifications & Contact Details */}
            <div className={styles.rightColumn}>
              <div className={styles.rightHeader}>
                <h2 className={styles.rightHeading}>
                  2. Fabrication Details &amp; Contact
                </h2>
                <span className={styles.speedBadge}>
                  ⚡ Takes ~30 seconds
                </span>
              </div>

              {formError && (
                <div className={styles.alertBanner} role="alert">
                  <AlertCircleIcon />
                  <span>{formError}</span>
                </div>
              )}

              <div className={styles.formFields}>
                {/* Contact: Name & WhatsApp */}
                <div className={styles.fieldRowTwo}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="cr-name" className={styles.fieldLabel}>
                      Your Full Name
                      <span className={styles.requiredStar} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="cr-name"
                      type="text"
                      className={styles.inputField}
                      placeholder="e.g. Ritik Kumar"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={CUSTOM_REQUEST_MAX_NAME_LENGTH}
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="cr-whatsapp" className={styles.fieldLabel}>
                      WhatsApp Number (For Instant Quote)
                      <span className={styles.requiredStar} aria-hidden="true">*</span>
                    </label>
                    <div className={styles.phoneWrapper}>
                      <span className={styles.phonePrefix} aria-hidden="true">
                        🇮🇳 +91
                      </span>
                      <input
                        id="cr-whatsapp"
                        type="tel"
                        className={styles.phoneInput}
                        placeholder="10-digit number (e.g. 9876543210)"
                        value={whatsapp}
                        onChange={(event) => setWhatsapp(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Description of Idea / Part */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="cr-description" className={styles.fieldLabel}>
                    Describe Your Product or Part
                    <span className={styles.requiredStar} aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="cr-description"
                    className={styles.textareaField}
                    rows={3}
                    placeholder="e.g. Broken gear replacement for appliance, architectural desk organizer, custom GoPro gimbal mount, or rapid drone prototype..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH}
                    required
                  />
                </div>

                {/* Material Grade Selector Cards */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Select Material Grade
                    <span className={styles.fieldLabelSub}>· Choose based on required strength and environment</span>
                  </label>
                  <div className={styles.materialGrid}>
                    {MATERIAL_OPTIONS.map((material) => {
                      const isSelected = selectedMaterial === material.id;
                      return (
                        <div
                          key={material.id}
                          className={`${styles.materialCard}${isSelected ? ` ${styles.isMaterialSelected}` : ""}`}
                          onClick={() => setSelectedMaterial(material.id)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedMaterial(material.id);
                            }
                          }}
                        >
                          <div className={styles.materialCardTop}>
                            <span className={styles.materialName}>{material.name}</span>
                            <span className={styles.materialTag}>{material.tag}</span>
                          </div>
                          <p className={styles.materialDesc}>{material.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Infill / Structural Strength Selector */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Infill Density &amp; Internal Structure
                  </label>
                  <div className={styles.infillOptions}>
                    {INFILL_OPTIONS.map((infill) => {
                      const isSelected = selectedInfill === infill.id;
                      return (
                        <button
                          key={infill.id}
                          type="button"
                          className={`${styles.infillBtn}${isSelected ? ` ${styles.isInfillSelected}` : ""}`}
                          onClick={() => setSelectedInfill(infill.id)}
                        >
                          <strong>{infill.label}</strong>
                          <span>{infill.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color & Surface Finish Preference */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Color / Surface Tone: <span className="font-semibold text-neutral-900">{selectedColor}</span>
                  </label>
                  <div className={styles.colorChips}>
                    {COLOR_OPTIONS.map((col) => {
                      const isSelected = selectedColor === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          className={`${styles.colorChip}${isSelected ? ` ${styles.isColorSelected}` : ""}`}
                          onClick={() => setSelectedColor(col.id)}
                          title={col.id}
                        >
                          <span className={styles.colorDot} style={{ backgroundColor: col.color }} />
                          <span>{col.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Approx Dimensions Row */}
                <div className={styles.qtyDimRow}>
                  {/* Quantity Stepper */}
                  <div className={styles.fieldGroup}>
                    <label htmlFor="cr-quantity" className={styles.fieldLabel}>
                      Quantity
                    </label>
                    <div className={styles.quantityStepper}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => handleQuantityStep(-1)}
                        aria-label="Decrease quantity"
                      >
                        &minus;
                      </button>
                      <input
                        id="cr-quantity"
                        type="number"
                        className={styles.qtyInput}
                        min={CUSTOM_REQUEST_MIN_QUANTITY}
                        max={CUSTOM_REQUEST_MAX_QUANTITY}
                        step="1"
                        value={quantity}
                        onChange={(event) => {
                          const val = Number(event.target.value);
                          if (!Number.isNaN(val)) {
                            setQuantity(
                              Math.max(
                                CUSTOM_REQUEST_MIN_QUANTITY,
                                Math.min(
                                  CUSTOM_REQUEST_MAX_QUANTITY,
                                  Math.trunc(val)
                                )
                              )
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => handleQuantityStep(1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dimensions Inputs (Optional) */}
                  <div className={styles.dimensionsBox}>
                    <div className={styles.dimensionsHeader}>
                      <span className={styles.dimensionsTitle}>
                        Approx Dimensions (Optional)
                      </span>
                      <span className={styles.dimensionsSub}>Leave blank if unknown</span>
                    </div>
                    <div className={styles.dimensionsGrid}>
                      <input
                        id="cr-length"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Length"
                        aria-label="Length"
                        className={styles.dimInput}
                        value={length}
                        onChange={(event) => setLength(event.target.value)}
                      />
                      <input
                        id="cr-width"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Width"
                        aria-label="Width"
                        className={styles.dimInput}
                        value={width}
                        onChange={(event) => setWidth(event.target.value)}
                      />
                      <input
                        id="cr-height"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Height"
                        aria-label="Height"
                        className={styles.dimInput}
                        value={height}
                        onChange={(event) => setHeight(event.target.value)}
                      />
                      <select
                        id="cr-unit"
                        aria-label="Dimension Unit"
                        className={styles.dimSelect}
                        value={unit}
                        onChange={(event) =>
                          setUnit(event.target.value as "mm" | "cm" | "inch")
                        }
                      >
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                        <option value="inch">inch</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Requirements / Special Instructions */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="cr-additional" className={styles.fieldLabel}>
                    Additional Notes or Special Tolerances (Optional)
                  </label>
                  <textarea
                    id="cr-additional"
                    className={`${styles.textareaField} ${styles.textareaFieldSmall}`}
                    rows={2}
                    placeholder="e.g. Need threaded brass inserts, urgent 24-hr rush delivery, or custom engraving..."
                    value={additional}
                    onChange={(event) => setAdditional(event.target.value)}
                    maxLength={CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH}
                  />
                </div>

                {/* Instant Turnaround & Quote Assurance Card */}
                <div className={styles.quoteEstimateCard}>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DC]">
                    <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">Turnaround &amp; Pricing</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      100% Free Consultation
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-neutral-500 block">Estimated Fabrication:</span>
                      <strong className="text-neutral-900">24 – 48 Hours</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Dispatch Hub:</span>
                      <strong className="text-neutral-900">Ranchi, JH Direct</strong>
                    </div>
                  </div>
                </div>

                {/* Action CTAs */}
                <div className={styles.actionSection}>
                  <button
                    type="submit"
                    className={styles.primaryQuoteBtn}
                    disabled={isSubmitting}
                  >
                    <span>
                      {isSubmitting
                        ? "Submitting Your 3D Request…"
                        : "GET FREE CUSTOM 3D QUOTE"}
                    </span>
                    <span className={styles.primaryQuoteBtnArrow} aria-hidden="true">
                      &rarr;
                    </span>
                  </button>

                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.secondaryWaBtn}
                  >
                    <WhatsAppIcon />
                    <span>Chat Directly with Studio Maker on WhatsApp</span>
                  </a>

                  <p className={styles.footerNote}>
                    🔒 No upfront payment required. Our engineering team reviews each design and confirms the 3D sliced estimate with you first.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}