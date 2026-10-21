import { isDatabaseActivated } from "@/server/activation";
export const dynamic = "force-dynamic";
export async function GET() {
  const ready = await isDatabaseActivated();
  return Response.json(
    { ready },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "private,no-store" },
    },
  );
}
