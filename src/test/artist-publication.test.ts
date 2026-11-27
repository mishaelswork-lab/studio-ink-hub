import { describe, expect, it } from "vitest";
import { isPublishedArtist } from "@/hooks/usePublicArtists";

describe("artist publication", () => {
  const artist = { status: "active", available: true, portfolio: ["signed-url-1", "signed-url-2"] };
  it("requires an active admin-approved artist status", () => {
    expect(isPublishedArtist({ ...artist, status: "pending" })).toBe(false);
    expect(isPublishedArtist({ ...artist, status: "suspended" })).toBe(false);
    expect(isPublishedArtist(artist)).toBe(true);
  });
  it("requires two distinct approved portfolio items", () => {
    expect(isPublishedArtist({ ...artist, portfolio: ["signed-url-1"] })).toBe(false);
    expect(isPublishedArtist({ ...artist, portfolio: ["signed-url-1", "signed-url-1"] })).toBe(false);
    expect(isPublishedArtist(artist)).toBe(true);
  });
  it("keeps hidden profiles out of public lists", () => {
    expect(isPublishedArtist({ ...artist, available: false })).toBe(false);
  });
});
