"use client";
import { useEffect } from "react";

export default function ProfileViewTracker({ userId }: { userId: string }) {
  useEffect(() => {
    fetch(`/api/social/profiles/${userId}/view`, { method: "POST" }).catch(() => {});
  }, [userId]);
  return null;
}
