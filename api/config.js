export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    siteName: process.env.SITE_NAME || "مساعدي الخاص",
    maxUploadBytes: 2_500_000
  });
}
