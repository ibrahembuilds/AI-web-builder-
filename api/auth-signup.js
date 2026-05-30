// Vercel serverless function — kanyoai sign-up (no email confirmation)
// Uses service role key so the account is active immediately.
// POST /api/auth-signup   body: { email, password, name }

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Auth service is not configured on the server." });
  }

  const body = req.body || {};
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const name = (body.name || "").trim().slice(0, 100);

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification — account is live immediately
      user_metadata: {
        full_name: name,
        name, // some OAuth providers use "name"
      },
    });

    if (error) {
      // Translate Supabase's internal messages to user-friendly ones
      const msg = error.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        return res
          .status(400)
          .json({ error: "An account with this email already exists. Try signing in." });
      }
      return res.status(400).json({ error: msg || "Could not create account." });
    }

    return res.status(200).json({ success: true, user_id: data.user?.id ?? null });
  } catch (err) {
    console.error("auth-signup error", err);
    return res.status(500).json({ error: err.message || "Signup failed." });
  }
};
