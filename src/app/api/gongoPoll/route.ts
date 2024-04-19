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