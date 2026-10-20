import { withUser, readJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { importCsv } from "@/lib/csv";
import { z } from "zod";

export const maxDuration = 60;

const body = z.object({ csv: z.string().max(1_500_000), dryRun: z.boolean().default(true) });

export const POST = withUser("import", async ({ req, userId }) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, "validation", "Send the CSV text as { csv, dryRun }");
  return importCsv(userId, parsed.data.csv, parsed.data.dryRun);
});
