import { NextResponse } from "next/server";
import { connectDB } from "../../lib/db";
import User from "../../models/Users";

export async function GET() {
  try {
    await connectDB();

    const count = await User.countDocuments();

    return NextResponse.json({
      status: "ok",
      users: count,
    });
  } catch (error) {
    console.error("Users API error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to access users",
      },
      { status: 500 }
    );
  }
}