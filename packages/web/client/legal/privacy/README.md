---
title: Privacy Policy
publishDate: "2025-01-07T04:22:18.544Z"
updatedDate: "2025-01-07T04:22:18.544Z"
layout: docs
analyticsProviders:
  - 'Ahrefs'
  - 'Google Search Console'
  - 'Bing Webmaster Tools'
---

This Privacy Policy explains how {{ vars.siteName }} ("{{ vars.siteName }}", "we", "our", or "us") collects, uses, and protects your information when you use our services.
By using {{ vars.siteName }}, you agree to the practices described in this policy.

---

## 1. What We Collect

We collect the following types of information:

### Account Data
- Email address
- Password hash (never your raw password)
- Two-factor authentication secrets (if configured)

### Usage Data
- Login sessions (last access time, IP address, user agent)
- Server logs (retained for up to 7 days for security and debugging)

### User Content
- URLs you bookmark
- Notes, tags, and annotations
- Extracted or archived article, audio, or video content

### Analytics and Tracking
{{#each vars.analyticsProviders}}
- {{this}}
{{/each}}

---

## 2. How We Use Your Data

We use your data to:
- Provide and operate the Breadcrum service
- Authenticate and secure your account
- Improve performance and reliability
- Investigate abuse or violations

We do **not** sell or share your personal data with advertisers.

---

## 3. Where Data Is Stored

Your data is stored and processed using the following providers:
- **{{ vars.providers.hostingProvider }}** (hosting and compute)
- **{{ vars.providers.storageProvider }}** (media and content storage)
- **{{ vars.providers.emailProvider }}** (email delivery)

We take reasonable steps to protect your data from unauthorized access.

---

## 4. Cookies

Breadcrum uses cookies for:
- Authentication (login sessions)
- CSRF protection

We do **not** use tracking cookies or third-party ad cookies.

---

## 5. Your Rights

You have the right to:
- Access the data associated with your account
- Request deletion of your account and associated content
- Withdraw consent to processing (by deleting your account)

To exercise these rights, contact [{{ vars.supportEmail }}](mailto:{{ vars.supportEmail }}).

---

## 6. Data Retention

We retain your:
- Account and content data until you delete your account
- Server logs for up to 7 days
- Authentication logs for a limited time for security auditing

---

## 7. Children's Privacy

Breadcrum is not intended for users under the age of 13.
We do not knowingly collect personal data from children.

---

## 8. Changes to This Policy

We may update this Privacy Policy from time to time.
If changes are material, we will notify you via email or in-app message.
Continued use of Breadcrum after an update means you accept the new terms.

---

## 9. Contact Us

For any privacy-related questions or concerns, contact us at:
**{{ vars.supportEmail }}**
