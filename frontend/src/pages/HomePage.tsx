import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Map } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";
import {
  getMatches,
  getPotentialMatches,
  type MatchResult,
  type User,
} from "@/services/matchService";
import { getChats, type ChatSummary } from "@/services/chatService";

const formatRelativeTime = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [matchesData, potentialData, chatsData] = await Promise.all([
        getMatches().catch(() => []),
        getPotentialMatches().catch(() => []),
        getChats().catch(() => []),
      ]);
      setMatches(matchesData);
      setPotentialMatches(potentialData);
      setChats(chatsData);
    } catch (error) {
      console.error("Error loading homepage data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unreadCount = chats.reduce((sum, c) => sum + c.unreadCount, 0);
  const recentMatches = matches.slice(0, 3);
  const recentChats = chats.slice(0, 2);
  const discoveryCards = potentialMatches.slice(0, 3);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Card Section */}
        <div className="lg:col-span-2">
          {/* Welcome Message */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-pink-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Welcome back{user?.name ? `, ${user.name}` : ""}!
                </h2>
                <p className="text-gray-600">
                  Ready to find your perfect match today?
                </p>
              </div>
              <div className="hidden sm:block">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-red-400 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-pink-50 rounded-2xl">
                <div className="text-2xl font-bold text-pink-600">
                  {matches.length}
                </div>
                <div className="text-sm text-gray-600">Matches</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-2xl">
                <div className="text-2xl font-bold text-purple-600">
                  {unreadCount}
                </div>
                <div className="text-sm text-gray-600">Unread Messages</div>
              </div>
            </div>
          </div>

          {/* Discovery Cards */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-pink-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Discover People Near You
              </h3>
              <button
                onClick={() => navigate("/explore")}
                className="flex items-center space-x-2 text-pink-600 hover:text-pink-700 transition-colors"
              >
                <Map className="w-4 h-4" />
                <span className="text-sm font-medium">View All</span>
              </button>
            </div>

            {discoveryCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {discoveryCards.map((person) => (
                  <div key={person.id} className="group relative">
                    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100">
                      {/* Profile Image */}
                      <div className="text-center mb-4">
                        {person.photos[0] ? (
                          <img
                            src={person.photos[0]}
                            alt={person.name}
                            className="w-20 h-20 mx-auto rounded-full object-cover mb-3"
                          />
                        ) : (
                          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-2xl text-white font-semibold mb-3">
                            {person.name[0]}
                          </div>
                        )}
                        <h4 className="text-xl font-semibold text-gray-800">
                          {person.name}, {person.age}
                        </h4>
                      </div>

                      {/* Interests */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {person.interests.slice(0, 3).map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => navigate("/explore")}
                        className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white py-2 px-4 rounded-xl transition-all text-sm font-medium"
                      >
                        View on Explore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No profiles to discover right now. Check back later!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Matches */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-pink-100 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Recent Matches
              </h3>
              <button
                onClick={() => navigate("/matches")}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentMatches.length > 0 ? (
                recentMatches.map((match) => (
                  <div
                    key={match.matchId}
                    onClick={() => navigate("/matches")}
                    className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer"
                  >
                    {match.photos[0] ? (
                      <img
                        src={match.photos[0]}
                        alt={match.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                        {match.name[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {match.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(match.matchedAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No matches yet
                </p>
              )}
            </div>
          </div>

          {/* Messages Preview */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-pink-100 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Messages</h3>
              <button
                onClick={() => navigate("/chat")}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <div
                    key={chat.chatId}
                    onClick={() => navigate("/chat")}
                    className={`p-3 rounded-xl transition-colors cursor-pointer ${
                      chat.unreadCount > 0
                        ? "bg-pink-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-800 text-sm">
                      {chat.otherUserName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {chat.lastMessage || "No messages yet"}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        chat.unreadCount > 0
                          ? "text-pink-600"
                          : "text-gray-400"
                      }`}
                    >
                      {chat.lastMessageTime
                        ? formatRelativeTime(chat.lastMessageTime)
                        : ""}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No messages yet
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">Boost Your Profile</h3>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                Coming Soon
              </span>
            </div>
            <p className="text-pink-100 text-sm">
              Premium features are on the way — stay tuned!
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
