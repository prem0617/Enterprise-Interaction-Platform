import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, Clock, CheckCircle2, RefreshCcw, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  pending: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
  self_review: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  manager_review: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/20",
};

function RatingStars({ rating, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`size-3.5 ${i < (rating || 0) ? "text-amber-400 fill-amber-400" : "text-zinc-700"}`} />
      ))}
      {rating && <span className="text-xs text-zinc-400 ml-1">{rating}/{max}</span>}
    </div>
  );
}

export default function PerformanceReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await axios.get(`${BACKEND_URL}/performance${params}`, { headers });
      setReviews(res.data.reviews || []);
      setStats(res.data.stats || {});
    } catch { toast.error("Failed to load reviews"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const kpis = [
    { label: "Total", value: stats.total || 0, icon: Users, color: "indigo" },
    { label: "Pending", value: stats.pending || 0, icon: Clock, color: "zinc" },
    { label: "Self Review", value: stats.self_review || 0, icon: MessageSquare, color: "amber" },
    { label: "Completed", value: stats.completed || 0, icon: CheckCircle2, color: "emerald" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Star className="size-6 text-amber-400" />Performance Reviews</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage review cycles, goals, and ratings</p>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={fetchReviews}><RefreshCcw className="size-3.5" />Refresh</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="bg-zinc-900/80 border-zinc-800/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${color}-500/10`}><Icon className={`size-5 text-${color}-400`} /></div>
                <div><p className="text-xl font-bold text-white">{value}</p><p className="text-[10px] text-zinc-500">{label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "self_review", "manager_review", "completed"].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
              className={filter === s ? "bg-indigo-600 text-white" : "border-zinc-700 text-zinc-400"}
              onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>

        {/* Review Cards */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}</div>
          ) : reviews.length === 0 ? (
            <Card className="bg-zinc-900/80 border-zinc-800/80"><CardContent className="py-12 text-center text-zinc-500">No reviews found</CardContent></Card>
          ) : reviews.map((r) => (
            <Card key={r._id} className="bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(expanded === r._id ? null : r._id)}>
                  <div className="size-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-sm font-bold text-amber-300 flex-shrink-0">
                    {r.user_id?.first_name?.[0]}{r.user_id?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-200">{r.user_id?.first_name} {r.user_id?.last_name}</span>
                      <Badge className={`text-[10px] border ${STATUS_STYLES[r.status]}`}>{r.status?.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{r.employee_id?.department?.name || "—"} · {r.cycle_name} · {r.review_type}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {r.overall_self_rating && <div><span className="text-[10px] text-zinc-500">Self:</span> <RatingStars rating={r.overall_self_rating} /></div>}
                      {r.overall_manager_rating && <div><span className="text-[10px] text-zinc-500">Manager:</span> <RatingStars rating={r.overall_manager_rating} /></div>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">{expanded === r._id ? <ChevronUp className="size-4 text-zinc-500" /> : <ChevronDown className="size-4 text-zinc-500" />}</div>
                </div>

                {/* Expanded details */}
                {expanded === r._id && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-3">
                    <p className="text-xs text-zinc-500">Period: {new Date(r.period_start).toLocaleDateString()} — {new Date(r.period_end).toLocaleDateString()}</p>

                    {/* Goals */}
                    {r.goals?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-2">Goals ({r.goals.length})</p>
                        <div className="space-y-2">
                          {r.goals.map((g, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-zinc-800/40">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-300">{g.title}</span>
                                <div className="flex items-center gap-3">
                                  {g.self_rating && <span className="text-[10px] text-amber-400">Self: {g.self_rating}/5</span>}
                                  {g.manager_rating && <span className="text-[10px] text-blue-400">Mgr: {g.manager_rating}/5</span>}
                                </div>
                              </div>
                              {g.description && <p className="text-[10px] text-zinc-500 mt-1">{g.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summaries */}
                    {r.self_summary && <div><p className="text-[10px] text-zinc-500 mb-1">Self Summary</p><p className="text-xs text-zinc-300 bg-zinc-800/40 rounded-lg p-2.5">{r.self_summary}</p></div>}
                    {r.manager_summary && <div><p className="text-[10px] text-zinc-500 mb-1">Manager Summary</p><p className="text-xs text-zinc-300 bg-zinc-800/40 rounded-lg p-2.5">{r.manager_summary}</p></div>}

                    {/* Strengths / Improvements */}
                    {r.strengths?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-zinc-500 mr-1">Strengths:</span>
                        {r.strengths.map((s, i) => <Badge key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</Badge>)}
                      </div>
                    )}
                    {r.improvements?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-zinc-500 mr-1">Improvements:</span>
                        {r.improvements.map((s, i) => <Badge key={i} className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
