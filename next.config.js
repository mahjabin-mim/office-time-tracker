/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        // Short, stable download link; always serves the newest Android build.
        source: "/download/android",
        destination:
          "https://github.com/mahjabin-mim/office-time-tracker/releases/latest/download/OfficeTimeTracker.apk",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
