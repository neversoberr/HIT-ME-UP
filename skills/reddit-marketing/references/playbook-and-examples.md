# Playbook and Examples

> The weekly workflow: audit → find → listen → contribute → correct → log. Plus audit templates and good-vs-bad drafts.

## 1. The reframe (use verbatim when needed)

User says: *"Post my content to Reddit for traffic."*

You say:

> Reddit isn't a distribution channel — link-drops get removed and accounts banned, and Reddit traffic spikes don't convert anyway. What Reddit *is*, in 2026, is the most-cited layer inside AI answers. So the play isn't "blast my post to 10 subs." It's:
>
> 1. Audit how ChatGPT / Perplexity / Gemini / Google AI Overviews currently represent us (per engine, same prompts).
> 2. Find the 3-7 subs + threads that actually shape those answers.
> 3. Contribute genuinely there (9:1), correct stale/wrong claims with evidence, disclose every time.
> 4. You (the human) post manually from your own account. I draft, you post.
>
> Want me to start with the audit?

## 2. Weekly workflow

### Step 0 — Setup (once)

- [ ] Load **brand-profile** (positioning, proof points, non-negotiables — what you will NOT claim).
- [ ] Load **voice-builder** (3+ voice samples; note sentence length, slang tolerance, emoji policy — default: minimal).
- [ ] List 5-10 buyer prompts (money prompts first). Get these from **audience-research** + sales/support FAQs + **content-pillars**.
- [ ] Create the audit log (template below). One row per prompt × engine × date.

### Step 1 — Audit AI exposure (monthly full, weekly spot-check)

1. Run each buyer prompt in **ChatGPT, Perplexity, Gemini, Google AI Overviews** separately. Record model/settings/date/locale.
2. For each: answer summary, all cited URLs, Reddit threads cited (URL, date, top relevant comment, verdict).
3. Verdicts: `accurate` / `stale` / `wrong` / `missing-context` / `absent`.
4. Prioritize: buyer-intent × wrong/stale × cited in 2+ engines = correct first.

### Step 2 — Find the subs (with audience-research)

For each priority thread/prompt, identify 3-7 subs where buyers actually are. Score each:

