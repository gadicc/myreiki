"use client";
import db from "gongo-client";
import HTTPTransport from "gongo-client/lib/transports/http";

import { Collection } from "gongo-client";
// import GongoAuth from "gongo-client/lib/auth";

import type { Practice, Treatment, User } from "../schemas";
import { Client } from "@/schemas/client";

// const out = { db };

// db.extend("auth", GongoAuth);
db.extend("transport", HTTPTransport, {
  pollInterval: 60 /*5*/ * 1000,
  pollWhenIdle: false,
  idleTimeout: 60 * 1000,
});

// see also login.tsx TODO TMP
db.subscribe("user");
//db.subscribe("user", {}, { minInterval: 10_000, maxInterval: 60_000 });
// db.subscribe("user", {}, { minInterval: 1000000, maxInterval: 300000000 });

if (typeof window !== "undefined")
  setTimeout(() => {
    // TODO disable in gongo-client?
    // Disabled here since we can subscribe just when Login() component active
    const accounts = db.subscriptions.get('["accounts",null,{}]');
    if (accounts) accounts.active = false;

    const docs = db
      .collection("accounts")
      .find({ userId: { $exists: true } })
      .toArraySync();
    for (const doc of docs) {
      db.collection("accounts")._remove(doc._id);
    }
  }, 5000);

db.collection("users").persist();
db.collection("practices").persist();
db.collection("treatments").persist();
db.collection("clients").persist();

declare module "gongo-client" {
  class Database {
    collection(name: "users"): Collection<User>;
    collection(name: "practices"): Collection<Practice>;
    collection(name: "clients"): Collection<Client>;
    collection(name: "treatments"): Collection<Treatment>;
  }
}

if (typeof window !== "undefined")
  // @ts-expect-error: it's fine
  window.db = db;

console.log("db");
