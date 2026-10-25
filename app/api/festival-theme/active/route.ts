import { NextResponse } from "next/server";
import { getActiveFestivalTheme, DEFAULT_THEME_PAYLOAD } from "../../../lib/festivals/resolver";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const theme = await getActiveFestivalTheme();

    return NextResponse.json(
      {
        status: "ok",
        theme,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Public Festival Theme API error:", error);
    return NextResponse.json(
      {
        status: "ok",
        theme: DEFAULT_THEME_PAYLOAD,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
