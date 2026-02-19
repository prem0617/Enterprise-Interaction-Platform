# Plan: Department + Team hierarchy

## Concept
- **Department** = parent-level org unit (e.g. "Mobile Development")
- **Team** = child-level unit under a department (e.g. "iOS Team", "Android Team")
- Both stored in the same `Department` collection, distinguished by a new `type` field

## Changes

### 1. Schema — `backend/models/Department.js`
- Add `type` field: `{ type: String, enum: ["department", "team"], default: "department" }`

### 2. Backend controller — `department.controller.js`
- **createDepartment**: accept `type` from body. If `type === "team"`, require `parent_department_id` and validate the parent is a department (not a team — no nesting teams under teams). If `type === "department"`, disallow having a parent that is a team.
- **getAllDepartments**: fix the employee count lookup — currently matches by `code.toLowerCase()` string, but `emp.department` is an ObjectId now. Switch to match by `_id`.
- **getDepartmentById**: fix employee query — currently uses `$regex` on code string, should use `{ department: department._id }`.
- **updateDepartment**: accept `type` changes with same validation.
- **getOrgTree**: already fixed; no additional changes needed.

### 3. Frontend — `DepartmentManagement.jsx`
- Add a **"New Team"** button next to "New Department"
- In the create/edit dialog:
  - Add a **type toggle** (Department vs Team) at the top
  - When type is "team": label parent field as **"Parent Department (required)"**, filter parent picker to only show items with `type === "department"`, and require selection
  - When type is "department": parent field remains optional (for sub-departments if desired, but typically root)
- **List view cards**: show a small "Team" badge for teams; show "Department" label for departments
- **Org tree**: teams render with a different icon (Users icon instead of Building2)
- **Stats row**: split count into "X Departments · Y Teams"

### 4. No migration needed
Existing departments get `type: "department"` by default from the schema default. No data migration script required.
