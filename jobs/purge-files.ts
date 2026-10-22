import { inngest } from "@/lib/inngest/client";
import { deleteObjects } from "@/lib/storage/s3";

// Borra de S3 los archivos de una cuenta borrada (spec 05, `purgeFiles`). La
// acción de /cuenta junta las claves antes de borrar las filas de la base.
export const purgeFiles = inngest.createFunction(
  { id: "purge-files", triggers: [{ event: "account/deleted" }], retries: 5 },
  async ({ event, step }) => {
    const { storageKeys } = event.data as { userId: string; storageKeys: string[] };
    const deleted = await step.run("borrar archivos", () => deleteObjects(storageKeys));
    return { deleted };
  },
);
