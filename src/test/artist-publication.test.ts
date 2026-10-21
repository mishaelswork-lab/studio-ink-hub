import { describe, expect, it } from "vitest";
import { isPublishedArtist } from "@/hooks/usePublicArtists";

describe("artist publication", () => {
  const artist = { application_status: "approved", available: true, portfolio_images: ["https://art/1.jpg", "https://art/2.jpg"] };
  it("requires admin approval", () => {
    expect(isPublishedArtist({ ...artist, application_status: "pending" })).toBe(false);
    expect(isPublishedArtist({ ...artist, application_status: "rejected" })).toBe(false);
    expect(isPublishedArtist(artist)).toBe(true);
  });
  it("requires two distinct portfolio photos", () => {
    expect(isPublishedArtist({ ...artist, portfolio_images: ["https://art/1.jpg"] })).toBe(false);
    expect(isPublishedArtist({ ...artist, portfolio_images: ["https://art/1.jpg", "https://art/1.jpg"] })).toBe(false);
    expect(isPublishedArtist(artist)).toBe(true);
  });
  it("keeps hidden profiles out of public lists", () => {
    expect(isPublishedArtist({ ...artist, available: false })).toBe(false);
  });
});