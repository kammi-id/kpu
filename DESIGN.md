# Design: Field Notes Coming Soon

## Purpose and boundary

This page is a temporary, future-facing field note for KPU. Its job is to say
that something is taking shape while demonstrating that the project-local
shadcn/ui setup is real and interactive. It deliberately does **not** define
the product, its audience, a launch date, or a subscription service.

The page uses the approved “Field notes / editorial dispatch” direction: an
editorial announcement and a practical dispatch card, rather than a generic
launch-page hero.

## Visual character

The visual world is crisp, restrained, and editorial:

- paper-white/off-white space carries the page (`#f4f7f5` / background token)
- deep cobalt ink establishes type and rules (`#142243`)
- a brighter cobalt carries navigational and status detail (`#3966c7`)
- signal yellow provides the single high-visibility mark (`#e9bd18`)
- thin horizontal rules, uppercase utility text, and numbered rows make the
  page feel like a field dispatch rather than a marketing campaign

The base text face is Roboto Variable. Merriweather Variable is registered as
the heading token but is not currently applied by the page; the display
headline remains a heavy sans-serif treatment.

## Composition

At wide widths, the page follows a simple editorial sequence within a `76rem`
content measure:

1. A masthead: the `KPU / FIELD NOTES` wordmark on the left, and the outlined
   `STATUS: GATHERING SIGNAL` badge on the right.
2. A two-column hero. The left column is the dispatch copy, proof status, and
   component-check button. The right column is the email card.
3. A ruled component strip. Its explanation sits beside a numbered inventory
   of Button, Badge, Input, and Card.
4. A compact, ruled footer that keeps the future-facing tone and shows the
   current year.

The hero has generous vertical breathing room and a large, tightly tracked
headline capped at roughly eleven characters per line. The result is an
announcement with a clear visual priority: headline first, working form
second, component proof third.

## Components and behavior

The interface intentionally composes project-local shadcn source components:

| Element | Built component | Visible state |
| --- | --- | --- |
| Status and inventory labels | Badge | outlined for neutral status; secondary for component/state labels |
| Component proof action | Button | default before checking; secondary after confirmation |
| Forwarding address form | Card, Input, Button, Badge | email input is required; submit changes its local UI state |
| Icons | Lucide | arrow/check on the proof action; send on the form action |

“Run a component check” confirms the rendered setup in the current browser.
It changes the proof copy and action label to “Components confirmed.” The
email form is a local demonstration only: after a non-empty valid submission,
its badge and action label change to “RECEIVED” and “Address filed.” Nothing
is sent or persisted.

## Layout and responsiveness

The desktop hero uses a larger copy column and a narrower, minimum-`19rem`
form column. The primary action is the email form, positioned alongside the
announcement in the first viewport.

At `700px` and below, the hero and component strip collapse to one column.
The hero loses its viewport-height constraint, its vertical padding becomes
more compact, and the headline scales within `3.4rem` to `5.3rem`. The footer
stacks its two lines. The page retains `1.25rem` side padding and a `320px`
minimum body width.

## Interaction and accessibility details

- The wordmark links back to the hero’s `#top` anchor and has an explicit
  home label.
- The hero and proof strip have labelled section headings.
- The email field has a visible label, email input type, required validation,
  and a descriptive placeholder.
- State messages for the component check and form result are announced through
  polite live regions.
- Buttons remain recognizably interactive with pointer cursors, and focus
  styling comes from the shared shadcn token layer.
- Yellow is an accent rather than the sole carrier of status: text changes and
  labels communicate state as well.

## Guardrails for future edits

Keep the field-note framing, large editorial hierarchy, cobalt rules, and
signal-yellow accent when changing the page. Replace placeholder copy with
product facts only when those facts are supplied. Do not turn the local email
demo into a subscription claim until an actual endpoint and handling policy
exist. Maintain the live component proof—this page is also the visible
verification of the shadcn/Base UI setup.
