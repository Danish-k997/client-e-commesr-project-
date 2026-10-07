"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; filename: string; progress: number }
  | { status: "error"; message: string };

type SuccessState = {
  url: string;
  requestId: string;
  message: string;
};

type DragState = "idle" | "active";

const WHATSAPP_BASE = "https://wa.me/918102888865";

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

function formatFileSize(bytes: number) {
  return formatImageSize(bytes);
}

function isValidReferenceExtension(extension: string) {
  return ["jpg", "jpeg", "png", "pdf", "stl", "step", "stp"].includes(extension);
}

export default function CustomRequestForm() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
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

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragState("active");
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragState("idle");
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
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
        setFormError(`आप ${CUSTOM_REQUEST_MAX_FILES} से ज्यादा फाइल नहीं भेज सकते।`);
        break;
      }

      const extension = getCustomRequestFileExtension(file.name);
      if (!isValidReferenceExtension(extension)) {
        setFormError("यह file प्रकार सपोर्ट नहीं है। JPG, PNG, PDF, STL या STEP भेजें।");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormError(`फाइल बहुत बड़ी है। ${formatFileSize(5 * 1024 * 1024)} से छोटी फाइल भेजें।`);
        continue;
      }

      try {
        setUploadState({ status: "uploading", filename: file.name, progress: 50 });
        const dataUrl = await readFileToDataUrl(file);
        setUploadState({ status: "uploading", filename: file.name, progress: 85 });
        const uploaded = await uploadMutation.mutateAsync({ fileDataUrl: dataUrl, filename: file.name });
        setFiles((current) => [...current, { ...uploaded }]);
        setUploadState({ status: "idle" });
      } catch (error) {
        const message =
          error instanceof ApiClientError ? error.message : "फाइल upload नहीं हो पाई। कृपया दोबारा try करें।";
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
      const message =
        error instanceof ApiClientError
          ? error.message
          : "फाइल हटाई नहीं जा सकी। कृपया दोबारा try करें।";
      setFormError(message);
      return;
    }

    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function getDimensionsRecord() {
    const record: { length?: number; width?: number; height?: number; unit: "mm" | "cm" | "inch" } = {
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

    const hasAny = record.length !== undefined || record.width !== undefined || record.height !== undefined;

    return hasAny ? record : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess(null);

    if (!name.trim()) {
      setFormError("अपना नाम भरना जरूरी है।");
      return;
    }

    if (name.trim().length > CUSTOM_REQUEST_MAX_NAME_LENGTH) {
      setFormError("नाम बहुत लंबा है। कृपया छोटा नाम लिखें।");
      return;
    }

    const normalizedWhatsApp = normalizeWhatsAppNumber(whatsapp);
    if (!isValidWhatsAppNumber(whatsapp)) {
      setFormError("कृपया सही WhatsApp नंबर भरें। यह 10 अंकों का होना चाहिए (जैसे 9876543210)।");
      return;
    }

    if (!description.trim()) {
      setFormError("कृपया बताइए कि आपको क्या बनवाना है।");
      return;
    }

    if (description.trim().length > CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH) {
      setFormError("जानकारी बहुत लंबी है। कृपया छोटी रखें।");
      return;
    }

    if (quantity < CUSTOM_REQUEST_MIN_QUANTITY || quantity > CUSTOM_REQUEST_MAX_QUANTITY) {
      setFormError(`पीस की संख्या ${CUSTOM_REQUEST_MIN_QUANTITY} से ${CUSTOM_REQUEST_MAX_QUANTITY} के बीच रखें।`);
      return;
    }

    if (additional.trim().length > CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH) {
      setFormError("अतिरिक्त जानकारी बहुत लंबी है। कृपया छोटी रखें।");
      return;
    }

    if (files.length > CUSTOM_REQUEST_MAX_FILES) {
      setFormError(`आप ${CUSTOM_REQUEST_MAX_FILES} से ज्यादा फाइल नहीं भेज सकते।`);
      return;
    }

    try {
      const result = await submitMutation.mutateAsync({
        name: name.trim(),
        whatsappNumber: normalizedWhatsApp,
        description: description.trim(),
        dimensions: getDimensionsRecord(),
        quantity,
        referenceFiles: files,
        additionalRequirement: additional.trim() ? additional.trim() : undefined,
      });

      setSuccess({
        url: result.whatsapp.url,
        requestId: result.request._id,
        message: result.whatsapp.message,
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
      const message =
        error instanceof ApiClientError ? error.message : "जानकारी भेजी नहीं जा सकी। कृपया दोबारा try करें।";
      setFormError(message);
    } finally {
      // no-op
    }
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className="custom-request-form-shell">
      {success ? (
        <section className="custom-request-success" aria-live="polite">
          <h2>आपकी जानकारी मिल गई!</h2>
          <p>धन्यवाद। आपकी जानकारी देखकर हम आपसे WhatsApp पर बात करेंगे।</p>
          <p className="custom-request-success-id">Request ID: {success.requestId}</p>
          <div className="custom-request-success-actions">
            <a
              className="site-primary-cta custom-request-wa-link"
              href={WHATSAPP_BASE}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp पर बात करें
            </a>
            <Link className="custom-request-success-link" href="/">
              होम पेज पर जाएँ
            </Link>
          </div>
        </section>
      ) : (
        <form className="custom-request-form" onSubmit={handleSubmit} noValidate>
          <header className="custom-request-form-header">
            <h2>अपना आइडिया बताइए</h2>
            <p>जितनी जानकारी देंगे, हम आपकी जरूरत उतनी अच्छी तरह समझ पाएँगे।</p>
          </header>

          {formError && (
            <div className="hero-admin-state error" role="alert">
              {formError}
            </div>
          )}
          {uploadState.status === "error" && (
            <div className="hero-admin-state error" role="alert">
              {uploadState.message}
            </div>
          )}
          {uploadState.status === "uploading" && (
            <div className="hero-admin-state" role="status">
              Upload हो रहा है: {uploadState.filename}
            </div>
          )}

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">फोटो या डिज़ाइन</h3>
            <p className="custom-request-section-subtitle">
              अगर आपके पास फोटो, ड्रॉइंग या कोई 3D file है, तो यहाँ भेज सकते हैं।
            </p>

            <label
              className={`custom-request-upload-card${dragState === "active" ? " is-drag-over" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={CUSTOM_REQUEST_FILE_ACCEPT}
                multiple
                onChange={handleFileInputChange}
                hidden
              />
              <div className="custom-request-upload-content">
                <button type="button" className="custom-request-upload-button" onClick={triggerFilePicker}>
                  फोटो / फाइल यहाँ डालें
                </button>
                <p className="custom-request-upload-hint">{CUSTOM_REQUEST_FILE_HINT}</p>
                <p className="custom-request-upload-note">ज्यादा से ज्यादा {CUSTOM_REQUEST_MAX_FILES} फाइल (प्रति फाइल 5 MB तक)</p>
              </div>
            </label>

            {files.length > 0 && (
              <ul className="custom-request-file-list">
                {files.map((file, index) => (
                  <li key={`${file.publicId}-${index}`} className="custom-request-file-item">
                    <div className="custom-request-file-info">
                      <span className="custom-request-file-name">{file.filename ?? "Reference file"}</span>
                      {file.size !== undefined && (
                        <span className="custom-request-file-size">{formatFileSize(file.size)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="custom-request-file-remove"
                      onClick={() => handleRemoveFile(file, index)}
                      disabled={deleteMutation.isPending}
                    >
                      हटाएँ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">आपको क्या बनवाना है?</h3>
            <div className="form-field">
              <textarea
                id="custom-request-description"
                rows={4}
                placeholder="जैसे: बाइक का टूटा हुआ पार्ट, नाम प्लेट, मोबाइल स्टैंड या कोई नया आइडिया..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH}
                required
              />
            </div>
          </section>

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">साइज / नाप</h3>
            <p className="custom-request-section-subtitle">अगर साइज पता है, तो यहाँ लिखें। (साइज पता नहीं है तो खाली छोड़ सकते हैं)</p>
            <div className="custom-request-dimensions-grid">
              <div className="form-field">
                <label htmlFor="cr-length">लेंथ</label>
                <input
                  id="cr-length"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="लेंथ"
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="cr-width">वाइड्थ</label>
                <input
                  id="cr-width"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="वाइड्थ"
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="cr-height">हाइट</label>
                <input
                  id="cr-height"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="हाइट"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="cr-unit">इकाई</label>
                <select
                  id="cr-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as "mm" | "cm" | "inch")}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            </div>
            <p className="custom-request-helper">साइज पता नहीं है?</p>
          </section>

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">कितने पीस चाहिए?</h3>
            <div className="form-field custom-request-quantity-field">
              <input
                id="cr-quantity"
                type="number"
                min={CUSTOM_REQUEST_MIN_QUANTITY}
                max={CUSTOM_REQUEST_MAX_QUANTITY}
                step="1"
                value={quantity}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isNaN(value)) {
                    setQuantity(Math.max(CUSTOM_REQUEST_MIN_QUANTITY, Math.min(CUSTOM_REQUEST_MAX_QUANTITY, Math.trunc(value))));
                  }
                }}
              />
            </div>
          </section>

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">आपकी जानकारी</h3>
            <div className="custom-request-info-grid">
              <div className="form-field">
                <label htmlFor="cr-name">आपका नाम</label>
                <input
                  id="cr-name"
                  type="text"
                  placeholder="अपना नाम लिखें"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={CUSTOM_REQUEST_MAX_NAME_LENGTH}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="cr-whatsapp">WhatsApp नंबर</label>
                <input
                  id="cr-whatsapp"
                  type="tel"
                  placeholder="WhatsApp नंबर"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  required
                />
                <small className="form-helper">इसी नंबर पर हम आपसे बात करेंगे।</small>
              </div>
            </div>
          </section>

          <section className="custom-request-section">
            <h3 className="custom-request-section-title">और कुछ बताना है?</h3>
            <div className="form-field">
              <textarea
                id="cr-additional"
                rows={3}
                placeholder="रंग, material, finishing या कोई खास जरूरत..."
                value={additional}
                onChange={(event) => setAdditional(event.target.value)}
                maxLength={CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH}
              />
            </div>
          </section>

          <div className="custom-request-footer">
            <p className="custom-request-reassurance">जानकारी भेजने के बाद हम आपसे WhatsApp पर बात करेंगे।</p>
            <button type="submit" className="primary-btn custom-request-submit" disabled={isSubmitting}>
              {isSubmitting ? "भेजा जा रहा है..." : "जानकारी भेजें"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}