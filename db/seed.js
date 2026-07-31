require("dotenv").config();
const { db, Rooms, Users, Sessions } = require("../models");

const userSeeds = [
  {
    auth0Id: "auth0|user1",
    username: "Alex Kim",
    email: "alex@example.com",
    school: "NYU",
    displayName: "Alex",
    icon: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHpuNHBrdTFuaWkydWd5OThqcHpnNXBkemdtZmFyd3I5azh2MWFwOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YyBJAtdE0J1ICApl71/giphy.gif",
  },
  {
    auth0Id: "auth0|user2",
    username: "Jordan Lee",
    email: "jordan@example.com",
    school: "Columbia",
    displayName: "Jordan",
    icon: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3ZnZ3BjZTFtand1Z2lhc2o5cHcycmdsODVjbXUxZWEyMTl3NXg4ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7KgtqaBqt7fEOw9JyI/giphy.gif",
  },
  {
    auth0Id: "auth0|user3",
    username: "Sam Rivera",
    email: "sam@example.com",
    school: "CUNY",
    displayName: "Sam",
    icon: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2ljMGppZzU4cXpycnA0dWdiZ2s4YWR0cWoxZm1idjI3ejludXJtaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LHZyixOnHwDDy/giphy.gif",
  },
];

const roomSeeds = [
  {
    name: "Quiet Study Room",
    description: "For focused, silent work",
    capacity: 2,
    password: null,
    adminUserId: null,
    is_default: true,
    image: "/quiet.jpg",
  },
  {
    name: "Group Project Room",
    description: "Whiteboard, good for group work",
    capacity: 4,
    password: "1234",
    adminUserId: null,
    is_default: true,
    image: "/group.jpg",
  },
  {
    name: "Lecture Review Room",
    description: "For reviewing lecture notes together",
    capacity: 8,
    password: null,
    adminUserId: null,
    is_default: true,
    image: "/lecture1.jpg",
  },
];

async function seed() {
  try {
    await db.authenticate();
    console.log(" Database connection established.");

    // force: true drops and recreates tables - fine here, never in startServer()
    await db.sync({ force: true });
    console.log(" Tables synced.");

    const users = await Users.bulkCreate(userSeeds);
    console.log(` Seeded ${users.length} users.`);

    const rooms = await Rooms.bulkCreate(roomSeeds);
    console.log(`Seeded ${rooms.length} rooms.`);

    const [alex, jordan, sam] = users;
    const [quietRoom, groupRoom, lectureRoom] = rooms;

    const sessionSeeds = [
      {
        userId: alex.id,
        roomId: quietRoom.id,
        startedAt: new Date("2026-07-28T14:00:00"),
        endedAt: new Date("2026-07-28T14:30:00"),
        durationSeconds: 1800,
      },
      {
        userId: alex.id,
        roomId: groupRoom.id,
        startedAt: new Date("2026-07-28T16:00:00"),
        endedAt: new Date("2026-07-28T17:00:00"),
        durationSeconds: 3600,
      },
      {
        userId: jordan.id,
        roomId: groupRoom.id,
        startedAt: new Date("2026-07-28T16:15:00"),
        endedAt: new Date("2026-07-28T17:00:00"),
        durationSeconds: 2700,
      },
      {
        userId: sam.id,
        roomId: lectureRoom.id,
        startedAt: new Date("2026-07-29T10:00:00"),
        endedAt: new Date("2026-07-29T10:45:00"),
        durationSeconds: 2700,
      },
    ];

    const sessions = await Sessions.bulkCreate(sessionSeeds);
    console.log(`Seeded ${sessions.length} study sessions.`);

    // link users to rooms through Sessions, with role/joinedAt data
    // await quietRoom.addUser(alex, { through: { role: "host" } });

    // await groupRoom.addUser(alex, { through: { role: "student" } });
    // await groupRoom.addUser(jordan, { through: { role: "host" } });
    // await groupRoom.addUser(sam, { through: { role: "student" } });

    // await lectureRoom.addUser(sam, { through: { role: "host" } });
    // await lectureRoom.addUser(jordan, { through: { role: "student" } });

    console.log(" Linked users to rooms via Sessions.");

    process.exit(0);
  } catch (error) {
    console.error(" Seed failed:", error);
    process.exit(1);
  }
}

seed();
