import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./client";
import type { ApiSuccessResponse } from "./types";
import type {
  FestivalPreset,
  ThemeIntensity,
  ThemeStatus,
} from "../../models/FestivalTheme";
import type { PresetMetadata } from "../festivals/presets";
import type { ActiveFestivalThemePayload } from "../festivals/resolver";

export interface FestivalPresetAdminRecord {
  _id: string | null;
  preset: FestivalPreset;
  title: string;
  status: ThemeStatus;
  isEnabled: boolean;
  startDate: string;
  endDate: string;
  startDateIst: string;
  endDateIst: string;
  startDateHuman: string;
  endDateHuman: string;
  timezone: string;
  intensity: ThemeIntensity;
  customAccentColor: string | null;
  showAnnouncement: boolean;
  announcementText: string;
  enableDecorations: boolean;
  enableAnimations: boolean;
  metadata: PresetMetadata;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SaveFestivalThemePayload {
  preset: FestivalPreset;
  title?: string;
  status: ThemeStatus;
  isEnabled: boolean;
  startDateIst: string;
  endDateIst: string;
  intensity: ThemeIntensity;
  customAccentColor?: string | null;
  showAnnouncement: boolean;
  announcementText?: string;
  enableDecorations: boolean;
  enableAnimations: boolean;
}

type ActiveThemeResponse = ApiSuccessResponse<{
  theme: ActiveFestivalThemePayload;
}>;

type AdminThemesResponse = ApiSuccessResponse<{
  presets: FestivalPresetAdminRecord[];
  activeTheme: ActiveFestivalThemePayload;
}>;

type SaveThemeResponse = ApiSuccessResponse<{
  theme: FestivalPresetAdminRecord;
  activeTheme: ActiveFestivalThemePayload;
  message?: string;
}>;

type RevertThemeResponse = ApiSuccessResponse<{
  message: string;
  activeTheme: ActiveFestivalThemePayload;
}>;

export const festivalThemeQueryKeys = {
  active: ["festival-theme", "active"] as const,
  adminList: ["admin", "festival-themes"] as const,
};

export async function fetchActiveFestivalTheme(signal?: AbortSignal): Promise<ActiveFestivalThemePayload> {
  const response = await apiRequest<ActiveThemeResponse>("GET", "/api/festival-theme/active", {
    signal,
  });
  return response.theme;
}

export async function fetchAdminFestivalThemes(signal?: AbortSignal): Promise<{
  presets: FestivalPresetAdminRecord[];
  activeTheme: ActiveFestivalThemePayload;
}> {
  const response = await apiRequest<AdminThemesResponse>("GET", "/api/admin/festival-themes", {
    signal,
  });
  return {
    presets: response.presets,
    activeTheme: response.activeTheme,
  };
}

export async function saveFestivalThemeApi(payload: SaveFestivalThemePayload) {
  const response = await apiRequest<SaveThemeResponse, SaveFestivalThemePayload>(
    "POST",
    "/api/admin/festival-themes",
    {
      body: payload,
    }
  );
  return response;
}

export async function revertToDefaultBrandApi() {
  const response = await apiRequest<RevertThemeResponse, { action: string }>(
    "POST",
    "/api/admin/festival-themes",
    {
      body: { action: "REVERT_DEFAULT" },
    }
  );
  return response;
}

/**
 * Hook for storefront components to read the current active festival theme.
 * Checks for updates periodically while respecting fast local cache.
 */
export function useActiveFestivalTheme() {
  return useQuery({
    queryKey: festivalThemeQueryKeys.active,
    queryFn: ({ signal }) => fetchActiveFestivalTheme(signal),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // 60-second polling for live schedule transitions
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for Admin Festival Themes management page.
 */
export function useAdminFestivalThemes() {
  return useQuery({
    queryKey: festivalThemeQueryKeys.adminList,
    queryFn: ({ signal }) => fetchAdminFestivalThemes(signal),
    staleTime: 10 * 1000,
    gcTime: 60 * 1000,
  });
}

/**
 * Hook to save or publish a theme preset.
 */
export function useSaveFestivalTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveFestivalThemeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: festivalThemeQueryKeys.adminList });
      queryClient.invalidateQueries({ queryKey: festivalThemeQueryKeys.active });
    },
  });
}

/**
 * Hook to instantly revert store back to Default Brand.
 */
export function useRevertFestivalTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revertToDefaultBrandApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: festivalThemeQueryKeys.adminList });
      queryClient.invalidateQueries({ queryKey: festivalThemeQueryKeys.active });
    },
  });
}
