import {
  CUSTOMIZATION_FIELD_TYPE_LABELS,
  CUSTOMIZATION_FIELD_TYPES,
  toCustomizationKey,
  type CustomizationFieldDraft,
} from "./productCustomization";

type CustomizationFieldEditorProps = {
  draft: CustomizationFieldDraft;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (index: number, patch: Partial<CustomizationFieldDraft>) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
};

const dimensions = ["width", "height", "depth"] as const;

export default function CustomizationFieldEditor({
  draft,
  index,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: CustomizationFieldEditorProps) {
  function updateDimensionAxis(
    axis: (typeof dimensions)[number],
    property: "Enabled" | "Required",
    checked: boolean
  ) {
    if (property === "Enabled") {
      if (axis === "width") {
        onChange(index, { widthEnabled: checked });
      } else if (axis === "height") {
        onChange(index, { heightEnabled: checked });
      } else {
        onChange(index, { depthEnabled: checked });
      }

      return;
    }

    if (axis === "width") {
      onChange(index, { widthRequired: checked });
    } else if (axis === "height") {
      onChange(index, { heightRequired: checked });
    } else {
      onChange(index, { depthRequired: checked });
    }
  }

  const isTextLike = draft.type === "TEXT" || draft.type === "TEXTAREA";

  return (
    <article className="customization-field-editor">
      <div className="customization-field-head">
        <div className="customization-field-meta">
          <span>Field {index + 1}</span>
          <span>{draft.id}</span>
        </div>
        <div className="product-image-actions">
          <button type="button" disabled={!canMoveUp} onClick={() => onMoveUp(index)}>
            Up
          </button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMoveDown(index)}>
            Down
          </button>
          <button type="button" className="hero-manager-delete" onClick={() => onRemove(index)}>
            Remove
          </button>
        </div>
      </div>

      <div className="form-row-grid">
        <div className="form-field">
          <label htmlFor={`customization-type-${draft.id}`}>Type</label>
          <select
            id={`customization-type-${draft.id}`}
            value={draft.type}
            onChange={(event) => onChange(index, { type: event.target.value as CustomizationFieldDraft["type"] })}
          >
            {CUSTOMIZATION_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {CUSTOMIZATION_FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Required</label>
          <label className="product-checkbox customization-required-field">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(event) => onChange(index, { required: event.target.checked })}
            />
            Customers must answer
          </label>
        </div>
      </div>

      <div className="form-row-grid">
        <div className="form-field">
          <label htmlFor={`customization-label-${draft.id}`}>Label</label>
          <input
            id={`customization-label-${draft.id}`}
            value={draft.label}
            maxLength={120}
            onChange={(event) =>
              onChange(index, {
                label: event.target.value,
                key: draft.key ? draft.key : toCustomizationKey(event.target.value),
              })
            }
            placeholder="e.g. Engraving text"
          />
        </div>
        <div className="form-field">
          <label htmlFor={`customization-key-${draft.id}`}>Key</label>
          <input
            id={`customization-key-${draft.id}`}
            value={draft.key}
            onChange={(event) => onChange(index, { key: event.target.value })}
            placeholder="single_word_key"
          />
        </div>
      </div>

      {isTextLike && (
        <div className="form-field">
          <label htmlFor={`customization-placeholder-${draft.id}`}>Placeholder</label>
          <input
            id={`customization-placeholder-${draft.id}`}
            value={draft.placeholder}
            onChange={(event) => onChange(index, { placeholder: event.target.value })}
            placeholder="Optional input placeholder"
          />
        </div>
      )}

      {draft.type === "SELECT" && (
        <div className="form-field">
          <label htmlFor={`customization-options-${draft.id}`}>Options</label>
          <input
            id={`customization-options-${draft.id}`}
            value={draft.optionsText}
            onChange={(event) => onChange(index, { optionsText: event.target.value })}
            placeholder="Options separated by commas"
          />
        </div>
      )}

      {draft.type === "NUMBER" && (
        <div className="form-row-grid">
          <div className="form-field">
            <label htmlFor={`customization-min-${draft.id}`}>Minimum</label>
            <input
              id={`customization-min-${draft.id}`}
              min="0"
              type="number"
              value={draft.min}
              onChange={(event) => onChange(index, { min: event.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="form-field">
            <label htmlFor={`customization-max-${draft.id}`}>Maximum</label>
            <input
              id={`customization-max-${draft.id}`}
              min="0"
              type="number"
              value={draft.max}
              onChange={(event) => onChange(index, { max: event.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {draft.type === "IMAGE" && (
        <>
          <div className="form-row-grid">
            <div className="form-field">
              <label htmlFor={`customization-max-files-${draft.id}`}>Max files</label>
              <input
                id={`customization-max-files-${draft.id}`}
                min="1"
                type="number"
                value={draft.maxFiles}
                onChange={(event) => onChange(index, { maxFiles: event.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="form-field">
              <label htmlFor={`customization-max-size-${draft.id}`}>Max file size (bytes)</label>
              <input
                id={`customization-max-size-${draft.id}`}
                min="1"
                type="number"
                value={draft.maxFileSize}
                onChange={(event) => onChange(index, { maxFileSize: event.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor={`customization-file-types-${draft.id}`}>Accepted file types</label>
            <input
              id={`customization-file-types-${draft.id}`}
              value={draft.acceptedFileTypes}
              onChange={(event) => onChange(index, { acceptedFileTypes: event.target.value })}
              placeholder="e.g. image/png, image/jpeg"
            />
          </div>
        </>
      )}

      {draft.type === "DIMENSIONS" && (
        <>
          <div className="form-field">
            <label htmlFor={`customization-unit-${draft.id}`}>Unit</label>
            <input
              id={`customization-unit-${draft.id}`}
              value={draft.unit}
              onChange={(event) => onChange(index, { unit: event.target.value })}
              placeholder="e.g. cm, mm, inches"
            />
          </div>
          <div className="customization-dim-grid">
            {dimensions.map((axis) => (
              <div className="customization-dim-row" key={axis}>
                <label className="product-checkbox">
                  <input
                    type="checkbox"
                    checked={draft[`${axis}Enabled`]}
                    onChange={(event) => updateDimensionAxis(axis, "Enabled", event.target.checked)}
                  />
                  Enable {axis}
                </label>
                <label className="product-checkbox">
                  <input
                    type="checkbox"
                    disabled={!draft[`${axis}Enabled`]}
                    checked={draft[`${axis}Required`]}
                    onChange={(event) => updateDimensionAxis(axis, "Required", event.target.checked)}
                  />
                  Required
                </label>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="form-field">
        <label htmlFor={`customization-help-${draft.id}`}>Help text</label>
        <input
          id={`customization-help-${draft.id}`}
          value={draft.helpText}
          onChange={(event) => onChange(index, { helpText: event.target.value })}
          placeholder="Optional guidance shown to customers"
        />
      </div>
    </article>
  );
}