import PerformanceReview from "../../models/PerformanceReview.js";
import Employee from "../../models/Employee.js";
import { createNotification } from "../../utils/notificationHelper.js";

// Admin: Create a review cycle for an employee
export const createReview = async (req, res) => {
  try {
    const { employee_id, user_id, cycle_name, review_type, period_start, period_end, goals, reviewer_id } = req.body;
    if (!employee_id || !user_id || !cycle_name || !period_start || !period_end) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const review = await PerformanceReview.create({
      employee_id, user_id, reviewer_id: reviewer_id || req.userId,
      cycle_name, review_type: review_type || "quarterly",
      period_start: new Date(period_start), period_end: new Date(period_end),
      goals: goals || [], status: "pending",
    });

    createNotification({ recipientId: user_id, type: "system", priority: "high", title: "Performance Review Assigned", body: `"${cycle_name}" review has been created for you. Please complete your self-assessment.`, actorId: req.userId, reference: { kind: null, id: review._id } }).catch(() => {});

    const populated = await PerformanceReview.findById(review._id)
      .populate("user_id", "first_name last_name email profile_picture")
      .populate({ path: "employee_id", populate: { path: "department", select: "name" } })
      .populate("reviewer_id", "first_name last_name email");

    res.status(201).json({ success: true, review: populated });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Create bulk reviews for all employees
export const createBulkReviews = async (req, res) => {
  try {
    const { cycle_name, review_type, period_start, period_end, goals } = req.body;
    const employees = await Employee.find({ is_active: true });
    const created = [];
    for (const emp of employees) {
      const existing = await PerformanceReview.findOne({ employee_id: emp._id, cycle_name });
      if (existing) continue;
      const review = await PerformanceReview.create({
        employee_id: emp._id, user_id: emp.user_id, reviewer_id: req.userId,
        cycle_name, review_type: review_type || "quarterly",
        period_start: new Date(period_start), period_end: new Date(period_end),
        goals: goals || [], status: "pending",
      });
      created.push(review);
    }
    res.status(201).json({ success: true, count: created.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all reviews (with filters)
export const getAllReviews = async (req, res) => {
  try {
    const { status, cycle_name, review_type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (cycle_name) filter.cycle_name = cycle_name;
    if (review_type) filter.review_type = review_type;

    const reviews = await PerformanceReview.find(filter)
      .populate("user_id", "first_name last_name email profile_picture")
      .populate({ path: "employee_id", populate: { path: "department", select: "name" } })
      .populate("reviewer_id", "first_name last_name email")
      .sort({ created_at: -1 });

    const stats = {
      total: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      self_review: reviews.filter((r) => r.status === "self_review").length,
      manager_review: reviews.filter((r) => r.status === "manager_review").length,
      completed: reviews.filter((r) => r.status === "completed").length,
    };

    res.json({ reviews, stats });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Employee: Get my reviews
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({ user_id: req.userId })
      .populate("reviewer_id", "first_name last_name email")
      .sort({ period_start: -1 });
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Employee: Submit self-review
export const submitSelfReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals, overall_self_rating, self_summary, strengths, improvements } = req.body;

    const review = await PerformanceReview.findOne({ _id: id, user_id: req.userId });
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (!["pending", "self_review"].includes(review.status)) {
      return res.status(400).json({ error: "Cannot submit self-review at this stage" });
    }

    if (goals) review.goals = goals;
    review.overall_self_rating = overall_self_rating;
    review.self_summary = self_summary || "";
    review.strengths = strengths || [];
    review.improvements = improvements || [];
    review.status = "manager_review";
    review.submitted_at = new Date();
    await review.save();

    if (review.reviewer_id) {
      createNotification({ recipientId: review.reviewer_id.toString(), type: "system", priority: "medium", title: "Self-Review Submitted", body: `An employee has submitted their self-assessment for "${review.cycle_name}".`, actorId: req.userId }).catch(() => {});
    }

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin/Manager: Submit manager review
export const submitManagerReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals, overall_manager_rating, manager_summary, strengths, improvements } = req.body;

    const review = await PerformanceReview.findById(id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    if (goals) review.goals = goals;
    review.overall_manager_rating = overall_manager_rating;
    review.manager_summary = manager_summary || "";
    if (strengths) review.strengths = strengths;
    if (improvements) review.improvements = improvements;
    review.status = "completed";
    review.reviewed_at = new Date();
    await review.save();

    createNotification({ recipientId: review.user_id.toString(), type: "system", priority: "high", title: "Performance Review Completed", body: `Your "${review.cycle_name}" review has been completed by your manager. Rating: ${overall_manager_rating}/5`, actorId: req.userId }).catch(() => {});

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single review
export const getReviewById = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id)
      .populate("user_id", "first_name last_name email profile_picture")
      .populate({ path: "employee_id", populate: { path: "department", select: "name" } })
      .populate("reviewer_id", "first_name last_name email");
    if (!review) return res.status(404).json({ error: "Not found" });
    res.json({ review });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch review" });
  }
};
