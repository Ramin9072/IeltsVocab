import { withUser } from "@/lib/api";
import { exportCsv } from "@/lib/csv";

export const maxDuration = 60;

export const GET = withUser("export", async ({ userId }) => {
  const csv = await exportCsv(userId);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vocabulary.csv"',
      "Cache-Control": "no-store",
    },
  });
});
