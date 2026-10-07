# AGENTS.md

## 1. PROJECT STANDARD

This is a real client-facing, production-grade ecommerce and custom 3D printing application.

This is NOT a demo, prototype, tutorial project, or throwaway MVP.

Every implementation must prioritize:

- Reliability
- Performance
- Security
- Scalability
- Maintainability
- Correct business logic
- Good user experience
- Production-safe error handling
- Minimal unnecessary complexity

The application must be able to handle real customers browsing products,
adding products to cart, completing checkout, making payments, and viewing
their orders.

Do not take shortcuts that are acceptable only in demo projects.

---

# 2. EXISTING ARCHITECTURE

The project uses:

- Next.js App Router
- TypeScript
- MongoDB
- Mongoose
- Better Auth
- Axios
- TanStack Query
- Cloudinary
- Resend
- Paytm payment integration planned
- Customer storefront
- Admin dashboard
- Product and ProductVariant system
- Category and Subcategory system
- Custom 3D printing/service request functionality

Respect the existing architecture.

Do NOT introduce a new architecture unless there is a strong technical reason.

Do NOT rewrite working systems simply because another approach is preferred.

---

# 3. GOLDEN DEVELOPMENT RULE

For every feature:

Understand → Inspect → Plan → Implement → Validate → Review → Complete

Never blindly modify code.

Before implementing a non-trivial feature:

1. Inspect the relevant existing files.
2. Identify existing APIs, hooks, components and utilities.
3. Reuse existing functionality.
4. Make the smallest safe change required.
5. Validate the implementation.
6. Review for regressions and unnecessary changes.

Do not automatically start the next feature after completing the current one.

---

# 4. ONE FEATURE AT A TIME

Work only on the requested feature.

Do NOT:

- redesign unrelated pages
- rewrite unrelated APIs
- refactor the entire project
- rename unrelated files
- change authentication unnecessarily
- modify database models unnecessarily
- introduce unrelated dependencies
- change working business logic without reason

If another issue is discovered, report it unless it directly blocks the current feature.

---

# 5. PRODUCTION PERFORMANCE

Performance is a first-class requirement.

The application should feel fast and responsive for real users.

Avoid:

- unnecessary API requests
- duplicate API requests
- repeated database queries
- unnecessary Promise.all calls
- unnecessary useEffect-based fetching
- fetching data that is not required
- fetching large datasets when pagination is possible
- fetching all products/categories just to filter client-side
- unnecessary client-side computation
- unnecessary re-renders
- unnecessary global state
- unnecessarily large client components
- loading the same data repeatedly without caching

Prefer:

- server-side filtering
- server-side pagination
- server-side sorting
- TanStack Query caching
- stable query keys
- sensible staleTime
- request cancellation where supported
- debounced search
- dependent queries with `enabled`
- targeted cache invalidation
- lazy loading where appropriate
- Next.js server/client boundaries used intentionally

Before adding a new API request, ask:

"Is this data already available somewhere in the current application?"

If yes, reuse the existing source.

---

# 6. API REQUEST RULES

Every API call must have a clear purpose.

Do not create duplicate APIs for functionality that already exists.

Use the existing Axios client.

Use existing API hooks where available.

For TanStack Query:

- Use stable query keys.
- Use appropriate staleTime.
- Use `enabled` for dependent queries.
- Pass AbortSignal when supported.
- Avoid duplicate queries caused by unstable query keys.
- Invalidate only the affected cache after mutations.
- Do not globally invalidate unrelated data.

For search:

- Debounce user input.
- Do not send one request per keystroke.

For pagination:

- Fetch only the required page.
- Never load the entire product catalog unnecessarily.

---

# 7. DATABASE / MONGOOSE

MongoDB is the production data source.

Database operations must be efficient and safe.

Prefer:

- proper indexes
- targeted queries
- `.select()` when appropriate
- `.lean()` for read-only queries where appropriate
- pagination
- server-side filtering
- atomic updates where appropriate

Avoid:

- loading entire collections unnecessarily
- N+1 queries
- querying the database repeatedly inside loops
- unnecessary document hydration
- unbounded queries
- unnecessary population of large datasets

Before adding a query, consider:

- Does it need an index?
- Can the query be narrowed?
- Can existing data be reused?
- Does pagination apply?
- Could this create an N+1 problem?

Never expose sensitive database fields to customers.

