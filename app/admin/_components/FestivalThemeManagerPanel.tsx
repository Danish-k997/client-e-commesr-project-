"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useAdminFestivalThemes,
  useSaveFestivalTheme,
  useRevertFestivalTheme,
  type FestivalPresetAdminRecord,
} from "../../lib/api/festivals";
import type {
  FestivalPreset,
  ThemeIntensity,
} from "../../models/FestivalTheme";
import { formatIstHuman, parseIstToUtc } from "../../lib/festivals/timezone";
import FestivalMotif from "../../(storefront)/_components/FestivalMotif";
import DiyaCluster from "../../(storefront)/_components/DiyaCluster";
import styles from "./FestivalThemeManagerPanel.module.css";

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

function getPresetStatus(presetItem: FestivalPresetAdminRecord) {
  if (presetItem.status === "DRAFT" || !presetItem.isEnabled) {
    return { label: "Draft", styleClass: styles.presetStateBadge };
  }
  const now = new Date();
  const start = new Date(presetItem.startDate);
  const end = new Date(presetItem.endDate);
  if (now < start) {
    return {
      label: "Scheduled",
      styleClass: `${styles.presetStateBadge} ${styles.presetStateBadgeScheduled}`,
    };
  }
  if (now > end) {
    return {
      label: "Expired",
      styleClass: `${styles.presetStateBadge} ${styles.presetStateBadgeExpired}`,
    };
  }
  return {
    label: "Active Now",
    styleClass: `${styles.presetStateBadge} ${styles.presetStateBadgeActive}`,
  };
}

