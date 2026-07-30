require("dotenv").config();
const { db, Rooms, Users, Sessions } = require("./models");

const userSeeds = [
  {
    auth0Id: "auth0|user1",
    name: "Alex Kim",
    email: "alex@example.com",
    school: "NYU",
    displayName: "Alex",
  },
  {
    auth0Id: "auth0|user2",
    name: "Jordan Lee",
    email: "jordan@example.com",
    school: "Columbia",
    displayName: "Jordan",
  },
  {
    auth0Id: "auth0|user3",
    name: "Sam Rivera",
    email: "sam@example.com",
    school: "NYU",
    displayName: "Sam",
  },
];

const roomSeeds = [
  {
    name: "Quiet Study Room",
    description: "For focused, silent work",
    capacity: 2,
    password: null,
    image: "/quiet.jpg",
  },
  {
    name: "Group Project Room",
    description: "Whiteboard, good for group work",
    capacity: 4,
    password: "1234",
    image: "/group.jpg",
  },
  {
    name: "Lecture Review Room",
    description: "For reviewing lecture notes together",
    capacity: 8,
    password: null,
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

    // link users to rooms through Sessions, with role/joinedAt data
    await quietRoom.addUser(alex, { through: { role: "host" } });

    await groupRoom.addUser(alex, { through: { role: "student" } });
    await groupRoom.addUser(jordan, { through: { role: "host" } });
    await groupRoom.addUser(sam, { through: { role: "student" } });

    await lectureRoom.addUser(sam, { through: { role: "host" } });
    await lectureRoom.addUser(jordan, { through: { role: "student" } });

    console.log(" Linked users to rooms via Sessions.");

    process.exit(0);
  } catch (error) {
    console.error(" Seed failed:", error);
    process.exit(1);
  }
}

seed();
