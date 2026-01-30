import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Building, Globe, Calendar, Shield, Key, Clock, Phone, User, Loader2, Save, X } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
];

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    timezone: "",
  });
  const navigate = useNavigate();
  
  // Detect if user is admin
  const adminData = localStorage.getItem("adminData");
  const isAdmin = !!adminData;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/employees/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.user;
      setUserData(data);
      setFormData({
        first_name: data.user_id?.first_name || "",
        last_name: data.user_id?.last_name || "",
        phone: data.user_id?.phone || "",
        timezone: data.user_id?.timezone || "UTC",
      });
    } catch (error) {
      console.error(error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${BACKEND_URL}/employees/profile/me`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData(response.data.user);
      setEditing(false);
      setSuccess("Profile updated successfully");
      
      // Update localStorage user data
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.first_name = formData.first_name;
      storedUser.last_name = formData.last_name;
      localStorage.setItem("user", JSON.stringify(storedUser));
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: userData?.user_id?.first_name || "",
      last_name: userData?.user_id?.last_name || "",
      phone: userData?.user_id?.phone || "",
      timezone: userData?.user_id?.timezone || "UTC",
    });
    setEditing(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = `${userData?.user_id?.first_name || ""} ${userData?.user_id?.last_name || ""}`.trim();
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate(isAdmin ? "/adminDashboard" : "/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{name || "Unknown User"}</CardTitle>
                  <p className="text-muted-foreground">{userData?.user_id?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{userData?.position}</Badge>
                    <Badge variant="outline">{userData?.department}</Badge>
                  </div>
                </div>
              </div>
              {!editing ? (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {editing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(v) => handleChange("timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Read-only fields */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    The following fields can only be changed by an administrator.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem icon={Mail} label="Email" value={userData?.user_id?.email} />
                    <InfoItem icon={Building} label="Department" value={userData?.department} />
                    <InfoItem icon={Globe} label="Country" value={userData?.user_id?.country} />
                    <InfoItem icon={User} label="Position" value={userData?.position} />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem icon={User} label="First Name" value={userData?.user_id?.first_name} />
                <InfoItem icon={User} label="Last Name" value={userData?.user_id?.last_name} />
                <InfoItem icon={Mail} label="Email" value={userData?.user_id?.email} />
                <InfoItem icon={Phone} label="Phone" value={userData?.user_id?.phone} />
                <InfoItem icon={Building} label="Department" value={userData?.department} />
                <InfoItem icon={User} label="Position" value={userData?.position} />
                <InfoItem icon={Globe} label="Country" value={userData?.user_id?.country} />
                <InfoItem icon={Clock} label="Timezone" value={userData?.user_id?.timezone} />
                <InfoItem
                  icon={Calendar}
                  label="Hire Date"
                  value={userData?.hire_date ? new Date(userData.hire_date).toLocaleDateString() : "—"}
                />
                <InfoItem
                  icon={Shield}
                  label="Status"
                  value={userData?.is_active ? "Active" : "Inactive"}
                />
              </div>
            )}

            <Separator />

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Security
              </h3>
              <Button variant="outline" onClick={() => navigate("/change-password")}>
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
