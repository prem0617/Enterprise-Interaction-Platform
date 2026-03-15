import "../env.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise_platform";

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const birthdays = [
    ["sarah.williams", new Date(1990, 2, 18)],
    ["david.brown", new Date(1988, 6, 12)],
    ["alex.chen", new Date(1992, 3, 20)],
    ["priya.sharma", new Date(1994, 2, 22)],
    ["marcus.weber", new Date(1991, 8, 5)],
    ["elena.rodriguez", new Date(1987, 2, 16)],
    ["james.obrien", new Date(1993, 11, 1)],
    ["kai.tanaka", new Date(1995, 4, 10)],
    ["lukas.mueller", new Date(1990, 0, 15)],
    ["arun.patel", new Date(1996, 2, 25)],
    ["sophie.anderson", new Date(1992, 7, 30)],
    ["ravi.kumar", new Date(1994, 5, 20)],
    ["emma.fischer", new Date(1998, 10, 8)],
    ["olivia.taylor", new Date(1991, 2, 19)],
    ["ananya.gupta", new Date(1993, 1, 14)],
    ["noah.schmidt", new Date(1995, 9, 3)],
    ["liam.johnson", new Date(1990, 3, 7)],
    ["meera.nair", new Date(1994, 6, 22)],
    ["felix.braun", new Date(1999, 4, 1)],
    ["victoria.chang", new Date(1988, 2, 28)],
    ["robert.kim", new Date(1992, 11, 25)],
    ["neha.reddy", new Date(1996, 8, 15)],
  ];

  let updated = 0;
  for (const [emailPrefix, dob] of birthdays) {
    const result = await User.updateOne(
      { email: { $regex: new RegExp("^" + emailPrefix) } },
      { date_of_birth: dob }
    );
    if (result.modifiedCount > 0) updated++;
  }

  console.log(`✓ Updated ${updated} users with birthdays`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
