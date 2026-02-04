import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  UserPlus,
  Loader2,
  Shield,
  User,
  Crown,
  Trash2,
  ChevronDown,
  Edit2,
  Check,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContextProvider";
import toast from "react-hot-toast";
import axios from "axios";
import { BACKEND_URL } from "../../config";

const ChannelSettingsModal = ({
  show,
  onClose,
  channel,
  onAddMembers,
  onUpdateRole,
  onRemoveMember,
  handleSearch,
  searchResults,
  isSearching,
  roleUpdateTrigger,
}) => {
  const [activeTab, setActiveTab] = useState("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedChannelName, setEditedChannelName] = useState("");
  const [savingChannelName, setSavingChannelName] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const { socket, user } = useAuthContext();

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (show && channel?._id) {
      fetchChannelMembers();
      setEditedChannelName(channel?.name || "");
    }
  }, [show, channel]);

  // Re-fetch members when roleUpdateTrigger changes (from socket event)
  useEffect(() => {
    if (show && channel?._id && roleUpdateTrigger > 0) {
      fetchChannelMembers();
    }
  }, [roleUpdateTrigger]);

  // Socket listener for real-time role changes and channel name updates
  console.log(socket);
  useEffect(() => {
    if (!socket || !show) return;

    console.log("🔌 Setting up socket listeners for channel:", channel?._id);

    // Listen to ALL socket events for debugging
    const onAny = (eventName, ...args) => {
      console.log("📡 Socket event received:", eventName, args);
    };
    socket.onAny(onAny);

    // Handler for role changes
    const handleRoleChange = (data) => {
      console.log("👑 Role change event received:", data);
      console.log("Current channel ID:", channel?._id);
      console.log("Event channel ID:", data.channel_id);

      // Check if this event is for the current channel
      if (data.channel_id === channel?._id) {
        console.log("✅ Role change is for current channel, updating...");

        setChannelMembers((prevMembers) => {
          console.log("Previous members:", prevMembers);

          const updatedMembers = prevMembers.map((member) => {
            // Try multiple matching strategies
            const memberUserId = member.user_id?._id || member.user_id;
            const eventUserId =
              data.user_id || data.member?.user_id?._id || data.member?.user_id;

            console.log("Comparing:", memberUserId, "with", eventUserId);

            if (memberUserId === eventUserId) {
              console.log(
                "🎯 Found matching member, updating role to:",
                data.role || data.member?.role
              );

              const userName = member.user_id?.first_name
                ? `${member.user_id.first_name} ${member.user_id.last_name}`
                : "User";

              const newRole = data.role || data.member?.role;

              // Show toast notification
              toast.success(`${userName}'s role updated to ${newRole}`, {
                duration: 4000,
                icon:
                  newRole === "admin"
                    ? "👑"
                    : newRole === "moderator"
                    ? "🛡️"
                    : "👤",
              });

              // Update userRole if it's the current user
              if (memberUserId === user?.id?.toString()) {
                setUserRole(newRole);
              }

              return {
                ...member,
                role: newRole,
                updatedAt: new Date().toISOString(),
              };
            }
            return member;
          });

          console.log("Updated members:", updatedMembers);
          return updatedMembers;
        });

        // Close the expanded dropdown after role change
        setExpandedMember(null);
      } else {
        console.log("❌ Role change is for different channel, ignoring");
      }
    };

    const handleMemberAdded = (data) => {
      console.log("➕ Member added event:", data);

      if (data.channel_id === channel?._id) {
        fetchChannelMembers();
        toast.success("New member added to channel", {
          duration: 3000,
          icon: "✅",
        });
      }
    };

    const handleMemberRemoved = (data) => {
      console.log("➖ Member removed event:", data);

      if (data.channel_id === channel?._id) {
        const eventUserId =
          data.user_id || data.member?.user_id?._id || data.member?.user_id;

        setChannelMembers((prevMembers) =>
          prevMembers.filter((member) => {
            const memberUserId = member.user_id?._id || member.user_id;
            return memberUserId !== eventUserId;
          })
        );

        toast.success("Member removed from channel", {
          duration: 3000,
          icon: "🗑️",
        });
      }
    };

    // Handler for channel name updates
    const handleChannelNameUpdate = (data) => {
      // console.log("📝 Channel name update event:", data);

      if (data.channel_id === channel?._id) {
        setEditedChannelName(data.new_name);
        setIsEditingName(false);

        console.log();

        toast.success(`Channel name updated`);
      }
    };

    // Listen to multiple possible event names (in case backend uses different naming)
    socket.on("changesRole", handleRoleChange);
    socket.on("roleChanged", handleRoleChange);
    socket.on("role-changed", handleRoleChange);
    socket.on("updateRole", handleRoleChange);
    socket.on("memberRoleUpdated", handleRoleChange);

    socket.on("memberAdded", handleMemberAdded);
    socket.on("member-added", handleMemberAdded);
    socket.on("addMember", handleMemberAdded);

    socket.on("memberRemoved", handleMemberRemoved);
    socket.on("member-removed", handleMemberRemoved);
    socket.on("removeMember", handleMemberRemoved);

    socket.on("channel_name_changed", handleChannelNameUpdate);

    return () => {
      console.log("🔌 Cleaning up socket listeners");
      socket.offAny(onAny);
      socket.off("changesRole", handleRoleChange);
      socket.off("roleChanged", handleRoleChange);
      socket.off("role-changed", handleRoleChange);
      socket.off("updateRole", handleRoleChange);
      socket.off("memberRoleUpdated", handleRoleChange);
      socket.off("memberAdded", handleMemberAdded);
      socket.off("member-added", handleMemberAdded);
      socket.off("addMember", handleMemberAdded);
      socket.off("memberRemoved", handleMemberRemoved);
      socket.off("member-removed", handleMemberRemoved);
      socket.off("removeMember", handleMemberRemoved);
      socket.off("channel-name-updated", handleChannelNameUpdate);
      socket.off("channelNameUpdated", handleChannelNameUpdate);
    };
  }, [socket, show, channel?._id, user?.id]);

  const fetchChannelMembers = async () => {
    if (!channel?._id) return;

    setLoadingMembers(true);
    try {
      console.log("📥 Fetching channel members for:", channel._id);

      // Get current user's role
      const currentUserMember = channel.members?.find(
        (m) => (m.user_id?._id || m.user_id) === user?.id?.toString()
      );

      if (currentUserMember) {
        setUserRole(currentUserMember.role);
      }

      setChannelMembers(channel.members || []);
    } catch (error) {
      console.error("Error fetching channel members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setAddingMembers(true);
    try {
      const memberIds = selectedUsers.map((u) => u._id);
      await onAddMembers(channel._id, memberIds);

      // Reset state
      setSelectedUsers([]);
      setSearchQuery("");
      setActiveTab("members");

      // Refresh members list
      await fetchChannelMembers();
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    console.log("🔄 Changing role for member:", memberId, "to:", newRole);
    try {
      await onUpdateRole(channel._id, memberId, newRole);
      console.log("✅ Role change request sent successfully");
      // Don't need to fetch members here as socket will update it in real-time
      // But keep as fallback in case socket fails
      setTimeout(() => {
        console.log("⏰ Fallback: Fetching members after 2 seconds");
        fetchChannelMembers();
      }, 2000);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role", {
        duration: 3000,
      });
      // Fetch on error to ensure consistency
      fetchChannelMembers();
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      await onRemoveMember(channel._id, memberId);
      // Socket will handle the UI update, but add fallback
      setTimeout(() => {
        fetchChannelMembers();
      }, 2000);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member", {
        duration: 3000,
      });
      fetchChannelMembers();
    }
  };

  const handleSaveChannelName = async () => {
    if (!editedChannelName.trim()) {
      toast.error("Channel name cannot be empty");
      return;
    }

    if (editedChannelName.trim() === channel?.name) {
      setIsEditingName(false);
      return;
    }

    setSavingChannelName(true);
    try {
      console.log(`${BACKEND_URL}/chat/channels/${channel._id}/name`);
      const response = await axios.post(
        `${BACKEND_URL}/chat/channels/${channel._id}/name`,
        { name: editedChannelName.trim() },
        axiosConfig
      );

      if (response.data.success) {
        setIsEditingName(false);
        // Update parent component if needed
        if (channel) {
          channel.name = editedChannelName.trim();
        }
      }
      onClose();
    } catch (error) {
      console.error("Error updating channel name:", error);
      toast.error(
        error.response?.data?.error || "Failed to update channel name"
      );
      // Reset to original name on error
      setEditedChannelName(channel?.name || "");
    } finally {
      setSavingChannelName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditedChannelName(channel?.name || "");
    setIsEditingName(false);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-600" />;
      // case "moderator":
      //   return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-800";
      // case "moderator":
      //   return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAdmin = userRole === "admin";

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-teal-900 mb-2">
                Channel Settings
              </h2>

              {/* Channel Name with Edit Option */}
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editedChannelName}
                      onChange={(e) => setEditedChannelName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-teal-50 border-2 border-teal-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm font-medium"
                      placeholder="Enter channel name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveChannelName();
                        if (e.key === "Escape") handleCancelEditName();
                      }}
                    />
                    <button
                      onClick={handleSaveChannelName}
                      disabled={savingChannelName}
                      className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {savingChannelName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      disabled={savingChannelName}
                      className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-teal-600 font-medium">
                      {editedChannelName || channel?.name}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                        title="Edit channel name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Admin badge */}
              {isAdmin && !isEditingName && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                  <Crown className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === "members"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-teal-50 text-teal-700 hover:bg-teal-100"
              }`}
            >
              Members ({channelMembers.length})
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "add"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-teal-50 text-teal-700 hover:bg-teal-100"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "members" ? (
            // Members List Tab
            <div className="space-y-2">
              {loadingMembers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              ) : channelMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-teal-500" />
                  </div>
                  <p className="text-teal-700 font-medium">No members yet</p>
                  <p className="text-sm text-teal-600">
                    Add members to get started
                  </p>
                </div>
              ) : (
                channelMembers.map((member) => (
                  <div
                    key={member._id || member.user_id?._id}
                    className="border-2 border-teal-100 rounded-lg overflow-hidden hover:border-teal-300 transition-all"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.user_id?.first_name?.[0]}
                          {member.user_id?.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-teal-900">
                            {member.user_id?.first_name}{" "}
                            {member.user_id?.last_name}
                          </h3>
                          <p className="text-sm text-teal-600">
                            {member.user_id?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() =>
                              setExpandedMember(
                                expandedMember === member._id
                                  ? null
                                  : member._id
                              )
                            }
                            className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                          >
                            <ChevronDown
                              className={`w-5 h-5 transition-transform ${
                                expandedMember === member._id
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Actions - Only visible to admins */}
                    {isAdmin && expandedMember === member._id && (
                      <div className="border-t-2 border-teal-100 p-4 bg-teal-50/50">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-teal-900 mb-3">
                            Change Role:
                          </p>
                          <div className="flex gap-2">
                            {["member", "admin"].map((role) => (
                              <button
                                key={role}
                                onClick={() =>
                                  handleRoleChange(member.user_id?._id, role)
                                }
                                disabled={member.role === role}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  member.role === role
                                    ? "bg-teal-200 text-teal-900 cursor-not-allowed"
                                    : "bg-white border-2 border-teal-200 text-teal-700 hover:bg-teal-100"
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              handleRemoveMember(member.user_id?._id)
                            }
                            className="w-full mt-4 px-4 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove Member
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            // Add Members Tab
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
                <input
                  value={searchQuery}
                  onChange={handleSearchInput}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="p-4 bg-cyan-50 border-2 border-cyan-200 rounded-lg">
                  <p className="text-sm font-medium text-cyan-900 mb-2">
                    Selected ({selectedUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user._id}
                        className="px-3 py-1 bg-white border border-cyan-300 rounded-full text-sm font-medium text-cyan-900 flex items-center gap-2"
                      >
                        {user.first_name} {user.last_name}
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="text-cyan-600 hover:text-cyan-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div className="space-y-2">
                {isSearching ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-teal-500" />
                    </div>
                    <p className="text-teal-700 font-medium">No users found</p>
                    <p className="text-sm text-teal-600">
                      Try a different search term
                    </p>
                  </div>
                ) : !searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-teal-500" />
                    </div>
                    <p className="text-teal-700 font-medium">
                      Search for users
                    </p>
                    <p className="text-sm text-teal-600">
                      Enter a name or email to find people
                    </p>
                  </div>
                ) : (
                  searchResults.map((user) => {
                    const isSelected = selectedUsers.some(
                      (u) => u._id === user._id
                    );
                    const isAlreadyMember = channelMembers.some(
                      (m) => m.user_id?._id === user._id
                    );

                    return (
                      <div
                        key={user._id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                          isAlreadyMember
                            ? "border-gray-200 bg-gray-50 opacity-60"
                            : isSelected
                            ? "border-cyan-300 bg-cyan-50"
                            : "border-teal-100 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-teal-900">
                              {user.first_name} {user.last_name}
                            </h3>
                            <p className="text-sm text-teal-600">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {isAlreadyMember ? (
                          <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">
                            Already Member
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleUserSelection(user)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-red-100 text-red-600 hover:bg-red-200"
                                : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg"
                            }`}
                          >
                            {isSelected ? "Deselect" : "Select"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show when adding members */}
        {activeTab === "add" && selectedUsers.length > 0 && (
          <div className="p-6 border-t-2 border-teal-200">
            <button
              onClick={handleAddMembers}
              disabled={addingMembers}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {addingMembers ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding Members...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add {selectedUsers.length} Member
                  {selectedUsers.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelSettingsModal;
