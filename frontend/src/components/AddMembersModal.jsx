import React, { useState } from "react";
import { Search, X, Loader2, UserPlus } from "lucide-react";

const AddMembersModal = ({
  show,
  onClose,
  searchQuery,
  handleSearchInput,
  searchResults,
  isSearching,
  addMembers,
  existingMembers,
}) => {
  const [selectedUsers, setSelectedUsers] = useState([]);

  if (!show) return null;

  const handleClose = () => {
    setSelectedUsers([]);
    onClose();
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    const memberIds = selectedUsers.map((u) => u._id);
    await addMembers(memberIds);
    setSelectedUsers([]);
  };

  const isExistingMember = (userId) => {
    return existingMembers.some((m) => m.user_id._id === userId);
  };

  const isSelected = (userId) => {
    return selectedUsers.some((u) => u._id === userId);
  };

  const toggleUser = (user) => {
    if (isSelected(user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-teal-900">Add Members</h2>
            <button
              onClick={handleClose}
              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
            <input
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Search users to add..."
              className="w-full pl-10 pr-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedUsers.map((u) => (
                <span
                  key={u._id}
                  className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm flex items-center gap-2"
                >
                  {u.first_name} {u.last_name}
                  <button
                    onClick={() => toggleUser(u)}
                    className="text-cyan-700 hover:text-cyan-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                <Search className="w-8 h-8 text-teal-500" />
              </div>
              <p className="text-teal-700 font-medium mb-1">
                {searchQuery ? "No users found" : "Search for users"}
              </p>
              <p className="text-sm text-teal-600">
                {searchQuery
                  ? "Try a different search term"
                  : "Type in the search box to find users"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => {
                const alreadyMember = isExistingMember(user._id);
                const selected = isSelected(user._id);

                return (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      alreadyMember
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : selected
                        ? "bg-cyan-50 border-cyan-300"
                        : "bg-white border-teal-200 hover:border-cyan-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.first_name?.[0]}
                        {user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-teal-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-teal-600">{user.email}</p>
                      </div>
                    </div>

                    {alreadyMember ? (
                      <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm font-medium">
                        Already Member
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleUser(user)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selected
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg"
                        }`}
                      >
                        {selected ? "Remove" : "Add"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-teal-200">
          <button
            disabled={selectedUsers.length === 0}
            onClick={handleAddMembers}
            className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add {selectedUsers.length > 0 ? `${selectedUsers.length} ` : ""}
            Member{selectedUsers.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
