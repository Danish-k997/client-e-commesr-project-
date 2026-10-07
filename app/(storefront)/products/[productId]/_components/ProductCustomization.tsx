"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

import {
  ApiClientError,
  useDeleteCustomizationImage,
  useUploadCustomizationImage,
  type CustomizationDimensionsField,
  type CustomizationField,
  type CustomizationImageField,
  type CustomizationNumberField,
  type CustomizationSelectField,
  type CustomizationTextField,
} from "../../../../lib/api";
import {
  CUSTOMIZATION_IMAGE_MIME_TYPES,
  MAX_CUSTOMIZATION_TEXTAREA_LENGTH,
  MAX_CUSTOMIZATION_TEXT_LENGTH,
  buildImageAcceptAttribute,
  formatImageSize,
  getImageFieldLimit,
  getImageFieldSizeLimit,
  isAcceptedImageMime,
  readDimensionsValue,
  readImageValue,
  readTextValue,
  type CustomizationImageDraft,
  type CustomizationFieldValue,
  type CustomizationValues,
} from "../../../../lib/customization";

const DIMENSION_AXES = ["width", "height", "depth"] as const;

type ProductCustomizationProps = {
  productId: string;
  fields: CustomizationField[];
  values: CustomizationValues;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: CustomizationFieldValue) => void;
};

type FieldControlProps = {
  productId: string;
  field: CustomizationField;
  value: CustomizationFieldValue | undefined;
  controlId: string;
  describedBy: string;
  hasError: boolean;
  onChange: (fieldId: string, value: CustomizationFieldValue) => void;
};