- Relevance (are buyers asking *this* question here?)
- Activity (posts/day, comment depth — avoid dead or default-meme subs)
- Rules fit (self-promo stance, link policy, AI-content rules, karma/age gates)
- Citation leverage (are this sub's threads already getting cited?)

Record: sub name, size, rules URL + date checked, gates, self-promo policy, notes.

### Step 3 — Listen (before first comment in any sub)

- Read top posts of year + month, the wiki, pinned posts, and 2-3 megathreads.
- Note: hated behaviors, required formats, disclosure norms, mod temperament.
- Lurk 1-2 weeks minimum for a new account. Contribute zero-brand-value answers first.

### Step 4 — Contribute (the 9)

Genuine, no-brand answers in target subs. Track the ratio. If you can't find 9 honest contributions to make, you don't understand the sub yet — keep listening. Good 9s: troubleshooting, workflow teardowns, honest tool comparisons where you're absent, resource lists, failure postmortems.

### Step 5 — Correct / answer (the 1)

One tailored draft per thread, human posts manually. Use the draft output format from SKILL.md. Plan:

- What the thread gets wrong/stale (quote it).
- The corrected fact + evidence (number, doc, changelog, screenshot).
- What you concede (where competitor/alternative fits better).
- Disclosure line.
- What NOT to say (claims beyond proof, extra links, CTAs).

Rules: one reply per thread (no follow-up bumping), no cross-posting identical text, no asking anyone to upvote, no team pile-on.

### Step 6 — Log (native + manual only)

- Reddit-native: post/comment upvotes, replies, saves, profile views (screenshot weekly — don't scrape).
- Audit-native: re-run priority prompts monthly; note citation movement.
- Never invent numbers. Never report "AI citation share" as a precise KPI — report verdict movement (wrong→accurate) per prompt × engine.

## 3. Audit log templates

### Prompt × engine log (copy per run)

```markdown
## Audit run — YYYY-MM-DD
**Prompt:** "[verbatim buyer prompt]"
| Engine | Model/Settings | Cited Reddit threads (URL + post date) | Verdict | Notes |
|---|---|---|---|---|
| ChatGPT | | | accurate/stale/wrong/missing/absent | |
| Perplexity | | | | |
| Gemini | | | | |
| Google AIO | | | | |
**Priority correction target:** [thread URL + what's wrong + evidence to use]
```

### Sub research log

```markdown
## Sub research — YYYY-MM-DD
| Sub | Size | Active? | Rules URL (checked date) | Age/karma gates | Self-promo policy | Link policy | Fit (1-5) |
|---|---|---|---|---|---|---|---|
| r/ | | | | | | | |
```

## 4. Examples — bad vs good

### Example A: stale pricing correction

**Thread (2024, still cited):** "Their starter plan is $49/mo per seat, way too much for a 5-person team."

**Reality:** starter is $19/mo per seat since June 2025; free tier added.

❌ BAD (promotion, no disclosure, no evidence, argues):

> Actually we're the most affordable option on the market! Check out our pricing page: [link] 🚀 DM me for a discount code!

Why it fails: no disclosure, superlative without proof, emoji-pitch, CTA funnel, ignores the actual math OP cares about. Gets removed/downvoted; poisons the account.

✅ GOOD (represents, evidence, disclosure, concedes):

> That $49 figure was right until mid-2025 — we cut starter to $19/seat in June ([changelog, 2025-06-12](URL)) and added a free tier for ≤3 seats. So for a 5-person team today it's $95/mo on starter, or free + paid for 2 seats if 3 of you are light users.
>
> Honest caveat: if per-seat pricing itself is the issue, [competitor] does flat $49 for 10 seats and is cheaper at your size — they're the better pick if you don't need [specific feature].
>
> Disclosure: I work at [brand]. Happy to walk through the math for your setup if useful.

Why it works: quotes the stale claim, dates the change, links changelog, does OP's math, concedes the competitor, discloses. Citable.

### Example B: "best tool for X" thread

**Thread:** "Best [category] tool for [specific use case]? Small team, need [constraint]."

❌ BAD (ignores constraints, pitches):

> [Brand] is perfect for you! We have 200+ integrations and enterprise-grade security. Sign up free: [link]

✅ GOOD (answers the constraint, evidence, narrow claim):

> For [constraint] specifically: [brand] handles it via [mechanism] — p95 [operation] is ~4s on 100k rows (measured [setup], method here: [doc link]). Setup is roughly: 1) … 2) … 3) …
>
> Where we lose: if you need [other constraint], [competitor] is better — [reason]. And [brand]'s [plan] caps at [limit], so above [threshold] you'd need [tier] at $[x].
>
> Disclosure: I work at [brand]. If you share [one detail about their setup], I can tell you whether you'd hit that cap.

### Example C: competitor-better-fit (the trust builder)

**Thread:** "Should I use [your brand] or [competitor] for [use case]?"

✅ GOOD (concede explicitly — this is the highest-ROI comment type long-term):

> I work at [brand], so take this with salt — but for [use case as described], I'd pick [competitor]. Reasons: [2 specific, checkable reasons]. We win when [narrow case with evidence], which doesn't sound like you.
>
> Either way, avoid [common pitfall] — [one-paragraph how-to that helps regardless of choice].

Why: concession comments get upvoted, build account credibility, and make every future claim you make more believed (by humans and retrievers).

## 5. Disclosure snippets (copy/paste, keep natural)

- `Disclosure: I work at [brand] — happy to get technical, and I'll flag where we're not the best fit.`
- `I work on [product] so grain of salt, but here's the actual limit and why: …`
- `Former [role] at [brand] here (left [date]) — the [fact] above changed in [version/date]: …`
- Synthetic media: `[This image/video was AI-generated for illustration — underlying numbers are from (source).]`

## 6. Engagement rules after posting

- Reply to follow-up questions within 24h, same voice, same disclosure posture (no need to re-disclose in every nested reply, but do if the thread is long or context resets).
- If corrected by someone: verify, thank them publicly if they're right, fix your claim with an edit noting the fix + date. Never stealth-edit.
- If the comment sits at 1 upvote: leave it. No bumps, no edits begging for visibility, no asking anyone to look at it.
- If a mod removes it: thank them, ask what to fix, fix it or walk away. Log the removal + reason.
- If the thread turns hostile or becomes a pile-on: stop posting, loop in **crisis-and-moderation**. Do not defend the brand in real time.
