# Reddit and AI Citations in 2026

> Companion to the **reddit-marketing** skill + primary partner skill **ai-search-optimization**.
> Stats below carry a **verify quarterly** obligation — answer-engine behavior swings week to week.

## The one-paragraph case

In 2026, a large share of product discovery happens inside AI answers (ChatGPT, Perplexity, Gemini, Google AI Overviews), not on page 1 of Google. Those answers are built on a **source layer** — the set of URLs the models retrieve, trust, and cite. Reddit is currently the **most-cited source across major AI answer engines** (~40% LLM citation frequency — *verify quarterly*), and ~99% of Reddit citations point to **specific threads**, not brand pages or profiles. Conclusion: if you want AI answers to represent you accurately, you have to be accurately represented **in threads** — by contributing genuinely, correcting stale records with evidence, and earning the upvotes that signal trust.

## 1. The AI source layer (mental model)

Think in three layers:

1. **Corpus layer** — what models trained on (old, frozen, includes ancient Reddit threads).
2. **Retrieval layer** — what RAG / browsing / grounding pulls *right now* (this is where current Reddit threads, docs, and reviews compete).
3. **Answer layer** — what the user sees: a synthesized answer + a small set of citations.

Reddit over-indexes in layers 1 and 2 because:

- **Structure:** question → competing answers → votes → best-answer-floats. That's pre-ranked training/retrieval data.
- **Specificity:** "best CRM for 3-person landscaping business" beats generic listicles for long-tail buyer prompts.
- **Freshness signals:** active threads update; models treat discussion recency + engagement as relevance proxies.
- **Licensing/API deals:** Reddit's content is legible, licensed, and easily retrievable by major engines (deal terms change — verify quarterly).

Practical takeaway: **you cannot SEO your way around Reddit.** If the top-cited thread for "best [your category]" misstates your pricing from 2023, every engine downstream inherits the error.

## 2. What the numbers actually mean (and don't)

| Claim | Working figure (2026) | How to treat it |
|---|---|---|
| Reddit citation frequency across major engines | ~40% | Directional, volatile. Re-verify quarterly with your own prompt set. Never put it in a deck as a guarantee. |
| Share of Reddit citations pointing to threads vs brand surfaces | ~99% threads | Stable intuition: threads are the unit of representation. Brand pages/profiles barely register. |
| Average age of a cited Reddit post | ~1 year old | The staleness problem. LLMs do not check currency — old threads keep getting cited. |
| Variance across engines | Enormous | Same prompt, different engines → different citations. Always audit per engine. |

**Non-negotiable honesty rules:**

- Never invent citation-share, karma, or traffic numbers for the brand. Measure with Reddit-native stats + your own audit log.
- Never promise "we'll get you cited." You can earn eligibility (good thread, evidence, upvotes, relevance). Citation is the engine's decision.
- Treat AI-citation share as a **volatile signal, not a budget metric.** It can swing on a model update with zero change in your behavior.

## 3. The staleness problem (your biggest lever)

Because the average cited post is ~1 year old:

- Old pricing, retired features, acquired competitors, and fixed bugs live on in cited answers.
- A single stale top comment can define you across engines for quarters.
- LLMs don't check "is this still true" — they check "is this cited, coherent, and corroborated."

**Correction playbook:**

1. Find stale citations via the per-engine audit (see playbook).
2. If the thread is **archived/locked**: you can't reply. Instead, (a) make sure your docs/changelog clearly contradict the stale claim with dates, (b) contribute the updated fact in *currently active* threads on the same prompt, (c) consider a legit AMA or mod-approved update post in the right sub — once, with disclosure, with evidence.
3. If the thread is **open**: post one evidence-led correction as yourself, with disclosure, acknowledging what *was* true and what changed. Never argue with the OP — inform future readers (and retrievers).
4. Never mass-reply the same correction across threads. One thread, one tailored reply. Coordinated identical comments = astroturfing = ban.

## 4. Per-engine audit methodology

Run the **same buyer prompts** through each engine **separately**:

- **ChatGPT** (with browsing enabled; note model + date)
- **Perplexity** (note focus mode + Pro/web setting)
- **Gemini** (note grounding on/off)
- **Google AI Overviews** (note signed-in/out, locale)

For each prompt × engine, log:

- Date, engine, model/settings, prompt verbatim
- Answer summary (2-3 lines)
- Cited URLs (all of them)
- Cited Reddit threads (URL, title, post date, top relevant comment + age + upvotes)
- Accuracy verdict: accurate / stale / wrong / missing-context / absent
- Priority: high (buyer-intent + wrong/stale + visible) → low

Run the full set **monthly**; spot-check top 3 money prompts **weekly** during launches, pricing changes, or incidents. Keep a running log — trends beat snapshots. Template in `playbook-and-examples.md`.

## 5. What "good representation" looks like

Not "Reddit loves us." Instead:

- The top 3 cited threads for money prompts are **factually current** about you.
- At least one cited thread contains a **first-party, disclosed, evidence-backed** explanation (yours, posted by a real human you).
- Threads where a competitor fits better **say so honestly** — including, ideally, by you. Counter-intuitive, but concession builds the credibility that makes your other claims believed (and cited).
- No thread in the top set contains an uncorrected material falsehood (wrong price, wrong feature, wrong security claim).

## 6. What to verify quarterly (calendar it)

- [ ] Is Reddit still the most-cited source class for *your* prompt set? (Run audit; don't trust industry headlines.)
- [ ] Have licensing/retrieval deals changed for any engine? (Check engine + Reddit announcements.)
- [ ] Has any sub in your target list changed self-promo/link/AI-content rules?
- [ ] Are your top-cited threads still accurate? (Staleness re-check.)
- [ ] Is the ~40% figure still defensible? If not, update this file and any place that quotes it.

## 7. Anti-patterns (things that look like strategy, aren't)

- **"Let's seed 20 threads about our launch."** No. One disclosed launch post in the single most-relevant sub (if rules allow), plus genuine replies where asked. Seeding = spam.
- **"Let's get our team to upvote."** Vote manipulation. Bannable for accounts *and* domain shadows.
- **"Let's hire a Redditor to post for us."** Undisclosed paid posting violates FTC + Reddit rules. Disclosed, honest, unpaid-or-clearly-disclosed participation only.
- **"Let's automate monitoring + auto-reply."** Monitoring (reading) is fine. Auto-posting, auto-DMing, and bots that promote are not worth doing and violate most subs' rules.

---

*Next: `the-cred-framework.md` for how to show up, `playbook-and-examples.md` for the weekly workflow.*
