import { useState } from "react";
import { Bell, Moon, Sun, Globe, Shield, Mail, Save, Loader2, Monitor, Palette, CheckCircle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState({
    companyName: "Enterprise Platform",
    supportEmail: "support@company.com",
    timezone: "UTC",
    language: "en",
    emailNotifications: true,
    pushNotifications: true,
    sessionTimeout: "30",
  });

  const handleChange = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
    setSuccess("");
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSuccess("Settings saved successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your application preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    theme === "light" 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center">
                    <Sun className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    theme === "dark" 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    theme === "system" 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-white to-gray-900 border flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-gray-500" />
                  </div>
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === "system" 
                  ? "Theme will automatically match your system preference" 
                  : `Currently using ${theme} theme`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">General</CardTitle>
                <CardDescription>Basic application settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(v) => handleChange("timezone", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(v) => handleChange("language", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              label="Email Notifications"
              description="Receive notifications via email"
              icon={Mail}
              checked={settings.emailNotifications}
              onChange={(v) => handleChange("emailNotifications", v)}
            />
            <Separator />
            <ToggleSetting
              label="Push Notifications"
              description="Receive browser push notifications"
              icon={Bell}
              checked={settings.pushNotifications}
              onChange={(v) => handleChange("pushNotifications", v)}
            />
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Security and session settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <Select
                value={settings.sessionTimeout}
                onValueChange={(v) => handleChange("sessionTimeout", v)}
              >
                <SelectTrigger className="w-full sm:w-48 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically log out after period of inactivity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleSetting({ label, description, icon: Icon, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
