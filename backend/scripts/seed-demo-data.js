#!/usr/bin/env node
/**
 * Seed script: creates departments, teams, and demo employees.
 * Run: node backend/scripts/seed-demo-data.js
 */
import "../env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/enterprise_platform";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // ─── 1. Create Parent Departments ───
  const deptDefs = [
    { name: "Administration", code: "ADM", color: "#6366f1", description: "General administration and executive leadership" },
    { name: "Human Resources", code: "HR", color: "#ec4899", description: "Employee relations, recruitment, and benefits" },
    { name: "DevOps", code: "DEVOPS", color: "#f59e0b", description: "Infrastructure, CI/CD, and cloud operations" },
    { name: "Cybersecurity", code: "CSEC", color: "#ef4444", description: "Security operations, threat analysis, and compliance" },
    { name: "Web Development", code: "WEBDEV", color: "#3b82f6", description: "Frontend and backend web application development" },
    { name: "Mobile Development", code: "MOBDEV", color: "#10b981", description: "iOS and Android application development" },
    { name: "Tax Analysts", code: "TAX", color: "#8b5cf6", description: "Tax planning, compliance, and financial analysis" },
  ];

  const departments = {};
  for (const def of deptDefs) {
    let dept = await Department.findOne({ code: def.code });
    if (!dept) {
      dept = await Department.create({ ...def, type: "department" });
      console.log(`✓ Created department: ${def.name}`);
    } else {
      console.log(`  Skipped (exists): ${def.name}`);
    }
    departments[def.code] = dept;
  }

  // ─── 2. Create Child Teams ───
  const teamDefs = [
    { name: "Rust Team", code: "RUST", color: "#dc6b2f", parent: "WEBDEV", description: "Rust-based backend services and WebAssembly" },
    { name: "Angular Team", code: "ANGULAR", color: "#dd0031", parent: "WEBDEV", description: "Angular frontend applications" },
    { name: "iOS Team", code: "IOS", color: "#147efb", parent: "MOBDEV", description: "Native iOS development with Swift" },
    { name: "Android Team", code: "ANDROID", color: "#3ddc84", parent: "MOBDEV", description: "Native Android development with Kotlin" },
  ];

  const teams = {};
  for (const def of teamDefs) {
    let team = await Department.findOne({ code: def.code });
    if (!team) {
      team = await Department.create({
        name: def.name,
        code: def.code,
        color: def.color,
        description: def.description,
        type: "team",
        parent_department_id: departments[def.parent]._id,
      });
      console.log(`✓ Created team: ${def.name} (under ${def.parent})`);
    } else {
      console.log(`  Skipped (exists): ${def.name}`);
    }
    teams[def.code] = team;
  }

  // ─── 3. Create Demo Employees ───
  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash("Password123!", salt);

  const employeeDefs = [
    // HR
    { first_name: "Sarah", last_name: "Williams", email: "sarah.williams@enterprise.com", phone: "+14155001001", country: "usa", dept: "HR", position: "team_lead" },
    { first_name: "David", last_name: "Brown", email: "david.brown@enterprise.com", phone: "+14155001002", country: "usa", dept: "HR", position: "senior_engineer" },

    // DevOps
    { first_name: "Alex", last_name: "Chen", email: "alex.chen@enterprise.com", phone: "+14155001003", country: "usa", dept: "DEVOPS", position: "team_lead" },
    { first_name: "Priya", last_name: "Sharma", email: "priya.sharma@enterprise.com", phone: "+919876001001", country: "india", dept: "DEVOPS", position: "senior_engineer" },
    { first_name: "Marcus", last_name: "Weber", email: "marcus.weber@enterprise.com", phone: "+491511001001", country: "germany", dept: "DEVOPS", position: "engineer" },

    // Cybersecurity
    { first_name: "Elena", last_name: "Rodriguez", email: "elena.rodriguez@enterprise.com", phone: "+14155001004", country: "usa", dept: "CSEC", position: "team_lead" },
    { first_name: "James", last_name: "O'Brien", email: "james.obrien@enterprise.com", phone: "+14155001005", country: "usa", dept: "CSEC", position: "senior_engineer" },

    // Web Dev - Rust Team
    { first_name: "Kai", last_name: "Tanaka", email: "kai.tanaka@enterprise.com", phone: "+14155001006", country: "usa", dept: "RUST", position: "team_lead" },
    { first_name: "Lukas", last_name: "Mueller", email: "lukas.mueller@enterprise.com", phone: "+491511001002", country: "germany", dept: "RUST", position: "senior_engineer" },
    { first_name: "Arun", last_name: "Patel", email: "arun.patel@enterprise.com", phone: "+919876001002", country: "india", dept: "RUST", position: "engineer" },

    // Web Dev - Angular Team
    { first_name: "Sophie", last_name: "Anderson", email: "sophie.anderson@enterprise.com", phone: "+14155001007", country: "usa", dept: "ANGULAR", position: "team_lead" },
    { first_name: "Ravi", last_name: "Kumar", email: "ravi.kumar@enterprise.com", phone: "+919876001003", country: "india", dept: "ANGULAR", position: "engineer" },
    { first_name: "Emma", last_name: "Fischer", email: "emma.fischer@enterprise.com", phone: "+491511001003", country: "germany", dept: "ANGULAR", position: "junior_engineer" },

    // Mobile Dev - iOS Team
    { first_name: "Olivia", last_name: "Taylor", email: "olivia.taylor@enterprise.com", phone: "+14155001008", country: "usa", dept: "IOS", position: "team_lead" },
    { first_name: "Ananya", last_name: "Gupta", email: "ananya.gupta@enterprise.com", phone: "+919876001004", country: "india", dept: "IOS", position: "senior_engineer" },
    { first_name: "Noah", last_name: "Schmidt", email: "noah.schmidt@enterprise.com", phone: "+491511001004", country: "germany", dept: "IOS", position: "engineer" },

    // Mobile Dev - Android Team
    { first_name: "Liam", last_name: "Johnson", email: "liam.johnson@enterprise.com", phone: "+14155001009", country: "usa", dept: "ANDROID", position: "team_lead" },
    { first_name: "Meera", last_name: "Nair", email: "meera.nair@enterprise.com", phone: "+919876001005", country: "india", dept: "ANDROID", position: "senior_engineer" },
    { first_name: "Felix", last_name: "Braun", email: "felix.braun@enterprise.com", phone: "+491511001005", country: "germany", dept: "ANDROID", position: "junior_engineer" },

    // Tax Analysts
    { first_name: "Victoria", last_name: "Chang", email: "victoria.chang@enterprise.com", phone: "+14155001010", country: "usa", dept: "TAX", position: "team_lead" },
    { first_name: "Robert", last_name: "Kim", email: "robert.kim@enterprise.com", phone: "+14155001011", country: "usa", dept: "TAX", position: "senior_engineer" },
    { first_name: "Neha", last_name: "Reddy", email: "neha.reddy@enterprise.com", phone: "+919876001006", country: "india", dept: "TAX", position: "engineer" },
  ];

  const allDepts = { ...departments, ...teams };
  let created = 0;
  let skipped = 0;
  const teamLeadMap = {};

  for (const def of employeeDefs) {
    const existing = await User.findOne({ email: def.email.toLowerCase() });
    if (existing) {
      skipped++;
      // Track team leads even if they already exist
      if (def.position === "team_lead") {
        const emp = await Employee.findOne({ user_id: existing._id });
        if (emp) teamLeadMap[def.dept] = emp._id;
      }
      continue;
    }

    const user = await User.create({
      email: def.email.toLowerCase(),
      password_hash: defaultHash,
      user_type: "employee",
      status: "active",
      first_name: def.first_name,
      last_name: def.last_name,
      phone: def.phone,
      country: def.country,
      timezone: "UTC",
    });

    const deptObj = allDepts[def.dept];
    // For teams, use the team's ID; for departments, use the department's ID
    const deptId = deptObj?._id || departments["ADM"]._id;

    // Determine team_lead_id for non-leadership positions
    const needsTeamLead = ["senior_engineer", "engineer", "junior_engineer", "intern"].includes(def.position);
    const teamLeadId = needsTeamLead ? teamLeadMap[def.dept] || null : undefined;

    const empData = {
      user_id: user._id,
      employee_type: "internal_team",
      department: deptId,
      position: def.position,
      hire_date: new Date(),
      is_active: true,
    };
    if (teamLeadId) empData.team_lead_id = teamLeadId;

    const emp = await Employee.create(empData);

    if (def.position === "team_lead") {
      teamLeadMap[def.dept] = emp._id;
    }

    created++;
    console.log(`✓ Created employee: ${def.first_name} ${def.last_name} (${def.position} @ ${def.dept})`);
  }

  // ─── 4. Assign Department Heads (team leads become dept heads) ───
  for (const [deptCode, deptObj] of Object.entries(allDepts)) {
    if (teamLeadMap[deptCode] && !deptObj.head_id) {
      await Department.findByIdAndUpdate(deptObj._id, { head_id: teamLeadMap[deptCode] });
      console.log(`✓ Assigned head for ${deptObj.name}`);
    }
  }

  console.log(`\nDone! Created ${created} employees, skipped ${skipped} (already exist).`);
  console.log("All employees have password: Password123!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
