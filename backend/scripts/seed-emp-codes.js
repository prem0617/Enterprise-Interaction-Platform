import "../env.js";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise_platform";
const PREFIX = process.env.COMPANY_CODE || "EIP";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const employees = await Employee.find({ $or: [{ emp_code: null }, { emp_code: { $exists: false } }] }).sort({ createdAt: 1 });
  let num = 1;
  const last = await Employee.findOne({ emp_code: { $regex: `^${PREFIX}-` } }).sort({ emp_code: -1 }).select("emp_code").lean();
  if (last?.emp_code) {
    num = parseInt(last.emp_code.split("-")[1], 10) + 1;
  }
  let count = 0;
  for (const emp of employees) {
    emp.emp_code = `${PREFIX}-${String(num).padStart(4, "0")}`;
    await emp.save();
    num++;
    count++;
  }
  console.log(`✓ Assigned emp_code to ${count} employees (${PREFIX}-0001 to ${PREFIX}-${String(num - 1).padStart(4, "0")})`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
