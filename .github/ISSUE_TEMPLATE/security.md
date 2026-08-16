---
name: Security Vulnerability (Private Disclosure)
about: Guidance for reporting security vulnerabilities privately
title: '[SECURITY] '
labels: ['security', 'private-disclosure']
assignees: ''
---

> 🛑 **CRITICAL: DO NOT DISCLOSE SECURITY VULNERABILITIES PUBLICLY**
> 
> If you have discovered an exploitable security vulnerability, authorization bypass, credentials leak, RLS misconfiguration, or data exposure issue in ProBitian, **do NOT submit details in a public GitHub issue**.

### How to Report Security Vulnerabilities Privately

Please follow the official vulnerability reporting process documented in [SECURITY.md](../../SECURITY.md):

1. **Email the Maintainer Privately**:
   - **Contact**: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)
   - **Subject**: `[SECURITY VULNERABILITY] <Brief Component/Topic>`
2. **Include in Your Email**:
   - Description of the vulnerability and its potential impact.
   - Affected components (e.g., Express server, Supabase RLS, passkey authentication, media upload, email dispatch).
   - Step-by-step reproduction steps or private Proof-of-Concept (PoC).
   - Any suggested remediations or mitigations.

### When to Use This Issue Tracker
Only use this public issue template for:
- Non-sensitive security documentation clarifications or typo fixes.
- General questions regarding publicly documented security practices in [SECURITY.md](../../SECURITY.md) or [docs/SECURITY.md](../../docs/SECURITY.md).

Thank you for practicing responsible disclosure and helping keep the ProBitian community and platform secure!
