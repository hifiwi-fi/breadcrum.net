---
title: Security Overview
publishDate: "2025-01-07T04:22:18.544Z"
updatedDate: "2025-01-07T04:22:18.544Z"
layout: docs
---

We take security seriously at {{ vars.siteName }}.
This document outlines how we protect user data and how to responsibly report vulnerabilities.

---

## 1. Hosting and Infrastructure

Breadcrum is hosted on [{{ vars.hostingProvider }}](https://fly.io), a secure cloud platform with per-instance firewalls and isolated app environments.
Our services run in dedicated containers with automatic updates and region-aware deployment.

---

## 2. Data Storage and Encryption

- Content and media are stored on [{{ vars.storageProvider }}](https://www.backblaze.com/b2/), a durable and encrypted storage provider.
- Email delivery is handled through [{{ vars.emailProvider }}](https://aws.amazon.com/ses/).
- Passwords are hashed with a strong, modern hashing algorithm (e.g. bcrypt or Argon2).
- All communications with Breadcrum are encrypted via HTTPS using TLS 1.2 or higher.

---

## 3. Authentication

- Account login supports email/password and modern passkey-based logins.
- Optional two-factor authentication (TOTP) is available for all users.
- All sessions are tracked with IP address and user agent.
- We log session activity to detect anomalies and prevent abuse.

---

## 4. Access Control and Isolation

- Each user account’s data is isolated by design and cannot be accessed by other users.
- Admin access to production data is limited to essential personnel and audited.
- Backups are encrypted and stored in separate, access-controlled environments.

---

## 5. Logging and Monitoring

- We retain server logs for up to 7 days to monitor for abuse and investigate incidents.
- Monitoring tools alert us to availability issues and abnormal usage patterns.

---

## 6. Responsible Disclosure

If you believe you've discovered a security vulnerability in Breadcrum, we encourage responsible disclosure.
Please report it privately to:
**{{ vars.securityEmail }}**

We will respond within 5 business days and keep you informed throughout the remediation process.
We appreciate and acknowledge all security researchers who act in good faith.

---

## 7. Updates

This page may be updated to reflect evolving best practices.
For questions, contact us at:
**{{ vars.securityEmail }}**
