import { Search, X, Loader2 } from "lucide-react";

const StartChatModal = ({
  show,
  onClose,
  searchQuery,
  handleSearchInput,
  searchResults,
  isSearching,
  startChat,
  loading,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-teal-900">Start New Chat</h2>

            <button
              onClick={onClose}
              className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400" />
            <input
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
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
                Try searching with a different name or email
              </p>
            </div>
          ) : !searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-teal-500" />
              </div>
              <p className="text-teal-700 font-medium">Search for users</p>
              <p className="text-sm text-teal-600">
                Enter an email to find people
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 hover:bg-teal-50 rounded-lg border-2 border-teal-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </div>

                    <div>
                      <h3 className="font-semibold text-teal-900">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-teal-600">{user.email}</p>

                      {user.employee_info && (
                        <p className="text-xs text-teal-500">
                          {user.employee_info.department} •{" "}
                          {user.employee_info.position}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => startChat(user)}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 text-sm"
                  >
                    {user.has_existing_chat ? "Open Chat" : "Start Chat"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartChatModal;
