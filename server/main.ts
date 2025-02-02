import { Database } from "@db/sqlite";

import { serve } from "./server.ts";

const db = new Database("bupe.db");

serve(db);
