import gs from "../../../api-lib/db";
import {
  GongoDocument,
  CollectionEventProps,
  userIsAdmin,
  userIdMatches,
  // userIdMatches,
} from "gongo-server-db-mongo/lib/collection";
import { ChangeSetUpdate } from "gongo-server/lib/DatabaseAdapter";
// import { ipFromReq, ipPass } from "../../src/api-lib/ipCheck";
import { ObjectId } from "@/api-lib/objectId";

export const runtime = "edge";

// gs.db.Users.ensureAdmin("dragon@wastelands.net", "initialPassword");
/*
gs.publish("accounts", (db) =>
  db.collection("accounts").find({ userId: { $exists: false } })
);
*/

// based on userIdMatches
export async function userIdIsInPractice<DocType extends GongoDocument>(
  doc: DocType | ChangeSetUpdate | string,
  { auth, collection, eventName }: CollectionEventProps<DocType>,
) {
  const userId = await auth.userId();
  if (!userId) return "NOT_LOGGED_IN";

  const practices = await gs.dba
    .collection("practices")
    .find({ userId })
    .toArray();
  const practiceIdStrs = practices.map((p) => p._id.toHexString());

  // TODO, use this instead of inspecting doc? :)
  eventName;

  // UPDATES (doc is a ChangeSetUpdate)
  if (typeof doc === "object" && "patch" in doc) {
    const docId = typeof doc._id === "string" ? new ObjectId(doc._id) : doc._id;
    const existingDoc = await collection.findOne(docId);
    if (!existingDoc) return "NO_EXISTING_DOC";
    return (
      // userId.equals(existingDoc.userId) || "doc.userId !== userId (for patch)"
      practiceIdStrs.includes(existingDoc.practiceId.toHexString()) ||
      "doc.practiceId not in user's practiceIds (for patch)"
    );
  }

  // DELETES (doc is an ObjectId)
  if (doc instanceof ObjectId || typeof doc === "string") {
    const query: Partial<GongoDocument> = {
      _id: typeof doc === "string" ? new ObjectId(doc) : doc,
    };
    const existingDoc = await collection.findOne(query);
    if (!existingDoc) return "NO_EXISTING_DOC";
    return (
      // userId.equals(existingDoc.userId) || "doc.userId !== userId (for delete)"
      practiceIdStrs.includes(existingDoc.practiceId.toHexString()) ||
      "doc.practiceId not in user's practiceIds (for delete)"
    );
  }

  /*
  console.log({ doc, userId });
  console.log(1, userId.toHexString());
  console.log(2, doc.userId?.toString());
  console.log(3, userId.equals(doc.userId));
  */

  return (
    // userId.toHexString() === (doc.userId?.toHexString() || doc.userId) ||
    // "doc.userId !== userId (for unmatched)"
    practiceIdStrs.includes(doc.practiceId.toHexString()) ||
    "doc.practiceId not in user's practiceIds (for unmatched)"
  );
  // [TypeError: Cannot read properties of undefined (reading '11')]
  // return userId.equals(doc.userId) || "doc.userId !== userId (for unmatched)";
}

gs.publish("user", async (db, _opts, { auth, updatedAt }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const fullUser = await db.collection("users").findOne({ _id: userId });
  if (!fullUser || fullUser.__updatedAt === updatedAt.users) return [];

  const user = { ...fullUser };
  delete user.services;
  delete user.password;

  return [
    {
      coll: "users",
      entries: [user],
    },
  ];
});

gs.publish("usersForAdmin", async (db, _opts, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  const query = { _id: { $ne: userId } };

  return await db.collection("users").find(query).project({
    _id: true,
    emails: true,
    username: true,
    displayName: true,
    admin: true,
    createdAt: true,
    __updatedAt: true,
  });
});

gs.publish(
  "clientsForPractice",
  async (db, { _id }: { _id: string }, { auth }) => {
    const userId = await auth.userId();
    if (!userId) return [];

    const practiceId = new ObjectId(_id);
    const practice = await db
      .collection("practices")
      .findOne({ _id: practiceId });
    if (!practice || practiceId.toHexString() !== userId.toHexString())
      return [];

    const query = { practiceIds: practiceId };
    return db.collection("clients").find(query);
  },
);

gs.publish("client", async (db, _opts) => {
  return db.collection("client").find({ _id: _opts._id });
});

gs.publish("practice", async (db, _opts) => {
  return db.collection("practices").find({ _id: _opts._id });
});

gs.publish("practicesForUser", async (db, _opts, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const query = { userId };

  return db.collection("practices").find(query);
});

if (gs.dba) {
  const db = gs.dba;

  const users = db.collection("users");
  users.allow(
    "update",
    async (
      doc: GongoDocument | ChangeSetUpdate | string,
      eventProps: CollectionEventProps,
    ) => {
      const isAdmin = await userIsAdmin(doc, eventProps);
      if (isAdmin === true) return true;

      if (typeof doc === "object" && "patch" in doc) {
        if (doc.patch.length === 1) {
          if (doc.patch[0].path === "/dob") {
            // Ok for now
            return true;
          }
        }
      }

      return "ACCESS_DENIED";
    },
  );

  const practices = db.collection("practices");
  practices.allow("insert", userIdMatches);
  practices.allow("update", userIdMatches);
  practices.allow("remove", userIdMatches);

  const clients = db.collection("clients");
  clients.allow("insert", userIdIsInPractice);
  clients.allow("update", userIdIsInPractice);
  clients.allow("remove", userIdIsInPractice);
}

// module.exports = gs.expressPost();
const gsExpressPost =
  runtime === "edge" ? gs.vercelEdgePost() : gs.expressPost();

/*
async function gongoPoll(req: Request) {
  /*
  if (
    process.env.NODE_ENV === "production" &&
    !(await ipPass(ipFromReq(req)))
  ) {
    res.status(403).end("IP not allowed");
    return;
  }
  */ /*

  // @ ts-expect-error: TODO
  return gsExpressPost(req, res);
}
*/

export const POST = gsExpressPost;
