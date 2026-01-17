import Employee from "../../models/Employee.js";

export async function getTeamLead(req, res) {
  try {
    const teamLeads = await Employee.find({
      position: "team_lead",
    })
      .populate("user_id", "email first_name last_name") // 👈 User details
      .populate("team_lead_id"); // (optional, usually null for team leads)

    return res.status(200).json({
      success: true,
      data: teamLeads,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team leads",
      error: error.message,
    });
  }
}
