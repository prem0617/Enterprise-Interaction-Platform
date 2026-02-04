import { Search, X, Loader2 } from "lucide-react";

const CreateGroupModal = ({
  show,
  onClose,
  groupName,
  setGroupName,
  department,
  setDepartment,
  searchQuery,
  handleSearchInput,
  searchResults,
  selectedUsers,
  setSelectedUsers,
  isSearching,
  createGroup,
  createGroupLoading,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-teal-900">Create Group</h2>

            <button
              onClick={onClose}
              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Group Name */}
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full mb-3 px-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg"
          />

          {/* Department */}
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department (Optional)"
            className="w-full mb-3 px-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg"
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
            <input
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedUsers.map((u) => (
                <span
                  key={u._id}
                  className="px-3 py-1 bg-cyan-100 rounded-full text-sm"
                >
                  {u.first_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => {
                const isSelected = selectedUsers.some(
                  (u) => u._id === user._id
                );

                return (
                  <div
                    key={user._id}
                    className="flex justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (isSelected) {
                          setSelectedUsers((prev) =>
                            prev.filter((u) => u._id !== user._id)
                          );
                        } else {
                          setSelectedUsers((prev) => [...prev, user]);
                        }
                      }}
                      className={`px-4 py-1 rounded ${
                        isSelected
                          ? "bg-red-100 text-red-600"
                          : "bg-cyan-500 text-white"
                      }`}
                    >
                      {isSelected ? "Remove" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={createGroup}
            disabled={
              createGroupLoading || !groupName || selectedUsers.length < 2
            }
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            {createGroupLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading</span>
              </div>
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
