export async function GET() {
  return Response.json(
    {
      success: false,
      message: "This development test endpoint is no longer used. Production email delivery is handled by Better Auth email verification and password reset flows.",
    },
    { status: 410 }
  );
}