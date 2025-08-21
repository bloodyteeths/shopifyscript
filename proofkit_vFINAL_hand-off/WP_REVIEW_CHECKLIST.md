# WordPress.org Review Checklist (Proofkit)

- ✅ Plugin uses settings API; sanitization/escaping; nonces on forms
- ✅ Uninstall cleans up options
- ✅ GPL license; i18n ready; readme.txt present
- ✅ WooCommerce hooks: purchase event wired (optional)
- ✅ No remote code execution; explains data flow to backend

**QA before submit:**

- Activate on a test site; configure settings; verify purchase hook and optional forwarding to backend.
- No admin notices or PHP warnings.
