/** Production frontend URL for emails, links, and CORS (Render: set FRONTEND_URL). */
function getAppUrl() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return String(raw).replace(/\/$/, "");
}

module.exports = { getAppUrl };
