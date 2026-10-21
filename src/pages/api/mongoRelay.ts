import type { NextApiRequest, NextApiResponse } from "next";
export default function retiredMongoRelay(
  _request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "no-store");
  response.status(410).json({ error: "LEGACY_CLIENT_RETIRED" });
}
