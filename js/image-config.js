/**
 * CampusFind - External Image Hosting Configuration
 * 
 * Free-tier external image hosting powered by Cloudinary Unsigned Uploads.
 * Runs completely on the free Firebase Spark plan without requiring
 * Firebase Blaze or billing accounts.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a free account at https://cloudinary.com (zero credit card needed).
 * 2. In your Cloudinary Dashboard, copy your "Cloud name" and paste it in `cloudName` below.
 * 3. Go to Settings (gear icon) > Upload > Scroll to "Upload presets" > Click "Add upload preset".
 * 4. Set "Signing Mode" to "Unsigned" (critical).
 * 5. Name the preset "campusfind_reports" (or paste your preset name in `uploadPreset` below).
 * 6. (Optional) Copy your 15-digit public "API Key" from your dashboard into `apiKey` below.
 * 
 * SECURITY:
 * - Uses Unsigned Uploads which expose only public parameters (cloudName, uploadPreset, public apiKey).
 * - Privileged API Secret and administrative credentials are NEVER stored in frontend code.
 * - Unsigned presets only allow uploading new image assets; clients cannot delete, overwrite,
 *   or browse existing assets.
 */

export const IMAGE_CONFIG = {
  provider: 'cloudinary',

  // 1. Cloud Name: Found on your Cloudinary Dashboard (e.g. 'dy2xyz123' or your registered name)
  // Leave empty or set to your actual Cloudinary Cloud Name.
  cloudName: 'os0edh7p',

  // 2. Unsigned Upload Preset: Created in Cloudinary Console > Settings > Upload > Upload presets
  // Must have Signing Mode set to "Unsigned".
  uploadPreset: 'campusfind',

  // 3. (Optional) Public API Key: 15-digit public number from your Cloudinary Dashboard.
  apiKey: '',

  // Validation rules
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB limit
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],

  // API upload endpoint
  get uploadEndpoint() {
    return `https://api.cloudinary.com/v1_1/${this.cloudName.trim()}/image/upload`;
  },

  /**
   * Check whether image hosting configuration has been set by the user
   * @returns {boolean}
   */
  isConfigured() {
    const name = (this.cloudName || '').trim().toLowerCase();
    const preset = (this.uploadPreset || '').trim();
    const placeholders = ['', 'campusfind', 'your_cloud_name', 'your_cloudinary_cloud_name', 'your_cloudname_here'];
    return !placeholders.includes(name) && preset.length > 0;
  }
};
