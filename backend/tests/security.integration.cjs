const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { randomBytes } = require("node:crypto");
const backendRequire = createRequire(
  require("node:path").resolve(__dirname, "../package.json"),
);
const mongoose = backendRequire("mongoose");
const jwt = backendRequire("jsonwebtoken");
let server, base, models, users, complaints, departments;
const secret = randomBytes(48).toString("hex");
function token(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      department: user.department?.toString() || null,
    },
    secret,
  );
}
async function request(path, user, { method = "GET", body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(user
        ? {
            Authorization:
              "Bearer " + (typeof user === "string" ? user : token(user)),
          }
        : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: await res.json() };
}
before(async () => {
  assert.ok(
    process.env.TEST_MONGODB_URI,
    "Set TEST_MONGODB_URI to a local disposable MongoDB",
  );
  const uri = new URL(process.env.TEST_MONGODB_URI);
  assert.equal(uri.protocol, "mongodb:");
  assert.ok(
    ["127.0.0.1", "localhost"].includes(uri.hostname),
    "Integration tests require local MongoDB",
  );
  process.env.JWT_SECRET = secret;
  await mongoose.connect(process.env.TEST_MONGODB_URI, {
    dbName: "smartresolve_test_" + randomBytes(8).toString("hex"),
  });
  models = await import("../src/models.js");
  const { User, Department, Complaint } = models;
  await Promise.all(Object.values(models).map((model) => model.init()));
  departments = await Department.create([
    { name: "Water", categories: ["Water Supply"] },
    { name: "Electric", categories: ["Electricity"] },
  ]);
  users = await User.create([
    { name: "Owner", email: "owner@test.local", password: "hash" },
    { name: "Other", email: "other@test.local", password: "hash" },
    {
      name: "Staff",
      email: "staff@test.local",
      password: "hash",
      role: "staff",
      department: departments[0].id,
    },
    {
      name: "Unassigned staff",
      email: "unassigned@test.local",
      password: "hash",
      role: "staff",
    },
    {
      name: "Admin",
      email: "admin@test.local",
      password: "private-hash",
      role: "admin",
    },
    {
      name: "Other staff",
      email: "electric@test.local",
      password: "hash",
      role: "staff",
      department: departments[1].id,
    },
  ]);
  complaints = await Complaint.create([
    {
      code: "TEST-OWN",
      title: "Water pipe broken near school",
      description: "Water pipe broken near school entrance",
      category: "Water Supply",
      location: "School",
      owner: users[0].id,
      department: departments[0].id,
    },
    {
      code: "TEST-PRIVATE",
      title: "Water pipe broken near school",
      description: "Water pipe broken near school entrance",
      category: "Water Supply",
      location: "School",
      owner: users[1].id,
      department: departments[1].id,
      contact: "private-contact",
    },
    {
      code: "TEST-UNASSIGNED",
      title: "Unassigned water report",
      description: "A private unassigned complaint",
      owner: users[1].id,
    },
  ]);
  const { app } = await import("../src/server.js");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("staff can read assigned reports with populated departments and cannot modify others", async () => {
  assert.equal(
    (await request("/complaints/" + complaints[0].id, users[2])).status,
    200,
  );
  assert.equal(
    (await request("/complaints/" + complaints[1].id, users[2])).status,
    403,
  );
  assert.equal(
    (
      await request("/complaints/" + complaints[1].id, users[0], {
        method: "PATCH",
        body: { status: "Under Review" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/complaints/" + complaints[0].id, users[2], {
        method: "PATCH",
        body: { priority: "Low", reason: "Not an administrator" },
      })
    ).status,
    403,
  );
});

test("SLA analytics distinguishes on-time and late resolutions", async () => {
  const user = await models.User.create({
    name: "Analytics",
    email: "analytics@test.local",
    password: "hash",
  });
  for (const [code, resolvedAt] of [
    ["SLA-ON-TIME", "2025-01-01"],
    ["SLA-LATE", "2025-01-03"],
  ]) {
    await models.Complaint.create({
      code,
      title: "Water report",
      description: "Water pipe failure",
      owner: user.id,
      status: "Resolved",
      slaDue: new Date("2025-01-02"),
      statusHistory: [{ status: "Resolved", at: new Date(resolvedAt) }],
    });
  }
  const res = await request("/analytics", user);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.slaCompliance, 50);
});

test("multipart complaints reject oversized fields and unsupported attachments", async () => {
  const headers = { Authorization: "Bearer " + token(users[0]) };
  const form = new FormData();
  form.set("description", "x".repeat(20000));
  assert.equal(
    (await fetch(base + "/complaints", { method: "POST", headers, body: form }))
      .status,
    400,
  );
  const attachment = new FormData();
  attachment.set(
    "image",
    new Blob(["not an image"], { type: "text/plain" }),
    "file.txt",
  );
  assert.equal(
    (
      await fetch(base + "/complaints", {
        method: "POST",
        headers,
        body: attachment,
      })
    ).status,
    400,
  );
});

test("passwords exceeding bcrypt byte limit are rejected and duplicate registration returns conflict", async () => {
  assert.equal(
    (
      await request("/auth/register", null, {
        method: "POST",
        body: {
          name: "Test",
          email: "large@test.local",
          password: "🔒".repeat(20),
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/auth/register", null, {
        method: "POST",
        body: {
          name: "Test",
          email: users[0].email,
          password: "test-password",
        },
      })
    ).status,
    409,
  );
});
test("duplicate suggestions do not expose another citizen or department", async () => {
  for (const user of [users[0], users[2]]) {
    const res = await request("/duplicates/" + complaints[0].id, user);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 0);
  }
  assert.equal(
    (await request("/duplicates/" + complaints[0].id, users[4])).body.length,
    1,
  );
});
test("staff without a department cannot list unassigned private complaints", async () => {
  const res = await request("/complaints", users[3]);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
});
test("existing tokens immediately honor demotion and department changes", async () => {
  const staleToken = token(users[4]);
  await models.User.updateOne(
    { _id: users[4].id },
    { $set: { role: "complainant" } },
  );
  try {
    assert.equal((await request("/admin/users", staleToken)).status, 403);
  } finally {
    await models.User.updateOne(
      { _id: users[4].id },
      { $set: { role: "admin" } },
    );
  }
  const staffToken = token(users[2]);
  await models.User.updateOne(
    { _id: users[2].id },
    { $set: { department: departments[1].id } },
  );
  try {
    assert.equal(
      (await request("/complaints/" + complaints[0].id, staffToken)).status,
      403,
    );
  } finally {
    await models.User.updateOne(
      { _id: users[2].id },
      { $set: { department: departments[0].id } },
    );
  }
});
test("tokens belonging to deleted accounts are rejected", async () => {
  const ghost = await models.User.create({
    name: "Deleted",
    email: "deleted@test.local",
    password: "hash",
    role: "admin",
  });
  const staleToken = token(ghost);
  await ghost.deleteOne();
  assert.equal((await request("/admin/users", staleToken)).status, 401);
});
test("admin role changes never return a password hash", async () => {
  const res = await request("/admin/users/" + users[1].id, users[4], {
    method: "PATCH",
    body: { role: "complainant" },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.password, undefined);
});
test("complaint search treats metacharacters literally and rejects malformed filters", async () => {
  const res = await request(
    "/complaints?search=" + encodeURIComponent(".*"),
    users[4],
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
  for (const query of [
    "page=Infinity",
    "page=1.5",
    "status[$ne]=Resolved",
    "priority[$ne]=Low",
    "search[$ne]=x",
  ]) {
    assert.equal(
      (await request("/complaints?" + query, users[4])).status,
      400,
      query,
    );
  }
});
test("malformed IDs and JSON return client errors", async () => {
  for (const path of ["/complaints/not-an-id", "/duplicates/not-an-id"]) {
    assert.equal((await request(path, users[0])).status, 400);
  }
  const res = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(res.status, 400);
});
test("duplicate grouping rejects repeated and nonexistent complaints without creating groups", async () => {
  const before = await models.IncidentGroup.countDocuments();
  for (const ids of [
    [complaints[0].id, complaints[0].id],
    [complaints[0].id, new mongoose.Types.ObjectId().toString()],
  ]) {
    const res = await request("/duplicates/group", users[4], {
      method: "POST",
      body: { ids },
    });
    assert.ok([400, 404].includes(res.status), JSON.stringify(res));
  }
  assert.equal(await models.IncidentGroup.countDocuments(), before);
});
test("admin cannot assign complaints to missing departments or staff from another department", async () => {
  for (const body of [
    { department: new mongoose.Types.ObjectId().toString() },
    { assignee: users[5].id },
  ]) {
    const res = await request("/complaints/" + complaints[0].id, users[4], {
      method: "PATCH",
      body: { ...body, reason: "Regression test" },
    });
    assert.equal(res.status, 400);
  }
});
test("register, login, submit, resolve, reopen and feedback work against MongoDB", async () => {
  const credentials = {
    email: "workflow@test.local",
    password: randomBytes(24).toString("hex"),
  };
  assert.equal(
    (
      await request("/auth/register", null, {
        method: "POST",
        body: { ...credentials, name: "Workflow user" },
      })
    ).status,
    201,
  );
  const login = await request("/auth/login", null, {
    method: "POST",
    body: credentials,
  });
  assert.equal(login.status, 200);
  const user = login.body.token;
  const created = await request("/complaints", user, {
    method: "POST",
    body: {
      title: "Water pipe needs repair",
      description: "Water pipe is broken outside the school entrance",
      location: "School",
      ongoingDanger: true,
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.priority, "Critical");
  const path = "/complaints/" + created.body._id;
  assert.equal((await request(path, users[1])).status, 403);
  for (const status of ["Under Review", "In Progress", "Resolved"]) {
    assert.equal(
      (
        await request(path, users[4], {
          method: "PATCH",
          body: { status, resolution: "Pipe repaired" },
        })
      ).status,
      200,
    );
  }
  assert.equal(
    (await request(path + "/confirm", user, { method: "POST" })).status,
    200,
  );
  assert.equal(
    (
      await request(path + "/feedback", user, {
        method: "POST",
        body: { rating: 5, comment: "Fixed" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(path, user, {
        method: "PATCH",
        body: { status: "Reopened" },
      })
    ).status,
    200,
  );
  const reopened = await request(path, user);
  assert.equal(reopened.body.confirmed, false);
  assert.equal(reopened.body.resolution, "");
});