---

# 8. SECURITY

Security is mandatory.

Never trust the client for:

- price
- stock
- discount
- membership discount
- payment amount
- order totals
- authorization
- admin permissions

The backend is authoritative.

Never rely on client-side validation for security.

Always validate important input on the server.

Admin APIs must verify admin authorization.

Customer APIs must verify the appropriate authentication/authorization.

Never expose:

- passwords
- authentication secrets
- private tokens
- payment secrets
- internal credentials
- sensitive customer information

Do not expose unnecessary database fields through public APIs.

Never trust IDs, prices, quantities, or other business-critical values supplied by the browser.

---

# 9. AUTHENTICATION & RBAC

Better Auth is the existing authentication system.

Do not replace it.

Do not create a second authentication system.

Do not bypass existing authorization helpers.

Admin-only functionality must remain protected server-side.

Never treat:

- hidden buttons
- frontend routes
- client-side checks

as sufficient authorization.

Authorization must ultimately be enforced on the server.

---

# 10. ECOMMERCE BUSINESS LOGIC

For ecommerce functionality:

Backend must be authoritative for:

- product availability
- stock
- variant stock
- product price
- variant price
- discounts
- membership discounts
- cart totals
- order totals
- payment amount

Never trust a price coming from the browser.

Never allow a customer to modify an order price through client-side state.

Always revalidate important product/stock information before final order creation/payment.

---

# 11. PRODUCT SYSTEM

The existing Product system supports:

- Products
- Product variants
- Categories
- Subcategories
- Product images
- Specifications
- Variation definitions
- Stock
- Featured products
- SEO fields
- Customer/public product serialization

Reuse the existing Product APIs.

Do not create a second Product system.

Customer-facing APIs must respect public product visibility/status rules.

Admin APIs may expose additional administrative information only when authorized.

---

# 12. CUSTOMER EXPERIENCE

The customer should be able to use the application naturally:

Browse products
→ Search/filter
→ View product
→ Customize where supported
→ Add to cart
→ Manage cart
→ Checkout
→ Select address
→ Pay
→ Receive order confirmation
→ View order

Each step must have:

- loading state
- error state
- empty state where applicable
- useful feedback
- responsive behavior
- safe failure handling

Never leave the user with a silent failure.

---

# 13. UI / UX

The application is a real ecommerce product.

UI should be:

- clean
- responsive
- accessible
- consistent
- fast
- mobile-friendly
- production-quality

Do not introduce visual redesigns unless requested.

Reuse existing design patterns.

Avoid excessive animations.

Do not sacrifice performance for visual effects.

Images should use appropriate Next.js image handling where applicable.

Interactive controls should have proper disabled/loading states.

---

# 14. ERROR HANDLING

Errors must be handled intentionally.

Never silently swallow important errors.

Never expose internal stack traces or sensitive implementation details to customers.

Use meaningful user-facing messages.

Log useful server-side information when appropriate.

Differentiate between:

- validation errors
- authentication errors
- authorization errors
- not found
- conflicts
- external service failures
- database failures
- unexpected errors

Do not use generic `try/catch` blocks that hide the actual problem.

---

# 15. EXTERNAL SERVICES

The application may use:

- Cloudinary
- Resend
- Paytm
- other external services

External API failures must be handled safely.

Do not assume an external service always succeeds.

Do not expose service credentials to the client.

Payment-related operations require especially careful validation and server-side verification.

---

# 16. CLOUDINARY / IMAGES

Do not unnecessarily re-upload existing images.

When replacing/removing images:

- update database state safely
- clean up old Cloudinary assets when appropriate
- avoid deleting an image before the database operation succeeds when that could leave broken references

Do not expose Cloudinary secrets to the browser.

---

# 17. TYPESCRIPT

Use TypeScript properly.

Avoid:

- unnecessary `any`
- unsafe type assertions
- disabling TypeScript errors without a real reason
- duplicate types representing the same data

Prefer existing shared types.

If a type needs to change, inspect all consumers before changing it.

---

# 18. STATE MANAGEMENT

Do not introduce Redux, Zustand, or another global state library unless there is a clear architectural requirement.

Use:

- React local state for local UI state
- TanStack Query for server state
- URL search parameters for shareable/filterable page state where appropriate

Do not duplicate server state into unnecessary React state.

---

# 19. COMPONENT ARCHITECTURE

