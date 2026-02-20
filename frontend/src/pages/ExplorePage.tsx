import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { CardSwipe } from "@/components/ui/card-swipe";
import { getPotentialMatches, likeUser, dislikeUser } from "@/services/matchService";
import type { User } from "@/services/matchService";

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPotentialMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const potentialUsers = await getPotentialMatches();
      setUsers(potentialUsers);
      setCurrentUserIndex(0);
      setHasMore(potentialUsers.length >= 20);
    } catch (err) {
      console.error("Error loading potential matches:", err);
      setError("Couldn't load profiles. Please try again.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPotentialMatches();
  }, [loadPotentialMatches]);

  // Auto-load next batch when current batch is exhausted
  useEffect(() => {
    if (currentUserIndex >= users.length && users.length > 0 && hasMore && !loadingMore) {
      setLoadingMore(true);
      getPotentialMatches().then((nextBatch) => {
        if (nextBatch.length > 0) {
          setUsers(nextBatch);
          setCurrentUserIndex(0);
          setHasMore(nextBatch.length >= 20);
        } else {
          setHasMore(false);
        }
      }).catch(() => {
        setHasMore(false);
      }).finally(() => {
        setLoadingMore(false);
      });
    }
  }, [currentUserIndex, users.length, hasMore, loadingMore]);

  const handleLike = async (userId: string) => {
    const user = users[currentUserIndex];
    if (!user) return;

    console.log("Liked user:", user.name);

    try {
      const response = await likeUser(userId);
      if (response.isMatch) {
        setMatchFound(true);
        setMatchedUser(user);
      }
    } catch (error) {
      console.error("Error liking user:", error);
    }

    // Move to next user
    moveToNextUser();
  };

  const handleDislike = async (userId: string) => {
    const user = users[currentUserIndex];
    if (!user) return;

    console.log("Disliked user:", user.name);

    try {
      await dislikeUser(userId);
    } catch (error) {
      console.error("Error disliking user:", error);
    }

    // Move to next user
    moveToNextUser();
  };

  const moveToNextUser = () => {
    setCurrentUserIndex((prev) => prev + 1);
  };

  const handleMatchClose = () => {
    setMatchFound(false);
    setMatchedUser(null);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding potential matches...</p>
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
              onClick={loadPotentialMatches}
              className="bg-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (users.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No more profiles
            </h3>
            <p className="text-gray-600">Check back later for new matches!</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (currentUserIndex >= users.length && !loadingMore) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              You've seen everyone for now
            </h3>
            <p className="text-gray-600 mb-6">Check back later for new profiles!</p>
            <button
              onClick={loadPotentialMatches}
              className="bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loadingMore) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading more profiles...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Get current user
  const currentUser = users[currentUserIndex];

  // Convert user photos to images format for CardSwipe
  const userImages = currentUser.photos.map((photo, index) => ({
    src: photo,
    alt: `${currentUser.name} photo ${index + 1}`,
  }));

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Card Swipe Component */}
        <CardSwipe
          images={userImages}
          autoplayDelay={1500}
          slideShadows={false}
          userName={currentUser.name}
          userAge={currentUser.age}
          userHobbies={currentUser.interests}
          userBio={currentUser.bio}
          userDistance={currentUser.distance}
          onLike={() => handleLike(currentUser.id)}
          onDislike={() => handleDislike(currentUser.id)}
        />

        {/* Match Found Modal */}
        {matchFound && matchedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md mx-4 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                It's a Match!
              </h2>
              <p className="text-gray-600 mb-6">
                You and {matchedUser.name} liked each other!
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleMatchClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Keep Swiping
                </button>
                <button
                  onClick={() => {
                    handleMatchClose();
                    navigate(`/chat/${matchedUser.id}`);
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-pink-50 rounded-2xl">
            <div className="text-2xl font-bold text-pink-600">
              {users.length}
            </div>
            <div className="text-sm text-gray-600">Profiles</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-2xl">
            <div className="text-2xl font-bold text-purple-600">12</div>
            <div className="text-sm text-gray-600">Likes Sent</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-2xl">
            <div className="text-2xl font-bold text-red-600">3</div>
            <div className="text-sm text-gray-600">Matches</div>
          </div>
        </div> */}
      </div>
    </MainLayout>
  );
};

export default ExplorePage;
