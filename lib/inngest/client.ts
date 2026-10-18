import { Inngest } from "inngest";

// En local, INNGEST_DEV apunta al dev server del compose (http://inngest:8288).
// En producción se usan INNGEST_EVENT_KEY e INNGEST_SIGNING_KEY de Inngest Cloud.
export const inngest = new Inngest({ id: "contrato-claro" });