Prefer small, focused components.

Avoid giant components containing:

- API logic
- business logic
- form logic
- rendering
- unrelated state

Reuse existing components before creating new ones.

Do not create abstractions merely for the sake of abstraction.

Abstraction should solve a real repeated problem.

---

# 20. MOBILE / RESPONSIVE

The application must work properly on:

- mobile
- tablet
- desktop

Do not assume desktop-only usage.

Customer shopping flows are especially important on mobile.

Do not introduce horizontal overflow.

Interactive elements must remain usable on small screens.

---

# 21. SEO

Customer-facing product pages and important storefront pages should be SEO-conscious.

Use:

- meaningful titles
- descriptions
- product metadata where appropriate
- semantic HTML
- clean URLs
- existing product SEO fields

Do not implement unnecessary SEO complexity unless required.

---

# 22. ACCESSIBILITY

Use semantic HTML.

Interactive elements must be keyboard accessible.

Images should have meaningful alt text where appropriate.

Forms should have labels.

Loading/error states should be understandable to assistive technologies where applicable.

Do not use clickable `div`s when a button/link is appropriate.

---

# 23. TESTING / VALIDATION

After implementing a feature:

1. Run TypeScript/typecheck.
2. Run lint.
3. Run build when practical.
4. Test the affected user flow manually.
5. Check loading/error/empty states.
6. Check mobile behavior.
7. Check browser console for new errors.
8. Review network requests for unnecessary API calls.
9. Review the final diff.

Do not declare a feature complete merely because TypeScript passes.

---

# 24. PERFORMANCE VALIDATION

For data-heavy features, specifically check:

- number of API requests
- duplicate requests
- request timing
- payload size where relevant
- unnecessary refetches
- cache behavior
- pagination behavior
- database query behavior where relevant

If a feature causes unnecessary network/database work, fix it before considering the feature complete.

---

# 25. PRODUCTION SAFETY

Never make a change simply because it is "cleaner" if it risks breaking existing functionality.

Before modifying an existing system:

- understand current behavior
- identify consumers
- preserve backward compatibility where practical
- make the smallest safe change

Do not perform large refactors during feature implementation unless explicitly requested.

---

# 26. DEPENDENCIES

Do not install a new package unless it is genuinely required.

Before installing a dependency:

1. Check whether the project already has an equivalent solution.
2. Check whether the functionality can be implemented safely with existing tools.
3. Consider bundle size and maintenance cost.

Avoid dependency bloat.

---

# 27. GIT / CHANGE CONTROL

Keep changes focused.

Before large changes, create a Git checkpoint when appropriate.

Do not modify unrelated files.

At the end of a feature, report:

- files changed
- functionality implemented
- tests/validation performed
- issues found
- remaining risks

Do not hide failed checks.

---

# 28. DEBUGGING RULE

When something fails:

DO NOT immediately rewrite the code.

First:

1. Reproduce the issue.
2. Inspect the relevant implementation.
3. Identify the root cause.
4. Explain the root cause.
5. Apply the smallest safe fix.
6. Re-run validation.

Do not guess.

Do not "fix" symptoms while leaving the root cause unresolved.

---

# 29. PERFORMANCE VS COMPLEXITY

Do not over-engineer.

Production-grade does NOT mean:

- microservices
- unnecessary abstractions
- excessive caching
- complicated state management
- excessive dependencies
- premature optimization

Prefer:

Simple + Correct + Fast + Maintainable

over:

Complex + Clever + Hard to maintain

---

# 30. AI AGENT BEHAVIOR

You are working inside an existing production application.

Before changing code, inspect the relevant implementation.

Do not assume files, APIs, models, or hooks exist.

Do not invent architecture when existing architecture already supports the requirement.

Do not duplicate functionality.

Do not rewrite working systems without justification.

Do not modify unrelated features.

Do not start the next feature automatically.

When uncertain about an important architectural or business decision, stop and explain the uncertainty instead of guessing.

---

# 31. FEATURE COMPLETION STANDARD

A feature is complete only when:

- implementation is finished
- existing architecture is preserved
- required loading states exist
- required error states exist
- required empty states exist
- responsive behavior works
- security rules are preserved
- unnecessary API calls are avoided
- TypeScript passes
- lint passes
- build passes when practical
- affected user flow has been manually tested
- no unrelated changes were introduced

Only then consider the feature complete.