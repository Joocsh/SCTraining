---
name: market-report-campaign-builder
description: Writes and builds branded HTML market report emails for a segmented real estate campaign. Use this skill every time the Hyperlocal Market Report Campaigns generates an email for a segment. The skill handles the dual-section (seller + buyer) email format, applies the member's branding and design tokens from the campaign config, calculates insights from MLS data with confidence-calibrated language, and writes paste-ready HTML files that render correctly in Mailchimp, Constant Contact, ActiveCampaign, HubSpot, and SendGrid.
---

# Market Report Campaign Builder

You are building one branded HTML email for one geographic segment. The Hyperlocal Market Report Campaigns (the CLAUDE.md agent) has already pulled contacts, identified the segment, and prepared the segment's MLS data. Your job: take that input and produce a complete, paste-ready HTML email file.

This skill assumes you have access to:

- The segment definition (geography, contact count, lens emphasis)
- The MLS data for the segment (parsed rows in a DataFrame)
- The campaign config (sender, branding, design choices, images)
- The lens emphasis (seller-leaning, buyer-leaning, or balanced)

**All calculations in this skill must be performed in Python via the code execution tool.** Do not estimate, approximate, or reason through real-estate math. Load the segment's MLS data into a DataFrame, perform the calculations, and store the results before moving to the writing phase.

---

## Step 1 — Calculate Market Insights (in Python)

Before you write anything, calculate the numbers — in code. Work through this in order, and skip any metric that doesn't have enough data behind it. Store every calculated value in variables you can reference later when writing.

### Sample size and confidence

Count the rows in scope for this segment.

- **50+ rows** = excellent confidence. Use direct language: "data clearly shows," "consistent pattern indicates"
- **20–49 rows** = good confidence. Use moderate language: "the data indicates," "we're seeing"
- **10–19 rows** = fair confidence. Use measured language: "based on available data," "early signs suggest"
- **3–9 rows** = limited. Use careful language: "early indicators suggest," "based on a small sample"
- **Fewer than 3** = insufficient. Skip the segment or roll it up. Do not generate an email from fewer than 3 properties.

### Pricing analysis

For each property, identify the most relevant price:
- If sold/closed → use sale price
- If active/pending → use current list price
- If expired/withdrawn → use last list price