export default function ProductCustomization({
  productId,
  fields,
  values,
  errors,
  onChange,
}: ProductCustomizationProps) {
  if (fields.length === 0) {
    return null;
  }

  const hasRequiredFields = fields.some((field) => field.required);

  return (
    <section
      className="product-detail-customization"
      aria-labelledby="product-customization-heading"
    >
      <div className="product-detail-customization-head">
        <h2 id="product-customization-heading">Customize this product</h2>
        {hasRequiredFields && (
          <p className="product-detail-note">Fields marked as required must be completed.</p>
        )}
      </div>

      <div className="product-detail-customization-fields">
        {fields.map((field) => (
          <CustomizationFieldControl
            key={field.id}
            productId={productId}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

function CustomizationFieldControl({
  productId,
  field,
  value,
  error,
  onChange,
}: {
  productId: string;
  field: CustomizationField;
  value: CustomizationFieldValue | undefined;
  error?: string;
  onChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  const controlId = `customization-${field.id}`;
  const labelId = `customization-label-${field.id}`;
  const helpId = `customization-help-${field.id}`;
  const errorId = `customization-error-${field.id}`;
  const helpText = field.helpText?.trim() ?? "";
  const isGrouped = field.type === "DIMENSIONS" || field.type === "IMAGE";
  const describedBy = [helpText ? helpId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div
      className={`form-field product-detail-customization-field${error ? " has-error" : ""}`}
      id={`customization-field-${field.id}`}
      role={isGrouped ? "group" : undefined}
      aria-labelledby={isGrouped ? labelId : undefined}
    >
      <div className="customization-field-label-row">
        {isGrouped ? (
          <span className="customization-field-name" id={labelId}>
            {field.label}
          </span>
        ) : (
          <label htmlFor={controlId}>{field.label}</label>
        )}
        {field.required && <span className="customization-required-badge">Required</span>}
      </div>

      {helpText && (
        <p className="customization-field-help" id={helpId}>
          {helpText}
        </p>
      )}

      <FieldControl
        productId={productId}
        field={field}
        value={value}
        controlId={controlId}
        describedBy={describedBy}
        hasError={Boolean(error)}
        onChange={onChange}
      />

      {error && (
        <p className="customization-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldControl(props: FieldControlProps) {
  const { field } = props;

  switch (field.type) {
    case "TEXT":
    case "TEXTAREA":
      return <TextControl {...props} field={field} />;
    case "SELECT":
      return <SelectControl {...props} field={field} />;
    case "NUMBER":
      return <NumberControl {...props} field={field} />;
    case "IMAGE":
      return <ImageControl {...props} field={field} />;
    case "DIMENSIONS":
      return <DimensionsControl {...props} field={field} />;
    default:
      return null;
  }
}

type ControlProps<TField extends CustomizationField> = Omit<FieldControlProps, "field"> & {
  field: TField;
};

function TextControl({
  field,
  value,
  controlId,
  describedBy,
  hasError,
  onChange,
}: ControlProps<CustomizationTextField>) {
  const sharedProps = {
    id: controlId,
    value: readTextValue(value),
    placeholder: field.placeholder?.trim() || undefined,
    maxLength: field.type === "TEXTAREA" ? MAX_CUSTOMIZATION_TEXTAREA_LENGTH : MAX_CUSTOMIZATION_TEXT_LENGTH,
    "aria-invalid": hasError || undefined,
    "aria-describedby": describedBy || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field.id, event.target.value),
  };

  if (field.type === "TEXTAREA") {
    return <textarea rows={4} {...sharedProps} />;
  }

  return <input type="text" {...sharedProps} />;
}

function SelectControl({
  field,
  value,
  controlId,
  describedBy,
  hasError,
  onChange,
}: ControlProps<CustomizationSelectField>) {
  const options = field.options ?? [];

  if (options.length === 0) {
    return <p className="customization-field-note">This option is unavailable right now.</p>;
  }

  return (
    <select
      id={controlId}
      value={readTextValue(value)}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy || undefined}
      onChange={(event) => onChange(field.id, event.target.value)}
    >
      <option value="">Select an option</option>
      {options.map((option) => (
        <option key={option.id} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  );
}

function NumberControl({
  field,
  value,
  controlId,
  describedBy,
  hasError,
  onChange,
}: ControlProps<CustomizationNumberField>) {
  const min = field.validation?.min;
  const max = field.validation?.max;

  return (
    <input
      id={controlId}
      type="number"
      step={1}
      inputMode="numeric"
      min={typeof min === "number" ? min : undefined}
      max={typeof max === "number" ? max : undefined}
      value={readTextValue(value)}
      placeholder={field.placeholder?.trim() || undefined}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy || undefined}
      onChange={(event) => onChange(field.id, event.target.value)}
    />
  );
}

function DimensionsControl({
  field,
  value,
  controlId,
  describedBy,
  hasError,
  onChange,
}: ControlProps<CustomizationDimensionsField>) {
  const config = field.dimensions;
  const draft = readDimensionsValue(value);
  const axes = DIMENSION_AXES.filter((axis) => Boolean(config?.[axis]?.enabled));

  if (axes.length === 0) {
    return <p className="customization-field-note">This option is unavailable right now.</p>;
  }

  const unit = config.unit?.trim() || "cm";

  return (
    <div className="customization-dimensions">
      {axes.map((axis) => {
        const axisId = `${controlId}-${axis}`;
        const isAxisRequired = field.required || Boolean(config[axis]?.required);

        return (
          <div className="customization-dimension" key={axis}>
            <div className="customization-dimension-label">
              <label htmlFor={axisId}>
                {capitalizeAxis(axis)}{" "}
                <span className="customization-dimension-unit">({unit})</span>
              </label>
              {isAxisRequired && <span className="customization-axis-required">Required</span>}
            </div>
            <input
              id={axisId}
              type="number"
              step="any"
              inputMode="decimal"
              value={draft[axis]}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy || undefined}
              onChange={(event) => onChange(field.id, { ...draft, [axis]: event.target.value })}
            />
          </div>
        );
      })}
    </div>
  );
}

function ImageControl({
  productId,
  field,
  value,
  controlId,
  describedBy,
  onChange,
}: ControlProps<CustomizationImageField>) {
  const images = readImageValue(value);
  const limit = getImageFieldLimit(field);
  const accept = buildImageAcceptAttribute(field);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const uploadMutation = useUploadCustomizationImage();
  const deleteMutation = useDeleteCustomizationImage();

  const uploadErrorId = `${controlId}-upload-error`;
  const uploadErrorMessage = uploadMutation.isError
    ? uploadMutation.error instanceof ApiClientError
      ? uploadMutation.error.message
      : "We couldn't upload that image. Please try again."
    : "";
  const displayError = uploadErrorMessage || localError;
  const controlDescribedBy = [describedBy, displayError ? uploadErrorId : ""]
    .filter(Boolean)
    .join(" ");
  const canAdd = images.length < limit;
  const isUploading = uploadMutation.isPending;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    setLocalError("");
    uploadMutation.reset();

    const fileProblem = validateImageFile(field, file);

    if (fileProblem) {
      setLocalError(fileProblem);
      return;
    }

    void (async () => {
      let imageDataUrl: string;

      try {
        imageDataUrl = await readFileAsDataUrl(file);
      } catch {
        setLocalError("We couldn't read that file. Please try another image.");
        return;
      }

      try {
        const uploaded = await uploadMutation.mutateAsync({
          productId,
          fieldId: field.id,
          imageDataUrl,
          position: images.length,
        });

        onChange(field.id, [
          ...images,
          { url: uploaded.url, publicId: uploaded.publicId, deleteToken: uploaded.deleteToken },
        ]);
      } catch {
        // The upload failure is surfaced through the mutation error state below.
      }
    })();
  }

  function handleRemove(image: CustomizationImageDraft) {
    onChange(
      field.id,
      images.filter((entry) => entry.publicId !== image.publicId)
    );

    if (!image.deleteToken) {
      return;
    }

    void deleteMutation
      .mutateAsync({ publicId: image.publicId, deleteToken: image.deleteToken })
      .catch((cleanupError) => {
        console.warn("Failed to clean up customization image upload:", cleanupError);
      });
  }

  return (
    <>
      {images.length > 0 && (
        <div className="customization-image-list">
          {images.map((image, index) => (
            <div className="customization-image-thumb" key={image.publicId}>
              <Image
                src={image.url}
                alt={`${field.label} image ${index + 1} of ${images.length}`}
                fill
                sizes="96px"
              />
              <button
                type="button"
                className="customization-image-remove"
                aria-label={`Remove uploaded image for ${field.label}`}
                onClick={() => handleRemove(image)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {!accept ? (
        <p className="customization-field-note">This option is unavailable right now.</p>
      ) : canAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="customization-upload-button"
            disabled={isUploading}
            aria-describedby={controlDescribedBy || undefined}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Uploading…" : images.length > 0 ? "Add another image" : "Upload image"}
          </button>
        </>
      ) : (
        <p className="customization-field-note">
          Maximum of {limit} {limit === 1 ? "image" : "images"} added.
        </p>
      )}

      {displayError && (
        <p className="customization-field-error" id={uploadErrorId} role="alert">
          {displayError}
        </p>
      )}
    </>
  );
}

function validateImageFile(field: CustomizationImageField, file: File) {
  const mime = (file.type || "").toLowerCase();

  if (!(CUSTOMIZATION_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return "Please choose a JPG, PNG, WebP, GIF, or AVIF image.";
  }

  if (!isAcceptedImageMime(field, mime)) {
    return "That file type is not allowed for this field.";
  }

  const sizeLimit = getImageFieldSizeLimit(field);

  if (file.size > sizeLimit) {
    return `Image must be ${formatImageSize(sizeLimit)} or smaller.`;
  }

  return "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("File could not be read as a data URL."));
      }
    };

    reader.onerror = () => reject(reader.error ?? new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function capitalizeAxis(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
