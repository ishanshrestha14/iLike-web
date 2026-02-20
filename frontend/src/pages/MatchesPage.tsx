import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { getMatches } from "@/services/matchService";
import type { MatchResult } from "@/services/matchService";

const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const matchesData = await getMatches();
      setMatches(matchesData);
    } catch (err) {
      console.error("Error loading matches:", err);
      setError("Couldn't load your matches. Please try again.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleStartChat = (match: MatchResult) => {
    console.log("Starting chat with:", match.name);
    navigate(`/chat/${match.id}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your matches...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadMatches}
              className="bg-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (matches.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No matches yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start swiping to find your perfect match!
            </p>
            <button
              onClick={() => navigate("/explore")}
              className="bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Your Matches
          </h1>
          <p className="text-gray-600">
            You have {matches.length}{" "}
            {matches.length === 1 ? "match" : "matches"}
          </p>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100"
            >
              {/* Match Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={match.photos[0]}
                  alt={match.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md">
                  <Heart className="w-5 h-5 text-pink-500" />
                </div>
                {match.unreadCount && match.unreadCount > 0 && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {match.unreadCount}
                  </div>
                )}
              </div>

              {/* Match Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    {match.name}, {match.age}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {formatMatchDate(match.matchedAt)}
                  </span>
                </div>

                <div className="flex items-center text-gray-600 text-sm mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  {match.distance}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {match.bio}
                </p>

                {/* Interests */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {match.interests.slice(0, 3).map((interest, index) => (
                    <span
                      key={index}
                      className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                  {match.interests.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                      +{match.interests.length - 3}
                    </span>
                  )}
                </div>

                {/* Last Message */}
                {match.lastMessage && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {match.lastMessage}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartChat(match)}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 px-4 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                  <button
                    onClick={() => setSelectedMatch(match)}
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Match Detail Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="relative">
                <img
                  src={selectedMatch.photos[0]}
                  alt={selectedMatch.name}
                  className="w-full h-64 object-cover rounded-t-3xl"
                />
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedMatch.name}, {selectedMatch.age}
                  </h2>
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedMatch.distance}
                  </div>
                </div>

                <p className="text-gray-600 mb-4 leading-relaxed">
                  {selectedMatch.bio}
                </p>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleStartChat(selectedMatch)}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Chat
                  </button>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MatchesPage;