Calculate (in Python):
- **Median price** (use median, not average — real estate is skewed)
- **Price range** (min, max)
- **Price per sqft** if square footage is available — median, not average
- **Price distribution** if 10+ rows: count of properties in each bracket (under $500K, $500K–$750K, $750K–$1M, $1M–$1.5M, $1.5M–$2M, over $2M — adjust brackets to the segment's actual range)

### Days on market

For sold/closed properties, calculate:
- **Median days on market** (median, not average)
- **Quick-sale percentage**: properties sold in 14 days or fewer, as a percentage of total sold

### Inventory and absorption

- **Active count**: properties currently listed
- **Sold count**: properties closed in the data window
- **Months of inventory**: rough estimate — active count ÷ (sold count ÷ months in data window). If under 3 months, it's a seller's market. 3–6 is balanced. Over 6 favors buyers
- **Pending/under contract count**: properties under contract — a leading indicator

### List-to-sale ratio

For properties that sold, calculate `sale price ÷ list price × 100`. Take the median (not mean) of all ratios.
- **Over 100%** = bidding wars happening — call this out
- **98–100%** = strong market, near list
- **Under 98%** = negotiation room exists, properties trading below list

### Price reductions

For properties with both an original list price and a current/sale price that's lower, count how many had reductions and the average reduction percentage. This is a *very* useful signal — homeowners notice when their neighbor's house has dropped twice.

### What to look for as "wow factor" insights

Scan the calculated numbers for genuinely compelling patterns. Look for:

- A days-on-market figure that's strikingly fast or strikingly slow
- A list-to-sale ratio significantly over or under 100%
- A high percentage of properties with price reductions (signals softening) or a low percentage (signals strength)
- A wide price distribution suggesting the segment has multiple sub-markets
- An imbalance between active and pending (a lot of pending = market is moving fast)
- A median price-per-sqft figure that's notable for the area

The compelling insight goes in the headline and opens the email. The other numbers support it.

---

## Step 2 — Write the Email Content

The email has these sections in this order:

1. Header (branded — title, subtitle, optional logo)
2. Salutation
3. The insight section — your "wow factor" opener
4. Metrics grid (2×2 of the strongest numbers)
5. Seller section — "If you're thinking about selling..."
6. Buyer section — "If you're looking to buy in this area..."
7. Call to action
8. Footer (sender info, optional images, legal disclaimer)

### Lens emphasis weighting

Both seller and buyer sections always appear, but their weight changes based on the campaign's lens emphasis:

- **Seller-leaning**: Seller section first, 60–70 words. Buyer section second, 30–40 words
- **Buyer-leaning**: Buyer section first, 60–70 words. Seller section second, 30–40 words
- **Balanced**: Equal weight, 45–55 words each, in this order: seller first if the segment is mostly homeowners (which it usually is)

### Writing voice

- Second person throughout. "You" and "your," never "homeowners" or "buyers" in third person
- Conversational but knowledgeable. The member is a local expert, not a press release writer
- Specific over vague. "Median list price is $874K and homes are pending in 11 days" beats "the market is strong"
- One genuinely surprising or counterintuitive observation per email, drawn from the actual data
- No filler phrases: "In today's market...", "As we move into Q2...", "Many buyers and sellers..."
- No "actually" — ever. It's a cheap intensifier
- No real estate clichés: "now is a great time," "this is a unique opportunity," "don't miss out"
- Sign off in the sender's voice — natural, not corporate

### Headline format

Avoid: "Brentwood 37027 Market Report" (generic)
Better: "37027 homes are pending in 11 days — here's what's driving it"
Best: a headline that names the most compelling insight from the data, specific to this segment

### Insight section (the opener)

4–6 sentences. Lead with the most striking number from your calculations. Explain what it means. Use bold strategically on the key statistics. Use one line break / italicized phrase if it helps the rhythm.

Example structure:
- Sentence 1: the headline finding, with the number
- Sentence 2: context — what changed or what's driving it
- Sentence 3: a secondary data point that reinforces it
- Sentence 4: what this means in plain language
- Optional sentence 5–6: a counter-observation or nuance that adds depth

### Metrics grid (2×2)

Pick 4 metrics that tell the strongest story together. Order matters — top-left is the most important.

Strong combinations:
- Median list / Median sale / Median DOM / Months of inventory
- Median list / List-to-sale ratio / Pending count / Price reductions
- Median price per sqft / DOM / Active count / Quick-sale percentage

Each metric has a value (large, bold, in a brand color) and a one-line label below (smaller, in body text color).

Never include a metric just to fill space. If you only have 3 strong numbers, use a 3-tile layout instead and rebalance the table.

### Seller section

Frame: "If you're thinking about selling [home type] in [geography]..."

Cover:
- What the data means for them specifically
- A timing observation (favorable, unfavorable, or neutral — be honest)
- A pricing observation (where to expect their home to land)
- A subtle hook that doesn't promise anything

What to avoid:
- Promises of price ("you'll get top dollar")
- Urgency manufactured from nothing ("this won't last")
- Steering language

### Buyer section

Frame: "If you're looking to buy in [geography]..."

Cover:
- What the data means for them specifically
- A competitive observation (how much competition they're up against)
- A pricing observation (what they should budget)
- A timing observation

Same guardrails: no promises, no manufactured urgency, no steering.

### Call to action

One button, centered. Text varies by lens emphasis:
- **Seller-leaning**: "Get Your Home's Value" / "Discuss Your Selling Timeline" / "Request a Market Analysis"
- **Buyer-leaning**: "See Active Listings" / "Schedule a Buyer Consultation" / "Get Notified of New Properties"
- **Balanced**: "Let's Talk About the Market" / "Schedule a Strategy Call"

The button always links via `mailto:` to the sender's email. Never invent URLs or use placeholder links.

Below the button, one line of conversational text: *"Have questions about [geography]? Reply directly to this email or text me at [phone]."*

### Footer

In this order, left-aligned:
- **Sender name** (bold)
- Title / designation (e.g., "REALTOR®, ABR")
- Brokerage name
- Phone
- Email (as a `mailto:` link)
- License number if provided
- Horizontal rule
- Legal disclaimer (gray, smaller font): *"This market report is for informational purposes only. Data sourced from MLS and public records. Not intended to solicit properties currently listed for sale with another broker."* (Or use the member's custom disclaimer from the config if provided.)

If the member has provided footer images (brokerage badge, equal housing logo, etc.), place them above the sender name, sized appropriately.

---

## Step 3 — Build the HTML

Use email-safe HTML. Inline CSS only. Table-based layout for compatibility — divs and flexbox break in Outlook.

### Apply design tokens from the config

The member's `campaign-config.md` specifies these design choices. Translate each into CSS:

**Corner style:**
- `sharp` → `border-radius: 0`
- `soft` → `border-radius: 8px`
- `rounded` → `border-radius: 16px`
- `pill` → `border-radius: 999px` (buttons); `border-radius: 16px` (boxes)

**Button shape:**
- `pill` → `border-radius: 999px; padding: 14px 32px;`
- `rounded` → `border-radius: 8px; padding: 14px 28px;`
- `square` → `border-radius: 0; padding: 14px 28px;`

**Density** controls section padding and line-height. To avoid CSS shorthand ambiguity, every value is spelled out explicitly:

| Density | Vertical padding (top/bottom) | Horizontal padding (left/right) | Line-height | Mobile padding override |
|---|---|---|---|---|
| `compact` | 16px | 24px | 1.5 | 16px |
| `standard` | 24px | 32px | 1.6 | 20px |
| `airy` | 36px | 40px | 1.7 | 24px |

When you write CSS, use the **four-value padding shorthand** — top, right, bottom, left — in that exact order, with every value explicit. Never use a single-value or two-value shorthand inside a section TD. For example, at `standard` density:

- A full-padded section: `padding: 24px 32px 24px 32px;`
- A section that continues content below (no bottom padding): `padding: 24px 32px 0 32px;`
- The metrics grid wrapper: `padding: 8px 32px 8px 32px;`

The same applies for mobile overrides via the `mobile-padding` class (see HTML reference below). Substitute the table values literally — do not leave variable tokens like `{DENSITY_PADDING}` in the output HTML.

**Header treatment:**
- `solid` → `background: [primary color];`
- `gradient` → `background: linear-gradient(135deg, [primary] 0%, [secondary] 100%);`
- `image` → use the header image URL from the config as the background

**Metric box style:**
- `bordered` → `background: #f7f9fc; border: 1px solid #e2e8f0;` plus the corner-style radius
- `borderless` → `background: #f7f9fc;` plus radius, no border
- `inline` → no boxes; metrics stacked as inline stats with dividers between them

**Divider style:**
- `hairline` → `<hr style="border:0; border-top:1px solid #e2e8f0;">`
- `spacing` → no `<hr>`, just `padding: 32px 0`
- `accent` → `<hr style="border:0; border-top:3px solid [accent color]; width:60px; margin:0 auto;">`

### Color application

Always use the exact hex values from the config. Use:
- Primary for headers, buttons, key statistics
- Secondary for accents, gradient endpoints, secondary text
- Neutral light (often `#f9f9f9`) for body background
- Neutral dark (often `#2D323C` or member's spec) for body text

### Font application

Use the member's fonts with web-safe fallbacks. The config will specify both the brand font and the fallback.

Example: `font-family: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;`

If the brand font isn't a Google Font and the member hasn't provided a CDN link, fall back to the closest web-safe match silently — don't insert a font that won't load.

### Image handling

Images in email require public URLs. Take the URLs from the campaign config and place them per the member's specified placement:

- `header` → logo, centered in the header section, max-width 200px, height auto
- `footer` → below the sender info, max-width 180px, height auto (typically brokerage badge or equal housing logo)
- `inline` → if the member specified placement notes, follow them

Always include `alt` text. Always use `style="display:block; max-width:[X]px; height:auto;"` on images for email client compatibility.

If no images were configured, skip every image slot. Don't insert placeholder images.

### What never goes in the HTML

- `<form>` elements
- JavaScript
- External CSS stylesheets
- Web fonts via `@import` (use inline `<link>` only if pulling from a known CDN like Google Fonts)
- `position: absolute` or `position: fixed`
- `flexbox` or `grid` layouts (Outlook strips them)
- Tracking pixels (the member's ESP adds those)
- Unsubscribe links (the member's ESP adds those)
- Made-up URLs or placeholder links

---

## Step 4 — Write the HTML File

Once you've calculated insights, drafted the email content, and built the HTML, **write the file to disk using the `create_file` tool**. The path should be `campaigns/[YYYY-MM-DD]-[campaign-slug]/segments/[segment-slug].html` relative to the task folder root.

Filename rules for `[segment-slug]`:
- Lowercase
- Hyphens not spaces
- Include the geography identifier (e.g., `brentwood-37027`, `franklin-37064`, `nolensville-37135`)

Before writing, do a final pass against this checklist:

- [ ] Every statistic in the email comes from the calculated insights — nothing is invented
- [ ] All numbers were computed in Python, not estimated
- [ ] No agent names, brokerage rankings, or comparative claims
- [ ] No steering language, no protected-class references
- [ ] Both seller and buyer sections are present (weighted per lens emphasis)
- [ ] All design tokens from the config are applied
- [ ] All images have working URLs (or are omitted)
- [ ] The CTA links via `mailto:` to the sender's email
- [ ] The footer has the legal disclaimer (member's custom version, or the standard)
- [ ] The email is under 500 words of body content
- [ ] Headline names the most compelling insight, not a generic title

Then call `create_file` to write the HTML to disk. **Do not output the HTML in chat** — write it to the file. After writing, confirm briefly: *"Wrote `brentwood-37027.html`."*

---

## Reference HTML Structure

Use this as your structural anchor. The structure below is tested for compatibility across Gmail, Apple Mail, Outlook (including legacy Outlook on Windows), Yahoo, and mobile mail clients. Substitute design tokens, colors, fonts, and content based on the campaign config and segment data. **Do not deviate from this structure** — quirks of email rendering punish anything fancier.

**Substitution rules:**
- Replace every `{TOKEN}` placeholder with a real value. Do not leave any placeholders in the final HTML.
- Padding values must always be four explicit values (top, right, bottom, left). Never write `padding: 24px` or `padding: 24px 32px` inside a section TD — always all four numbers.
- Use the density table above to determine padding numbers. The example below uses `standard` (24/32/24/32) values inline for clarity.
- Every padded TD must have `class="mobile-padding"` so the mobile media query can shrink it on phones.
- Every `<a>` link must have `target="_blank" rel="noopener"`.
- Every `<img>` must have `alt` and `style="display:block; max-width:[X]px; height:auto; border:0; outline:none; text-decoration:none;"`.
- Use Unicode quotation marks (`"` and `"`) in body copy, not straight quotes.

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{HEADLINE}</title>
<style type="text/css">
@media only screen and (max-width: 600px) {
    table[class="main"] { width: 100% !important; }
    td[class="mobile-padding"] { padding: 20px !important; }
    td[class="metric-cell"] { display: block !important; width: 100% !important; }
    h1[class="mobile-h1"] { font-size: 22px !important; }
    h3[class="mobile-h3"] { font-size: 16px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:{NEUTRAL_LIGHT}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; width:100%;">

<!-- Outer wrapper -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:{NEUTRAL_LIGHT}; min-width:100%;">
<tr>
<td align="center" style="padding:20px 15px;">

<!-- Main container, 600px max-width -->
<table border="0" cellpadding="0" cellspacing="0" width="600" class="main" style="max-width:600px; width:100%; background-color:#ffffff;">

  <!-- HEADER -->
  <tr>
    <td align="center" class="mobile-padding" style="{HEADER_TREATMENT_CSS} padding:32px 32px 32px 32px; color:#ffffff; font-family:{HEADING_FONT};">
      {OPTIONAL_HEADER_LOGO_IMG}
      <h1 class="mobile-h1" style="margin:0; font-family:{HEADING_FONT}; font-size:26px; font-weight:bold; color:#ffffff; line-height:1.3;">
        {HEADLINE}
      </h1>
      <p style="margin:10px 0 0 0; font-size:14px; color:#ffffff; opacity:0.9; line-height:1.4;">
        {DATA_TIMEFRAME} · Prepared by {SENDER_NAME}
      </p>
    </td>
  </tr>

  <!-- SALUTATION -->
  <tr>
    <td class="mobile-padding" style="padding:24px 32px 0 32px; font-family:{BODY_FONT}; font-size:16px; color:{NEUTRAL_DARK}; line-height:1.6;">
      Hi {{FNAME}},
    </td>
  </tr>

  <!-- INSIGHT SECTION (the opener) -->
  <tr>
    <td class="mobile-padding" style="padding:16px 32px 8px 32px; font-family:{BODY_FONT}; font-size:16px; color:{NEUTRAL_DARK}; line-height:1.6;">
      <p style="margin:0 0 16px 0;">{INSIGHT_SENTENCE_1_WITH_BOLD_NUMBER}</p>
      <p style="margin:0 0 16px 0;">{INSIGHT_SENTENCES_2_THROUGH_4_OR_6}</p>
    </td>
  </tr>

  <!-- METRICS GRID 2x2 -->
  <tr>
    <td class="mobile-padding" style="padding:8px 32px 16px 32px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td class="metric-cell" width="50%" valign="top" style="padding:8px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f9fc; {METRIC_BOX_BORDER} {CORNER_STYLE_RADIUS}">
              <tr>
                <td align="center" style="padding:20px;">
                  <div style="font-family:{HEADING_FONT}; font-size:28px; font-weight:bold; color:{PRIMARY_COLOR}; line-height:1.1;">{METRIC_1_VALUE}</div>
                  <div style="margin-top:6px; font-family:{BODY_FONT}; font-size:13px; color:{NEUTRAL_DARK}; line-height:1.3;">{METRIC_1_LABEL}</div>
                </td>
              </tr>
            </table>
          </td>
          <td class="metric-cell" width="50%" valign="top" style="padding:8px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f9fc; {METRIC_BOX_BORDER} {CORNER_STYLE_RADIUS}">
              <tr>
                <td align="center" style="padding:20px;">
                  <div style="font-family:{HEADING_FONT}; font-size:28px; font-weight:bold; color:{PRIMARY_COLOR}; line-height:1.1;">{METRIC_2_VALUE}</div>
                  <div style="margin-top:6px; font-family:{BODY_FONT}; font-size:13px; color:{NEUTRAL_DARK}; line-height:1.3;">{METRIC_2_LABEL}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="metric-cell" width="50%" valign="top" style="padding:8px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f9fc; {METRIC_BOX_BORDER} {CORNER_STYLE_RADIUS}">
              <tr>
                <td align="center" style="padding:20px;">
                  <div style="font-family:{HEADING_FONT}; font-size:28px; font-weight:bold; color:{PRIMARY_COLOR}; line-height:1.1;">{METRIC_3_VALUE}</div>
                  <div style="margin-top:6px; font-family:{BODY_FONT}; font-size:13px; color:{NEUTRAL_DARK}; line-height:1.3;">{METRIC_3_LABEL}</div>
                </td>
              </tr>
            </table>
          </td>
          <td class="metric-cell" width="50%" valign="top" style="padding:8px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f9fc; {METRIC_BOX_BORDER} {CORNER_STYLE_RADIUS}">
              <tr>
                <td align="center" style="padding:20px;">
                  <div style="font-family:{HEADING_FONT}; font-size:28px; font-weight:bold; color:{PRIMARY_COLOR}; line-height:1.1;">{METRIC_4_VALUE}</div>
                  <div style="margin-top:6px; font-family:{BODY_FONT}; font-size:13px; color:{NEUTRAL_DARK}; line-height:1.3;">{METRIC_4_LABEL}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SELLER SECTION -->
  <tr>
    <td class="mobile-padding" style="padding:16px 32px 0 32px; font-family:{BODY_FONT}; font-size:16px; color:{NEUTRAL_DARK}; line-height:1.6;">
      <h3 class="mobile-h3" style="margin:0 0 12px 0; font-family:{HEADING_FONT}; font-size:18px; color:{PRIMARY_COLOR};">If you're thinking about selling</h3>
      <p style="margin:0 0 16px 0;">{SELLER_SECTION_CONTENT}</p>
    </td>
  </tr>

  <!-- BUYER SECTION -->
  <tr>
    <td class="mobile-padding" style="padding:16px 32px 0 32px; font-family:{BODY_FONT}; font-size:16px; color:{NEUTRAL_DARK}; line-height:1.6;">
      <h3 class="mobile-h3" style="margin:0 0 12px 0; font-family:{HEADING_FONT}; font-size:18px; color:{PRIMARY_COLOR};">If you're looking to buy in {GEOGRAPHY}</h3>
      <p style="margin:0 0 16px 0;">{BUYER_SECTION_CONTENT}</p>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td class="mobile-padding" align="center" style="padding:24px 32px 8px 32px;">
      <table border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:{PRIMARY_COLOR}; {BUTTON_SHAPE_CSS}">
            <a href="mailto:{SENDER_EMAIL}" target="_blank" rel="noopener" style="display:inline-block; color:#ffffff; text-decoration:none; padding:14px 28px; font-family:{HEADING_FONT}; font-size:15px; font-weight:bold;">{CTA_TEXT}</a>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0 0; font-family:{BODY_FONT}; font-size:14px; color:{NEUTRAL_DARK}; line-height:1.5;">
        Have questions about {GEOGRAPHY}? Reply directly or text me at {SENDER_PHONE}.
      </p>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td class="mobile-padding" style="padding:24px 32px 24px 32px; font-family:{BODY_FONT}; font-size:14px; color:{NEUTRAL_DARK}; line-height:1.5; text-align:left;">
      {OPTIONAL_FOOTER_LOGO_IMG}
      <hr style="border:0; border-top:1px solid #e2e8f0; margin:0 0 16px 0;" />
      <div style="font-weight:bold;">{SENDER_NAME}</div>
      <div>{SENDER_TITLE}</div>
      <div>{SENDER_BROKERAGE}</div>
      <div>{SENDER_PHONE}</div>
      <div><a href="mailto:{SENDER_EMAIL}" target="_blank" rel="noopener" style="color:{NEUTRAL_DARK}; text-decoration:none;">{SENDER_EMAIL}</a></div>
      {OPTIONAL_LICENSE_NUMBER_DIV}
      <p style="margin:16px 0 0 0; font-size:12px; color:#888888; line-height:1.5;">
        {LEGAL_DISCLAIMER}
      </p>
    </td>
  </tr>

</table>

</td>
</tr>
</table>

</body>
</html>
```

**What's load-bearing in this structure (don't skip):**

- **XHTML 1.0 Transitional DOCTYPE**: older Outlook versions need this to render reliably
- **`-webkit-text-size-adjust:100%; -ms-text-size-adjust:100%`** on the body: prevents iOS/Windows Mail from auto-resizing your typography
- **`border="0" cellpadding="0" cellspacing="0"` on every `<table>`**: Outlook compatibility baseline
- **`class="mobile-padding"` on every padded content TD**: lets the mobile media query shrink padding to 20px on phones
- **`class="metric-cell"` on every metric tile**: lets the mobile query stack the 2×2 grid vertically
- **Tables instead of `<div>` for metric boxes**: Outlook for Windows ignores div borders/backgrounds in many cases; tables render correctly
- **`target="_blank" rel="noopener"` on every link**: security + UX baseline
- **Self-closing tags on `<hr />`, `<img />`, `<meta />`, `<br />`**: required by XHTML doctype

**Final checks before writing the file:**

- [ ] Every `{TOKEN}` placeholder has been replaced with a real value — no curly braces remain anywhere in the output
- [ ] All padding values are four explicit numbers (top, right, bottom, left)
- [ ] Body copy is wrapped in `<p>` tags with `margin: 0 0 16px 0;` for consistent vertical rhythm
- [ ] Every TD that holds prose has both `class="mobile-padding"` and full four-value padding
- [ ] No flexbox, no grid, no `position: absolute`, no JavaScript
- [ ] No empty `style=""` attributes left over from token substitution
