// beehiiv-publish.mjs
// Creates today's post on beehiiv and tries to schedule the email for 09:00 UAE (05:00 UTC).
// If your account doesn’t have Send API yet, the schedule step will fail gracefully and
// the post will still be published to web; you can click Send in the beehiiv dashboard.

const PUB_ID = "7b4a78bd-97e8-406c-a93c-c3cb1121457e"; // your publication
const API_KEY = process.env.BEEHIIV_API_KEY;
if (!API_KEY) throw new Error("Missing BEEHIIV_API_KEY (set it in GitHub → Settings → Secrets → Actions)");

/* ========== CONTENT ==========

Basics first: this script ships with a simple template.
Edit the 10 items below any time. Each item is {title, url, blurb, icon}.

Later, if you want full auto-news, I can swap this with a fetcher.
*/
function items() {
  return [
    {
      title: "U.S. embeds trackers in AI chip shipments",
      url: "https://www.reuters.com/world/china/us-embeds-trackers-ai-chip-shipments-catch-diversions-china-sources-say-2025-08-13/",
      blurb:
        "Authorities placed discreet trackers in select Nvidia and AMD shipments to detect diversions to China. Expect tighter audits and longer lead times.",
      icon: "https://www.reuters.com/pf/resources/images/reuters/favicon-32x32.png"
    },
    {
      title: "YouTube tests AI age checks",
      url: "https://apnews.com/article/1ce99a7089b33e88dc76e49945ded186",
      blurb:
        "Trial flags minors based on behavior, not birthdays; appeals need ID/selfie. Safety up, privacy questions too.",
      icon: "https://apnews.com/pb/resources/img/AP-Logo-150x150.png"
    },
    {
      title: "Australia warns on AI bias risks",
      url: "https://www.theguardian.com/technology/2025/aug/13/ai-artificial-intelligence-racism-sexism-australia-human-rights-commissioner",
      blurb:
        "Human Rights Commissioner urges bias testing, transparency, and human review—especially in health use cases.",
      icon: "https://www.theguardian.com/favicon.ico"
    },
    {
      title: "NTT DATA x Google Cloud on agentic AI",
      url: "https://www.nttdata.com/global/en/news/press-release/2025/august/081300",
      blurb:
        "Partnership targets industry-specific agent systems and sovereign cloud patterns—expect faster enterprise rollouts.",
      icon: "https://www.nttdata.com/favicon.ico"
    },
    {
      title: "OpenAI rethinks model removals amid GPT-5 rollout",
      url: "https://www.theverge.com/",
      blurb:
        "Signal that older models won’t be yanked without notice. Pin versions and keep fallbacks to avoid breakage.",
      icon: "https://www.theverge.com/icons/icon-48x48.png"
    },
    {
      title: "GPT-5: higher reasoning ceiling",
      url: "https://openai.com/",
      blurb:
        "If claims hold, expect simpler prompt patterns and renewed focus on evals before flipping traffic.",
      icon: "https://openai.com/favicon.ico"
    },
    // Add up to 10 total
  ];
}

/* ====== do not edit below here unless you want to ====== */

function todayTitle() {
  return `The Gradient Shot • ${new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })}`;
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function bodyHtml() {
  const opener = "Today in AI: chips tracked, model moves, safety flags.";
  const rows = items()
    .slice(0, 10)
    .map(
      (it, i) => `
    <tr>
      <td width="60" valign="top">
        <img src="${escapeHtml(it.icon)}" width="48" height="48" style="border-radius:8px;object-fit:cover">
      </td>
      <td valign="top">
        <strong>${escapeHtml(it.title)}</strong><br>
        ${escapeHtml(it.blurb)}
        <div style="margin-top:6px">
          <a href="${escapeHtml(it.url)}">Read more</a>
          <!-- Optional global feedback links once your endpoint is ready:
          • <a href="https://YOUR-ENDPOINT/api/vote?id=${i}&vote=up">👍</a>
          • <a href="https://YOUR-ENDPOINT/api/vote?id=${i}&vote=down">👎</a>
          -->
        </div>
      </td>
    </tr>`
    )
    .join("\n");

  return `
  <h1 style="margin:0 0 8px 0">The Gradient Shot</h1>
  <p><em>${escapeHtml(opener)}</em></p>
  <table width="100%" cellspacing="0" cellpadding="0" style="font-family:Arial,Helvetica,sans-serif;line-height:1.45;color:#111">
    ${rows}
  </table>
  <p style="font-size:12px;color:#666;margin-top:12px">
    <a href="https://the-gradient-shot.beehiiv.com">Subscribe</a>
  </p>`;
}

// Node 20 has fetch built in
async function createPost() {
  const res = await fetch(`https://api.beehiiv.com/v2/publications/${PUB_ID}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: todayTitle(),
      status: "published", // live on web immediately
      web_only: true,      // email will be sent by schedule step below (if available)
      html_body: bodyHtml()
    })
  });
  if (!res.ok) throw new Error(`Create post failed ${res.status}: ${await res.text()}`);
  return res.json(); // contains { id, ... }
}

function nextSendAtUtc() {
  // 09:00 UAE = 05:00 UTC
  const now = new Date();
  const t = new Date();
  t.setUTCHours(5, 0, 0, 0);
  if (now.getUTCHours() >= 5) t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString();
}

async function scheduleSend(postId) {
  const res = await fetch(`https://api.beehiiv.com/v2/publications/${PUB_ID}/sends`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      post_id: postId,
      platforms: ["email", "web"],
      send_at: nextSendAtUtc()
    })
  });
  if (!res.ok) throw new Error(`Schedule send failed ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  const post = await createPost();
  console.log("Post created:", post.id);

  // If Send API isn’t enabled on your plan yet, this will 403 or return an error.
  try {
    const scheduled = await scheduleSend(post.id);
    console.log("Email scheduled:", scheduled);
  } catch (err) {
    console.log("Send API not enabled yet. Post is live on web; schedule/send via beehiiv dashboard for now.");
    console.log(String(err));
  }
})();
