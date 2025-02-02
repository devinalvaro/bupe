import { Database } from "@db/sqlite";

import { App } from "./App.ts";

const db = new Database("bupe.db");

const app = new App(db);
app.serve();
