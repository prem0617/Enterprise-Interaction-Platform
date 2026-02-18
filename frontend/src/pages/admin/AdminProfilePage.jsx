import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  Globe,
  Shield,
  Calendar,
  Edit2,
  Save,
  Key,
  Clock,
  Loader2,
  Building,
  X,
  Camera,
  Trash2,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ImageCropModal from "@/components/ImageCropModal";

const AdminProfilePage = ({ onNavigate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    timezone: "",
  });
  const fileInputRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const { user, employee } = response.data;
      setProfileData(user);
      setEmployeeData(employee);
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        timezone: user.timezone || "UTC",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BACKEND_URL}/auth/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setProfileData((prev) => ({ ...prev, ...response.data.user }));
        const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
        adminData.first_name = response.data.user.first_name;
        adminData.last_name = response.data.user.last_name;
        localStorage.setItem("adminData", JSON.stringify(adminData));

        setEditing(false);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profileData?.first_name || "",
      last_name: profileData?.last_name || "",
      phone: profileData?.phone || "",
      timezone: profileData?.timezone || "UTC",
    });
    setEditing(false);
  };

  const getInitials = () => {
    if (!profileData) return "AD";
    return `${profileData.first_name?.[0] || ""}${
      profileData.last_name?.[0] || ""
    }`.toUpperCase();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCroppedUpload = async (blob) => {
    setCropModalOpen(false);
    setSelectedImageSrc(null);
    setUploadingPicture(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("profile_picture", blob, "profile.jpg");

      const response = await axios.put(
        `${BACKEND_URL}/auth/profile/picture`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setProfileData((prev) => ({
          ...prev,
          profile_picture: response.data.profile_picture,
        }));
        const adminData = JSON.parse(
          localStorage.getItem("adminData") || "{}"
        );
        adminData.profile_picture = response.data.profile_picture;
        localStorage.setItem("adminData", JSON.stringify(adminData));
        toast.success("Profile picture updated");
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error(
        error.response?.data?.error || "Failed to upload profile picture"
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemovePicture = async () => {
    setUploadingPicture(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${BACKEND_URL}/auth/profile/picture`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setProfileData((prev) => ({ ...prev, profile_picture: null }));
        const adminData = JSON.parse(
          localStorage.getItem("adminData") || "{}"
        );
        delete adminData.profile_picture;
        localStorage.setItem("adminData", JSON.stringify(adminData));
        toast.success("Profile picture removed");
      }
    } catch (error) {
      console.error("Error removing profile picture:", error);
      toast.error("Failed to remove profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8 max-w-3xl mx-auto bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and security settings
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="overview" className="gap-2">
            <User className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Key className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-zinc-900/90 border border-zinc-800 shadow-xl rounded-2xl">
            <CardHeader className="pb-4 border-b border-zinc-800 bg-zinc-900/80 rounded-t-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="size-16">
                      <AvatarImage
                        src={profileData?.profile_picture}
                        alt="Profile"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingPicture ? (
                        <Loader2 className="size-5 text-white animate-spin" />
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 cursor-pointer"
                          title="Change profile picture"
                        >
                          <Camera className="size-5 text-white" />
                        </button>
                      )}
                    </div>
                    {profileData?.profile_picture && !uploadingPicture && (
                      <button
                        onClick={handleRemovePicture}
                        className="absolute -bottom-1 -right-1 p-1 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                        title="Remove profile picture"
                      >
                        <Trash2 className="size-3 text-white" />
                      </button>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {profileData?.first_name} {profileData?.last_name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="secondary">Admin</Badge>
                      <Badge
                        variant={
                          profileData?.status === "active"
                            ? "default"
                            : "outline"
                        }
                      >
                        {profileData?.status?.charAt(0).toUpperCase() +
                          profileData?.status?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="size-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        ) : (
                          <Save className="size-3.5 mr-1" />
                        )}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Edit2 className="size-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  icon={User}
                  label="First name"
                  value={formData.first_name}
                  name="first_name"
                  editing={editing}
                  onChange={handleChange}
                />
                <ProfileField
                  icon={User}
                  label="Last name"
                  value={formData.last_name}
                  name="last_name"
                  editing={editing}
                  onChange={handleChange}
                />
                <ProfileField
                  icon={Mail}
                  label="Email"
                  value={profileData?.email}
                  readOnly
                />
                <ProfileField
                  icon={Phone}
                  label="Phone"
                  value={formData.phone}
                  name="phone"
                  editing={editing}
                  onChange={handleChange}
                  placeholder="Not set"
                />
                <ProfileField
                  icon={Globe}
                  label="Country"
                  value={
                    profileData?.country?.charAt(0).toUpperCase() +
                    profileData?.country?.slice(1)
                  }
                  readOnly
                />
                <ProfileField
                  icon={Clock}
                  label="Timezone"
                  value={formData.timezone}
                  name="timezone"
                  editing={editing}
                  onChange={handleChange}
                />
                {employeeData && (
                  <>
                    <ProfileField
                      icon={Building}
                      label="Department"
                      value={
                        employeeData.department?.charAt(0).toUpperCase() +
                        employeeData.department?.slice(1)
                      }
                      readOnly
                    />
                    <ProfileField
                      icon={Shield}
                      label="Position"
                      value={employeeData.position?.toUpperCase()}
                      readOnly
                    />
                  </>
                )}
              </div>
              <div className="pt-4 border-t">
                <ProfileField
                  icon={Calendar}
                  label="Member since"
                  value={new Date(
                    profileData?.created_at || Date.now()
                  ).toLocaleDateString()}
                  readOnly
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-zinc-900/90 border border-zinc-800 shadow-xl rounded-2xl">
            <CardHeader className="border-b border-zinc-800 bg-zinc-900/80 rounded-t-2xl">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="size-4" />
                Password
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Change your password to keep your account secure.
              </p>
            </CardHeader>
            <CardContent className="px-6 py-8">
              <Button
                variant="outline"
                onClick={() => onNavigate("change-password")}
                className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-700"
              >
                <Key className="size-4" />
                Change password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImageCropModal
        open={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedImageSrc(null);
        }}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCroppedUpload}
      />
    </div>
  );
};

const ProfileField = ({
  icon: Icon,
  label,
  value,
  name,
  editing,
  onChange,
  readOnly,
  placeholder,
}) => (
  <div className="space-y-2">
    <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <Icon className="size-3.5" />
      {label}
    </Label>
    {editing && name && !readOnly ? (
      <Input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ""}
        className="h-9"
      />
    ) : (
      <p className="text-sm font-medium">{value || placeholder || "—"}</p>
    )}
  </div>
);

export default AdminProfilePage;