export default function FestivalThemeManagerPanel() {
  const { data, isLoading, isError, error, refetch } = useAdminFestivalThemes();
  const saveMutation = useSaveFestivalTheme();
  const revertMutation = useRevertFestivalTheme();

  const presets = useMemo(() => data?.presets || [], [data?.presets]);
  const activeTheme = data?.activeTheme;

  // Selected preset tab in the manager
  const [selectedPresetKey, setSelectedPresetKey] = useState<FestivalPreset>("DIWALI");

  // Form states for the currently selected preset
  const [startDateIst, setStartDateIst] = useState("");
  const [endDateIst, setEndDateIst] = useState("");
  const [intensity, setIntensity] = useState<ThemeIntensity>("balanced");
  const [customAccentColor, setCustomAccentColor] = useState<string>("");
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [announcementText, setAnnouncementText] = useState("");
  const [enableDecorations, setEnableDecorations] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Find the selected preset record
  const currentRecord = useMemo(() => {
    return presets.find((p) => p.preset === selectedPresetKey) || presets[0];
  }, [presets, selectedPresetKey]);

  // Synchronize form when preset selection changes or data loads
  useEffect(() => {
    if (!currentRecord) return;

    setStartDateIst(currentRecord.startDateIst || "");
    setEndDateIst(currentRecord.endDateIst || "");
    setIntensity(currentRecord.intensity || "balanced");
    setCustomAccentColor(currentRecord.customAccentColor || "");
    setShowAnnouncement(currentRecord.showAnnouncement ?? true);
    setAnnouncementText(currentRecord.announcementText || currentRecord.metadata.defaultAnnouncement || "");
    setEnableDecorations(currentRecord.enableDecorations ?? true);
    setEnableAnimations(currentRecord.enableAnimations ?? true);
    setFeedback(null);
  }, [currentRecord]);

  // Default color fallback
  const effectiveAccent = customAccentColor || currentRecord?.metadata.primaryAccent || "#CCFF00";

  // Human date calculations
  const startHuman = useMemo(() => {
    if (!startDateIst) return "";
    try {
      const utc = parseIstToUtc(startDateIst);
      return formatIstHuman(utc);
    } catch {
      return "Invalid date";
    }
  }, [startDateIst]);

  const endHuman = useMemo(() => {
    if (!endDateIst) return "";
    try {
      const utc = parseIstToUtc(endDateIst);
      return formatIstHuman(utc);
    } catch {
      return "Invalid date";
    }
  }, [endDateIst]);

  // Save or Publish Handler
  const handleSave = async (statusToSet: "DRAFT" | "PUBLISHED") => {
    if (!currentRecord) return;
    setFeedback(null);

    // Validation
    if (!startDateIst) {
      setFeedback({ type: "error", message: "Please specify a start date & time in IST." });
      return;
    }
    if (!endDateIst) {
      setFeedback({ type: "error", message: "Please specify an end date & time in IST." });
      return;
    }

    try {
      const startUtc = parseIstToUtc(startDateIst);
      const endUtc = parseIstToUtc(endDateIst);

      if (endUtc.getTime() <= startUtc.getTime()) {
        setFeedback({ type: "error", message: "End date must be chronologically after start date." });
        return;
      }

      await saveMutation.mutateAsync({
        preset: currentRecord.preset,
        title: currentRecord.title,
        status: statusToSet,
        isEnabled: statusToSet === "PUBLISHED",
        startDateIst,
        endDateIst,
        intensity,
        customAccentColor: customAccentColor.trim() ? customAccentColor.trim() : null,
        showAnnouncement,
        announcementText: announcementText.trim(),
        enableDecorations,
        enableAnimations,
      });

      setFeedback({
        type: "success",
        message: statusToSet === "PUBLISHED"
          ? `🎉 ${currentRecord.title} has been published and activated for its scheduled window!`
          : `Draft changes for ${currentRecord.title} have been saved successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save theme changes.";
      setFeedback({ type: "error", message: msg });
    }
  };

  // Revert to Default Handler
  const handleRevertToDefault = async () => {
    setFeedback(null);
    try {
      await revertMutation.mutateAsync();
      setFeedback({
        type: "success",
        message: "Active theme reverted. The store is now showing Default Brand styling.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revert to default theme.";
      setFeedback({ type: "error", message: msg });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>Storefront Theming</span>
            <h1 className={styles.title}>Festival Theme Manager</h1>
            <p className={styles.description}>Loading theme configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>Storefront Theming</span>
            <h1 className={styles.title}>Festival Theme Manager</h1>
            <p className={styles.description}>Error loading themes.</p>
          </div>
        </div>
        <div className={`${styles.feedbackMessage} ${styles.feedbackError}`}>
          {error instanceof Error ? error.message : "Failed to load festival theme data."}
          <button className={styles.revertBtn} onClick={() => refetch()} type="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isDefaultActive = !activeTheme || !activeTheme.isActive || activeTheme.preset === "DEFAULT";

  return (
    <section className={styles.panel} aria-label="Festival Theme Manager">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>Storefront Theming</span>
          <h1 className={styles.title}>Festival Theme Manager</h1>
          <p className={styles.description}>
            Schedule festive accents, announcements, and motifs across the store. When no festival is
            scheduled, the website safely displays the default editorial KASAR DIMENSIONS brand.
          </p>
        </div>
      </div>

      {/* Currently Active Theme Banner */}
      <div className={styles.statusBanner}>
        <div className={styles.statusInfo}>
          <span
            className={`${styles.statusIndicator} ${
              isDefaultActive ? styles.statusIndicatorInactive : ""
            }`}
            aria-hidden="true"
          />
          <div className={styles.statusText}>
            Current Active Theme:{" "}
            <strong>
              {activeTheme?.isActive
                ? `${activeTheme.symbol} ${activeTheme.title} (${activeTheme.preset})`
                : "▲ Default Brand (Active)"}
            </strong>
            {activeTheme?.isActive && activeTheme.startDateIso && activeTheme.endDateIso && (
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Scheduled: {formatIstHuman(activeTheme.startDateIso)} → {formatIstHuman(activeTheme.endDateIso)}
              </span>
            )}
          </div>
        </div>
        <button
          className={styles.revertBtn}
          type="button"
          onClick={handleRevertToDefault}
          disabled={revertMutation.isPending || isDefaultActive}
          title="Instantly deactivate any running festival theme and return to default brand"
        >
          {revertMutation.isPending ? "Reverting..." : "Revert to Default Brand"}
        </button>
      </div>

      {feedback && (
        <div
          className={`${styles.feedbackMessage} ${
            feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError
          }`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      {/* Presets Navigation Cards with Intelligent Status Badges */}
      <div className={styles.presetsSection}>
        <h2 className={styles.sectionTitle}>Festival Presets</h2>
        <div className={styles.presetsGrid} role="tablist" aria-label="Preset themes">
          {presets.map((presetItem) => {
            const isSelected = presetItem.preset === selectedPresetKey;
            const accent = presetItem.customAccentColor || presetItem.metadata.primaryAccent;
            const statusInfo = getPresetStatus(presetItem);

            return (
              <button
                key={presetItem.preset}
                type="button"
                role="tab"
                aria-selected={isSelected}
                style={{ "--card-accent": accent } as React.CSSProperties}
                className={`${styles.presetCard} ${isSelected ? styles.presetCardActive : ""}`}
                onClick={() => setSelectedPresetKey(presetItem.preset)}
              >
                <div className={styles.presetCardTop}>
                  <span className={styles.presetSymbol}>{presetItem.metadata.symbol}</span>
                  <span className={statusInfo.styleClass}>{statusInfo.label}</span>
                </div>
                <span className={styles.presetName}>{presetItem.metadata.title.split("(")[0].trim()}</span>
                <span className={styles.presetAccentBar} style={{ background: accent }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Editor & Live Mobile Preview */}
      {currentRecord && (
        <div className={styles.editorLayout}>
          {/* Left Column: Configuration Controls */}
          <div className={styles.editorCard}>
            <div className={styles.editorHeader}>
              <h2 className={styles.editorTitle}>
                <span>{currentRecord.metadata.symbol}</span>
                <span>{currentRecord.metadata.title}</span>
              </h2>
              <p className={styles.editorTagline}>{currentRecord.metadata.tagline}</p>
            </div>

            {/* Features Included in this Theme */}
            <div className={styles.featuresCard}>
              <h3 className={styles.featuresTitle}>
                <FestivalMotif preset={currentRecord.preset} variant="inline" size={14} />
                <span>Features Included in {currentRecord.metadata.title.split("(")[0].trim()}</span>
              </h3>
              <ul className={styles.featuresList}>
                {currentRecord.metadata.featuresSummary?.map((feat, idx) => (
                  <li key={idx}>{feat}</li>
                ))}
              </ul>
            </div>

            {currentRecord.preset === "DEFAULT" ? (
              <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                <p>
                  The <strong>Default Brand</strong> theme represents the pure, minimal KASAR DIMENSIONS visual
                  identity. It has no date constraints and acts as the universal safe fallback when no festival
                  is scheduled or active.
                </p>
                <p>
                  To restore this styling at any time, click the <strong>&ldquo;Revert to Default Brand&rdquo;</strong> button
                  above.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Schedule Range in IST */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>Schedule Window (Asia/Kolkata — IST)</span>
                    <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>
                      Auto-activates during this period
                    </span>
                  </label>
                  <div className={styles.datesRow}>
                    <div className={styles.formGroup}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Starts (IST):</span>
                      <input
                        type="datetime-local"
                        className={styles.inputField}
                        value={startDateIst}
                        onChange={(e) => setStartDateIst(e.target.value)}
                        aria-label="Festival start date and time in Indian Standard Time"
                      />
                      {startHuman && <p className={styles.helperText}>{startHuman}</p>}
                    </div>
                    <div className={styles.formGroup}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Ends (IST):</span>
                      <input
                        type="datetime-local"
                        className={styles.inputField}
                        value={endDateIst}
                        onChange={(e) => setEndDateIst(e.target.value)}
                        aria-label="Festival end date and time in Indian Standard Time"
                      />
                      {endHuman && <p className={styles.helperText}>{endHuman}</p>}
                    </div>
                  </div>
                </div>

                {/* 2. Visual Intensity Level */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Visual Intensity</label>
                  <div className={styles.intensityGrid}>
                    <button
                      type="button"
                      className={`${styles.intensityBtn} ${
                        intensity === "subtle" ? styles.intensityBtnActive : ""
                      }`}
                      onClick={() => setIntensity("subtle")}
                    >
                      <span className={styles.intensityBtnLabel}>Subtle</span>
                      <span className={styles.intensityBtnDesc}>Soft borders & accents</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.intensityBtn} ${
                        intensity === "balanced" ? styles.intensityBtnActive : ""
                      }`}
                      onClick={() => setIntensity("balanced")}
                    >
                      <span className={styles.intensityBtnLabel}>Balanced</span>
                      <span className={styles.intensityBtnDesc}>Full cards, CTAs & glows</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.intensityBtn} ${
                        intensity === "strong" ? styles.intensityBtnActive : ""
                      }`}
                      onClick={() => setIntensity("strong")}
                    >
                      <span className={styles.intensityBtnLabel}>Strong</span>
                      <span className={styles.intensityBtnDesc}>Rich festive presence</span>
                    </button>
                  </div>
                </div>

                {/* 3. Primary Accent Override */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Primary Accent Color</label>
                  <div className={styles.colorRow}>
                    <div className={styles.colorInputWrap}>
                      <input
                        type="color"
                        className={styles.colorPicker}
                        value={effectiveAccent.startsWith("#") ? effectiveAccent : "#D97706"}
                        onChange={(e) => setCustomAccentColor(e.target.value.toUpperCase())}
                        aria-label="Choose accent color"
                      />
                      <input
                        type="text"
                        className={styles.colorHexInput}
                        value={effectiveAccent}
                        maxLength={7}
                        onChange={(e) => setCustomAccentColor(e.target.value)}
                        placeholder="#HEX"
                        aria-label="Hex color value"
                      />
                    </div>
                    {customAccentColor && customAccentColor !== currentRecord.metadata.primaryAccent && (
                      <button
                        type="button"
                        className={styles.colorResetBtn}
                        onClick={() => setCustomAccentColor("")}
                      >
                        Reset to Preset ({currentRecord.metadata.primaryAccent})
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Announcement Bar */}
                <div className={styles.formGroup}>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleLabelWrap}>
                      <span className={styles.toggleLabel}>Top Announcement Bar Message</span>
                      <span className={styles.toggleSub}>
                        Appears alongside pan-India delivery notice in the header bar
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showAnnouncement}
                      className={`${styles.toggleSwitch} ${
                        showAnnouncement ? styles.toggleSwitchChecked : ""
                      }`}
                      onClick={() => setShowAnnouncement(!showAnnouncement)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {showAnnouncement && (
                    <div style={{ marginTop: 4 }}>
                      <input
                        type="text"
                        className={styles.inputField}
                        value={announcementText}
                        maxLength={120}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="Festive greeting or offer..."
                        aria-label="Festival announcement text"
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                        {announcementText.length}/120 characters
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. Motifs & Micro-animations */}
                <div className={styles.formGroup}>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleLabelWrap}>
                      <span className={styles.toggleLabel}>Festive Motif Badges & Vectors</span>
                      <span className={styles.toggleSub}>
                        Displays {currentRecord.metadata.symbol} vector motifs across cards & headings
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableDecorations}
                      className={`${styles.toggleSwitch} ${
                        enableDecorations ? styles.toggleSwitchChecked : ""
                      }`}
                      onClick={() => setEnableDecorations(!enableDecorations)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleLabelWrap}>
                      <span className={styles.toggleLabel}>Subtle Festive Animations</span>
                      <span className={styles.toggleSub}>
                        Gentle glow transitions & flame micro-flicker (respects reduced-motion)
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableAnimations}
                      className={`${styles.toggleSwitch} ${
                        enableAnimations ? styles.toggleSwitchChecked : ""
                      }`}
                      onClick={() => setEnableAnimations(!enableAnimations)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.actionsBar}>
                  <button
                    type="button"
                    className={styles.saveDraftBtn}
                    onClick={() => handleSave("DRAFT")}
                    disabled={saveMutation.isPending}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className={styles.publishBtn}
                    onClick={() => handleSave("PUBLISHED")}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? "Publishing..." : "Publish & Activate Theme"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Simulated Storefront Live Preview */}
          <div className={styles.previewSticky}>
            <div className="flex items-center justify-between">
              <h3 className={styles.sectionTitle}>Simulated Storefront Preview</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Token Reflection
              </span>
            </div>

            <div
              className={styles.previewPhone}
              style={{
                "--preview-accent": effectiveAccent,
                "--preview-tint": currentRecord.metadata.surfaceTint,
                "--preview-border": currentRecord.metadata.borderAccent,
                "--preview-button-bg": customAccentColor || currentRecord.metadata.buttonBg,
                "--preview-button-text": currentRecord.metadata.buttonText,
                "--preview-badge-bg": customAccentColor || currentRecord.metadata.badgeBg,
                "--preview-badge-text": currentRecord.metadata.badgeText,
                "--preview-glow": currentRecord.metadata.glowAccent ? `0 4px 14px ${currentRecord.metadata.glowAccent}` : "none",
              } as React.CSSProperties}
            >
              <div className={styles.phoneSpeaker} />
              <div className={styles.previewSimulatorLabel}>Storefront Mobile Simulation (360px)</div>

              {/* 1. Real Announcement Bar */}
              {showAnnouncement && announcementText ? (
                <div
                  className={styles.previewBar}
                  style={
                    currentRecord.preset === "DIWALI"
                      ? {
                          background: "linear-gradient(90deg, #1c1306 0%, #2b1a07 100%)",
                          borderColor: "rgba(217, 119, 6, 0.4)",
                          color: "#ffffff",
                        }
                      : undefined
                  }
                >
                  {enableDecorations ? (
                    <FestivalMotif preset={currentRecord.preset} variant="inline" size={13} />
                  ) : (
                    <span>{currentRecord.metadata.symbol}</span>
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {announcementText}
                  </span>
                </div>
              ) : (
                <div className={styles.previewBar} style={{ background: "#F4F4F5", borderColor: "#E4E4E7" }}>
                  <span>Fast pan-India delivery 🇮🇳 · Custom 3D prints</span>
                </div>
              )}

              {/* 2. Real Brand Header */}
              <div className={styles.previewHeader}>
                <div className={styles.previewLogo}>
                  <span>KASAR DIMENSIONS</span>
                </div>
                {enableDecorations && (
                  <span className={styles.previewTag}>
                    <FestivalMotif preset={currentRecord.preset} variant="badge" size={11} />
                    <span>{currentRecord.metadata.title.split(" ")[0]} Edition</span>
                  </span>
                )}
              </div>

              {/* 3. Real Product Card with Theme Tokens */}
              <div className={styles.previewProductCard}>
                <div className={styles.previewCardMedia}>
                  {enableDecorations && (
                    <span className={styles.previewCardBadge}>
                      <FestivalMotif preset={currentRecord.preset} variant="badge" size={11} />
                      <span>{currentRecord.metadata.title.split(" ")[0]} Pick</span>
                    </span>
                  )}
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    [Product Image]
                  </span>
                </div>
                <div className={styles.previewCardBody}>
                  <span className={styles.previewCardCategory}>3D Printed Artifact</span>
                  <h4 className={styles.previewCardTitle}>Custom Lithophane Night Lamp</h4>
                  <div className={styles.previewCardPriceRow}>
                    <span>₹899</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "line-through" }}>
                      ₹1,199
                    </span>
                  </div>
                  <button type="button" className={styles.previewButton}>
                    <span>Customize Now &rarr;</span>
                  </button>
                </div>
              </div>

              {/* 3b. Diwali "Make It Yours" Festive Moments Snippet */}
              {currentRecord.preset === "DIWALI" && enableDecorations && (
                <div
                  className="p-2.5 rounded-xl border border-amber-300/60 bg-amber-50/70 flex flex-col items-center text-center gap-1.5 my-2 shadow-2xs"
                >
                  <DiyaCluster forceShow={true} showGreeting={true} size="sm" />
                  <span className="text-[9px] font-heading font-extrabold uppercase tracking-widest text-amber-900">
                    Make It Yours — Diwali Curation
                  </span>
                </div>
              )}

              {/* 4. Product Detail Snippet */}
              <div className={styles.previewPdpSnippet}>
                <div className="flex items-center justify-between">
                  <span className={styles.previewPdpLabel}>Product Page Actions</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                    style={{
                      background: "var(--preview-tint)",
                      border: "1px solid var(--preview-border)",
                      color: "var(--preview-accent)",
                    }}
                  >
                    Save 25%
                  </span>
                </div>
                <button type="button" className={styles.previewPdpAddBtn}>
                  <span>ADD TO CART</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
