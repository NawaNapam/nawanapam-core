import { authOptions } from "@/lib/authOptions";
import { apiRateLimiter, getClientIdentifier } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const isConfigured = !!(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export async function POST(req: Request) {
  // Without these env vars, signing with `undefined` still returns 200 with
  // a signature that fails at the Cloudinary upload step — same end result
  // for the user, but this fails fast with a clear cause instead of masking
  // a config gap behind a generic "upload failed" error.
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Avatar upload is not configured" },
      { status: 503 },
    );
  }

  const identifier = getClientIdentifier(req);
  const { success } = await apiRateLimiter.limit(identifier);
  if (!success) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "avatars";
  const publicId = `user_${session.user.id}`;

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
    overwrite: true,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    publicId,
    apiKey,
    cloudName,
  });
}
