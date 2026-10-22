import { analysisPaid } from "./analysis-paid";
import { extractAnalysis } from "./extract-analysis";
import { hello } from "./hello";
import { purgeFiles } from "./purge-files";

export const functions = [hello, extractAnalysis, analysisPaid, purgeFiles];
