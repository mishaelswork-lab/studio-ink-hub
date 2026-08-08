/**
 * Permission purpose strings.
 *
 * These are the single source of truth for the copy shown to users before we
 * request a device permission, and for the native purpose strings that must be
 * declared in the store builds:
 *
 * iOS — ios/App/App/Info.plist
 *   NSCameraUsageDescription            -> PERMISSION_PURPOSE.camera
 *   NSPhotoLibraryUsageDescription      -> PERMISSION_PURPOSE.photos
 *   NSPhotoLibraryAddUsageDescription   -> PERMISSION_PURPOSE.photosSave
 *   NSLocationWhenInUseUsageDescription -> PERMISSION_PURPOSE.location
 *   NSUserTrackingUsageDescription is NOT required — Tart does no ad tracking.
 *
 * Android — android/app/src/main/AndroidManifest.xml
 *   CAMERA, READ_MEDIA_IMAGES, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS
 *   (each requested at the moment of use, never at launch).
 */
export const PERMISSION_PURPOSE = {
  camera:
    "Tart uses your camera only when you choose to photograph the area you want tattooed, so the AI can suggest stencils that fit that placement.",
  photos:
    "Tart accesses your photos only when you pick a reference image to share with an artist or to generate a tattoo stencil.",
  photosSave:
    "Tart saves generated stencils to your photo library when you tap Download.",
  location:
    "Tart uses your approximate location only to show tattoo studios near you. You can decline and browse all studios instead.",
  notifications:
    "Tart sends notifications for booking updates and new replies from your artist. You can turn these off at any time.",
  microphone: null,
} as const;

export type PermissionKey = keyof typeof PERMISSION_PURPOSE;
