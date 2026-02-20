import api from "./api";

export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  interests: string[];
  photos: string[];
  profilePicture?: string;
  gender?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  intentions?: string[];
  height?: number;
}

export interface MatchResponse {
  success: boolean;
  message: string;
  isMatch?: boolean;
  match?: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
}

export interface PotentialMatchesResponse {
  success: boolean;
  data: User[];
  count: number;
}

interface RawPotentialMatch {
  id?: string;
  name?: string;
  age?: number;
  bio?: string;
  interests?: string[];
  photoUrls?: string[];
  profilePicture?: string;
  gender?: string;
  location?: { type: string; coordinates: number[] };
  intentions?: string[];
  height?: number;
}

interface RawMatch {
  matchId?: string;
  matchedAt?: string;
  user?: {
    id?: string;
    name?: string;
    age?: number;
    bio?: string;
    interests?: string[];
    photoUrls?: string[];
  };
}

interface RawLike {
  likeId?: string;
  likedAt?: string;
  user?: {
    id?: string;
    name?: string;
    age?: number;
    bio?: string;
    gender?: string;
    location?: { type: string; coordinates: number[] };
    photoUrls?: string[];
    profilePicture?: string;
    interests?: string[];
  };
}

export interface MatchResult {
  matchId: string;
  matchedAt: string;
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  interests: string[];
  photos: string[];
  lastMessage?: string;
  unreadCount?: number;
}

// Get potential matches for swiping
export const getPotentialMatches = async (): Promise<User[]> => {
  try {
    const response = await api.get("/matches/potential");
    const raw: RawPotentialMatch[] = response.data.data || [];
    return raw.map((u) => ({
      id: String(u.id ?? ""),
      name: u.name ?? "",
      age: u.age ?? 0,
      bio: u.bio ?? "",
      distance: "",
      interests: u.interests ?? [],
      photos: u.photoUrls ?? [],
      profilePicture: u.profilePicture,
      gender: u.gender,
      location: u.location,
      intentions: u.intentions,
      height: u.height,
    }));
  } catch (error) {
    console.error("Error fetching potential matches:", error);
    throw error;
  }
};

// Like a user
export const likeUser = async (userId: string): Promise<MatchResponse> => {
  try {
    const response = await api.post(`/matches/like/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error liking user:", error);
    throw error;
  }
};

// Dislike a user
export const dislikeUser = async (userId: string): Promise<MatchResponse> => {
  try {
    const response = await api.delete(`/matches/like/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error disliking user:", error);
    throw error;
  }
};

// Get user's mutual matches
export const getMatches = async (): Promise<MatchResult[]> => {
  try {
    const response = await api.get("/matches");
    const raw: RawMatch[] = response.data.data || [];
    return raw.map((m) => {
      const user = m.user ?? {};
      return {
        matchId: String(m.matchId ?? ""),
        matchedAt: m.matchedAt ?? "",
        id: String(user.id ?? ""),
        name: user.name ?? "",
        age: user.age ?? 0,
        bio: user.bio ?? "",
        distance: "",
        interests: user.interests ?? [],
        photos: user.photoUrls ?? [],
      };
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
};

// Get users who liked current user
export const getLikesReceived = async (): Promise<User[]> => {
  try {
    const response = await api.get("/matches/likes");
    const raw: RawLike[] = response.data.data || [];
    return raw.map((item) => ({
      id: String(item.user?.id ?? ""),
      name: item.user?.name ?? "",
      age: item.user?.age ?? 0,
      bio: item.user?.bio ?? "",
      distance: "",
      interests: item.user?.interests ?? [],
      photos: item.user?.photoUrls ?? [],
      profilePicture: item.user?.profilePicture,
      gender: item.user?.gender,
      location: item.user?.location,
    }));
  } catch (error) {
    console.error("Error fetching likes received:", error);
    throw error;
  }
};

// Get likes sent by current user
export const getLikesSent = async (): Promise<User[]> => {
  try {
    const response = await api.get("/matches/likes-sent");
    const raw: RawLike[] = response.data.data || [];
    return raw.map((item) => ({
      id: String(item.user?.id ?? ""),
      name: item.user?.name ?? "",
      age: item.user?.age ?? 0,
      bio: item.user?.bio ?? "",
      distance: "",
      interests: item.user?.interests ?? [],
      photos: item.user?.photoUrls ?? [],
      profilePicture: item.user?.profilePicture,
      gender: item.user?.gender,
      location: item.user?.location,
    }));
  } catch (error) {
    console.error("Error fetching likes sent:", error);
    throw error;
  }
};
