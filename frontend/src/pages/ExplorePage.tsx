import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  HeartCrack,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SwipeDeck } from "@/components/swipe/SwipeDeck";
import type { SwipeDirection } from "@/components/swipe/SwipeCard";
import { popIn } from "@/lib/motion";
import {
  getPotentialMatches,
  likeUser,
  dislikeUser,
  undoLastSwipe,
} from "@/services/matchService";
import type { User } from "@/services/matchService";

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastSwipeTime, setLastSwipeTime] = useState<number | null>(null);

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

  // Auto-load the next batch when the current one is exhausted.
  useEffect(() => {
    if (
      currentUserIndex >= users.length &&
      users.length > 0 &&
      hasMore &&
      !loadingMore
    ) {
      setLoadingMore(true);
      getPotentialMatches()
        .then((nextBatch) => {
          if (nextBatch.length > 0) {
            setUsers(nextBatch);
            setCurrentUserIndex(0);
            setHasMore(nextBatch.length >= 20);
          } else {
            setHasMore(false);
          }
        })
        .catch(() => setHasMore(false))
        .finally(() => setLoadingMore(false));
    }
  }, [currentUserIndex, users.length, hasMore, loadingMore]);

  // Auto-expire the rewind window after 30s.
  useEffect(() => {
    if (lastSwipeTime === null) return;
    const timer = setTimeout(() => setLastSwipeTime(null), 30000);
    return () => clearTimeout(timer);
  }, [lastSwipeTime]);

  const handleSwipe = async (user: User, dir: SwipeDirection) => {
    // Optimistic: the card has already animated away — advance immediately.
    setCurrentUserIndex((prev) => prev + 1);
    setLastSwipeTime(Date.now());

    try {
      if (dir === "right") {
        const response = await likeUser(user.id);
        if (response.isMatch) setMatchedUser(user);
      } else {
        await dislikeUser(user.id);
      }
    } catch (err) {
      console.error("Error processing swipe:", err);
    }
  };

  const handleRewind = async () => {
    try {
      await undoLastSwipe();
      setCurrentUserIndex((prev) => Math.max(0, prev - 1));
      setLastSwipeTime(null);
    } catch (err) {
      console.error("Error undoing swipe:", err);
    }
  };

  const handleMatchClose = () => setMatchedUser(null);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading || loadingMore) {
    return (
      <MainLayout>
        <div className="mx-auto flex w-full max-w-md flex-col items-center">
          <Skeleton className="aspect-[3/4] w-full rounded-3xl" />
          <div className="mt-6 flex items-center justify-center gap-5">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="size-16 rounded-full" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {loadingMore ? "Loading more profiles…" : "Finding people for you…"}
          </p>
        </div>
      </MainLayout>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <MainLayout>
        <EmptyState
          icon={<AlertCircle className="size-10 text-destructive" />}
          title="Something went wrong"
          description={error}
          action={
            <Button onClick={loadPotentialMatches} variant="brand">
              <RefreshCw className="size-4" /> Try again
            </Button>
          }
        />
      </MainLayout>
    );
  }

  const remainingUsers = users.slice(currentUserIndex);

  /* ── Empty / seen everyone ───────────────────────────────────────────── */
  if (remainingUsers.length === 0) {
    const seenSome = users.length > 0;
    return (
      <MainLayout>
        <EmptyState
          icon={
            seenSome ? (
              <Sparkles className="size-10 text-brand" />
            ) : (
              <HeartCrack className="size-10 text-brand" />
            )
          }
          title={seenSome ? "You're all caught up" : "No profiles yet"}
          description={
            seenSome
              ? "You've seen everyone for now — check back soon for new people."
              : "Check back later as more people join."
          }
          action={
            <Button onClick={loadPotentialMatches} variant="brand">
              <RefreshCw className="size-4" /> Refresh
            </Button>
          }
        />
      </MainLayout>
    );
  }

  /* ── Deck ────────────────────────────────────────────────────────────── */
  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-md px-2 py-2">
        <SwipeDeck
          users={remainingUsers}
          onSwipe={handleSwipe}
          onRewind={handleRewind}
          rewindDisabled={currentUserIndex === 0 || lastSwipeTime === null}
        />
      </div>

      {/* Match celebration modal */}
      <AnimatePresence>
        {matchedUser && (
          <motion.div
            className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleMatchClose}
          >
            <motion.div
              variants={popIn}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-xl"
            >
              <div className="bg-gradient-brand px-6 py-10 text-center text-white">
                <p className="font-display text-4xl font-bold drop-shadow">
                  It's a Match!
                </p>
                <p className="mt-2 text-white/90">
                  You and {matchedUser.name} liked each other.
                </p>
              </div>
              <div className="flex gap-3 p-5">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleMatchClose}
                >
                  Keep swiping
                </Button>
                <Button
                  variant="brand"
                  className="flex-1"
                  onClick={() => {
                    handleMatchClose();
                    navigate(`/chat/${matchedUser.id}`);
                  }}
                >
                  <MessageCircle className="size-4" /> Say hi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

/** Shared centered empty/error layout. */
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-accent">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-2 max-w-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default ExplorePage;
