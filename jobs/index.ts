import { analysisPaid } from "./analysis-paid";
import { extractAnalysis } from "./extract-analysis";
import { hello } from "./hello";
import { purgeFiles } from "./purge-files";
import { runRecheck } from "./run-recheck";

export const functions = [hello, extractAnalysis, analysisPaid, purgeFiles, runRecheck];
